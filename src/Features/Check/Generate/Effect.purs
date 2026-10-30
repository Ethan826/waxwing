-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.5, E20 and E21: handlers and `with` (E17 is Generate.Perform,
-- E22 and E23 are Generate.Failure). Each marker's condition is syntactic
-- (§3.5): decided from the node and the tables, never a solved type.
-- Children: `Handler/clauses/k/body`, `With/handler`, `With/body`.
-- Checked nodes as today's (Handler.purs, ClauseBody.purs; D1 spec §3.5,
-- R0 Task 7.1b): a clause's parameter types are read at
-- `ClauseParamType p c k` (spec §12.2; the clauses are in
-- Generate.HandlerClause). A handler literal's marked type keeps its
-- label with the mark at `Literal p`, its R `⟨p, handler inference⟩` and
-- its C `⟨p, handler clauses⟩` (statements §2, "Copies through
-- equations"); `with`'s is its `⟨p, res⟩` (amin tranche 1, Task 4).
module Features.Check.Generate.Effect
  ( handler
  , marker
  , with
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..))
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  , SiteRole(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, HandlerClause, Ty, VarId)
import Domain.Row (EffectRef, Label(..), closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Ambient (enter, framed)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Ref)
import Features.Check.Generate.Fresh (childOf, instances, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenEntry(..)
  , Tagged
  , effected
  , emit
  , lifted
  , slots
  )
import Features.Check.Generate.HandlerClause (effectId, handlerClause)
import Features.Check.Generate.Lookup (effectSorts)
import Features.Check.Generate.Minted (Part(..), mintedAt)
import Features.Check.Generate.Node
  ( Ruled
  , fixed
  , flex
  , markedFlex
  , markedRef
  , markersAt
  , tagged
  )
import Features.Check.Generate.Obligation (equalAt)

-- E20: `app (Handler e) [⟨p, inst j⟩ …]`, `Outside HandlerType` (O3),
-- clause bodies with parameters at θ of their declared types; markers of
-- those types follow (origin inst). The checked node holds the written
-- label's arguments (Check/ClauseBody.purs `labelArgs`), which the
-- witness binds `⟨p, inst j⟩` to.
handler
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Label (Ty VarId)
  → Array HandlerClause
  → Gen s (Ruled s)
handler recur context path span label@(Label effect _ mark) clauses = do
  sorts ← lifted (effectSorts context.tables effect)
  inst ← instances path (ExprRule 20) span sorts
  found ← sequence (Array.mapWithIndex (clauseOf inst.naming) clauses)
  read ← slots path inst.slots
  let markedType = literalType path effect inst.all
  effected
    ( mintedAt path (literalVars path)
        (map PartTy ([ markedType ] <> Array.concatMap _.marked found))
    )
  pure
    { ty: Type.THandler (Label effect (map snd inst.slots) mark)
        { inference: closedRow, clauses: Nothing }
    , marked: markedType
    , node: fixed
        ( Checked.Handler (effectId effect) <$> read
            <*> traverse _.clause found
        )
    , emits: do
        emit (at context path (ExprRule 20))
          ( marker true HandlerType 3 span
              <> markersAt InstOrigin span (Array.concatMap _.marks found)
          )
        traverse_ _.emits found
    }
  where
  snd (Tuple _ ty) = ty
  clauseOf naming place = handlerClause recur context
    { handler: path, clause: place, label }
    naming

-- E21: `⟨p, res⟩`, `Outside HandlerType`; no equation through the
-- handler. The body runs in `f L + ρ` (E11, Task 8; Install.purs), `L`
-- the handler's label under the frame mark `Frame p`.
with
  ∷ ∀ s. Recur s → Context s → Path → Span → Expr → Expr → Gen s (Ruled s)
with recur context path span installed body = do
  handlerPart ← recur context (childOf path "With" "handler") installed
  inside ← enter bodyPath (framed path handlerPart.marked context.ambient)
    context
  bodyPart ← recur inside bodyPath body
  res ← nodeRes path (ExprRule 21) span
  pure
    { ty: flex res
    , marked: markedFlex res
    , node: fixed (Checked.With <$> handlerPart.expr <*> bodyPart.expr)
    , emits: do
        emit (at context path (ExprRule 21)) (marker true HandlerType 3 span)
        equalAt (at context path (ExprRule 21)) WithNode span (markedFlex res)
          bodyPart.marked
        handlerPart.emits
        bodyPart.emits
    }
  where
  bodyPath = childOf path "With" "body"

-- An explicit marker of this rule (origin body), when its condition
-- holds.
marker ∷ ∀ s. Boolean → OutsideKind → Int → Span → Array (Tagged s)
marker holds kind row span =
  if holds then [ tagged (EmitOutside kind) RowO row Body span ] else []

-- A handler literal's marked type, R and C its own variables.
literalType ∷ ∀ s. Path → EffectRef → Array (Ref s) → MTy
literalType path effect arguments = MHandler
  { effect, args: map markedRef arguments, mark: At (Literal path) }
  { inference: tailOnly inference, clauses: Just (tailOnly clauses) }
  where
  inference = EffFresh path HandlerInference
  clauses = EffFresh path HandlerClauses

literalVars ∷ Path → Array EVar
literalVars path =
  [ EffFresh path HandlerInference, EffFresh path HandlerClauses ]

tailOnly ∷ EVar → MRow
tailOnly variable = { labels: [], tail: Just variable }
