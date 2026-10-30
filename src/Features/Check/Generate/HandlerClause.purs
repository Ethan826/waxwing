-- trusted surface: every diff needs token review; see docs/engineering.md
-- E20's clauses (T-R0b §3.5; split from Generate.Effect, amin tranche 1
-- Task 3, for the line budget): a clause's body under its parameters,
-- each at θ of its declared type, read at `ClauseParamType p c k` (spec
-- §12.2), with its marked type at the handler's use (Generate.Marked
-- `AtUse p`); and a clause's id for the checked node. A clause body runs
-- in the clause's own row `⟨p, clauses k⟩` (E11, Task 8).
module Features.Check.Generate.HandlerClause
  ( Clause
  , effectId
  , handlerClause
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (fromMaybe, maybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId(..))
import Domain.Recorded.Atom (CheckedName(..))
import Domain.Recorded.Effect (ERole(..), MTy, SiteRole(..))
import Domain.Recorded.Origin (Path, RuleId(..), Step(..))
import Domain.Resolved (HandlerClause, Ty, VarId(..))
import Domain.Row (EffectRef(..), Label(..), closedRow)
import Domain.Type (Ty(..)) as Type
import Domain.Type (substitute)
import Features.Check.Generate.Ambient (enter, ownRow)
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Elab (Elab)
import Features.Check.Generate.Fresh (child, childAt)
import Features.Check.Generate.Gen (Gen, lifted, positioned)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Obligation (equalAt)
import Features.Check.Generate.Out (TypeMarker)
import Features.Check.Generate.Translate (Naming, translate)

-- A clause's id for the checked node, as Check/Handler.purs `effectId`.
effectId ∷ EffectRef → EffectId
effectId = case _ of
  UserEffect id → id
  ConsoleEffect → EffectId (-1)
  FailEffect → EffectId (-1)

-- `marked`: the parameters' marked types, whose variables and positions
-- the handler literal mints (they carry its path).
type Clause s =
  { clause ∷ Elab s Checked.HandlerClause
  , marks ∷ Array TypeMarker
  , marked ∷ Array MTy
  , emits ∷ Gen s Unit
  }

handlerClause
  ∷ ∀ s
  . Recur s
  → Context s
  → { handler ∷ Path, clause ∷ Int, label ∷ Label (Ty VarId) }
  → Naming s
  → HandlerClause
  → Gen s (Clause s)
handlerClause recur context site naming clause = do
  typed ← traverse typedParameter clause.parameters
  read ← traverse sited (Array.mapWithIndex Tuple typed)
  inside ← enter bodyPath (ownRow (Clauses site.clause) site.handler)
    (Array.foldl bindParameter context typed)
  body ← recur inside bodyPath clause.body
  result ← lifted (declaredResult context.tables site.label clause.result)
  pure
    { clause:
        { operation: clause.operation
        , parameters: _
        , body: _
        , span: clause.span
        }
          <$> sequence read
          <*> body.expr
    , marks: Array.concatMap _.marks typed
    , marked: map _.marked typed
    , emits: do
        equalAt (at context path (ExprRule 20)) ClauseBody clause.span
          body.marked
          result
        body.emits
    }
  where
  path = childAt site.handler "Handler" "clauses" site.clause
  bodyPath = child path [ Named "body" ]
  typedParameter parameter = withLocal parameter.local
    <$> lifted (translate context.tables naming parameter.ty)
    <*> lifted (marked context.tables (AtUse site.handler) parameter.ty)
  withLocal local found markedType =
    { local, ty: found.ty, marked: markedType, marks: found.marks }
  sited (Tuple index parameter) = map ({ local: parameter.local, ty: _ })
    <$> positioned (ClauseParamType site.handler site.clause index) parameter.ty
  bindParameter current parameter = maybe current (bindAt current parameter)
    parameter.local
  bindAt current parameter local = bindLocal local
    { ty: parameter.ty, marked: parameter.marked }
    current

-- O1's right side (ClauseBody.purs `instantiateType`): the operation's
-- declared result with the handled label's arguments in place of the
-- effect's parameters and every row variable replaced by the closed row;
-- a written marked type (marks as written, a handler type in it owning no
-- C).
declaredResult
  ∷ Tables → Label (Ty VarId) → Ty VarId → Either GenerationFault MTy
declaredResult tables (Label _ arguments _) result =
  if withFallback (-1) == withFallback (-2) then
    marked tables Declared (withFallback (-1))
  else Left (VariableSort (VarId (Array.length arguments)))
  where
  -- A variable beyond the label's arguments takes the fallback: two
  -- different fallbacks give different types exactly when one was used.
  withFallback spare = substitute
    { types: argument spare, rows: const closedRow }
    result
  argument spare (VarId index) = fromMaybe (Type.TVar (VarId spare))
    (Array.index arguments index)
