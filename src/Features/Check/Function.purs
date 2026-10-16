module Features.Check.Function (environment, recheck) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (rigid, Open(..))
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Domain.Type (Ty(..), TyRow, VarId(..))
import Features.Check.Comparable (comparable)
import Features.Check.Defer (judgeDeferrals)
import Features.Check.Entry as Entry
import Features.Check.Frames (markConstraints)
import Features.Check.Functional (Functional)
import Features.Check.Infer (Env, infer)
import Features.Check.Mark (violation)
import Features.Check.MarkReport (reportViolation)
import Features.Check.Printable (printable)
import Features.Check.Require (require, tooDeepAt)
import Features.Check.Scheme (State, firstTooDeep, holes, resolved, start)
import Features.Check.Seed (required, seeded)
import Features.Check.Settle (settleRestricted)
import Features.Check.Unify (Subst, isEmpty)
import Features.Check.Unify as Unify
import Features.Check.Walk (retype)

-- One function checked alone: its checked form and final state.
recheck
  ∷ Functional
  → Resolved.Program
  → Resolved.FunctionDecl
  → Either Diagnostic { function ∷ Checked.FunctionDecl, state ∷ State }
recheck holders program definition = checkFunction holders
  (environment program definition)
  definition

environment ∷ Resolved.Program → Resolved.FunctionDecl → Env
environment program function =
  { current: row
  , sites: [ { span: function.span, count: labelCount row } ]
  , functionName: function.name
  , functionSpan: function.span
  , rowSpan: function.rowSpan
  , effects: program.effects
  , functions: program.functions
  , types: program.types
  , ctors: program.ctors
  , variables: function.variables
  , markVariables: function.markVariables
  , locals: Map.fromFoldable
      (Array.mapWithIndex parameterLocal function.parameters)
  , introduced: function.introduced
  }
  where
  row = current function
  labelCount (Row labels _) = Array.length labels
  parameterLocal index parameter =
    Tuple (Resolved.LocalId index) (rigid parameter.ty)

-- Parameters bind rigid types; the body is inferred; then the result
-- unifies; then every type in the body is bounded again (a type bounded
-- when built deepens as its metas are bound); then the body's comparisons
-- must be ground; then the metas still unsolved become holes.
checkFunction
  ∷ Functional
  → Env
  → Resolved.FunctionDecl
  → Either Diagnostic { function ∷ Checked.FunctionDecl, state ∷ State }
checkFunction holders env function = do
  body ← infer env (own env function) function.body
  finished ← require env body.state (rigid function.result) body.value
  maybe (Right unit) tooDeepAt (firstTooDeep finished.subst body.value)
  restricted ← settleRestricted env finished body.value
  -- Only the settled substitution is kept, with the state from before
  -- settling: the registry, `next` and the origins of the checked body.
  -- Settling changes the registry's groups, tails and signatures, which
  -- nothing after it reads, and records origins for its own clause-row
  -- relays; keeping those would move the span and notes of rejections
  -- (witness/ec2, argbind), so the whole settled state is not used.
  let settledSubst = restricted.subst
  let ended = finished { subst = settledSubst }
  judgeDeferrals env ended body.value
  let marked = markConstraints env.variables ended
  maybe (Right unit) (reportViolation env marked >=> Left)
    (violation env.markVariables marked.subst)
  let settled = settle settledSubst body.value
  comparable holders env settled
  printable holders env settled
  Entry.check env ended function
  pure
    { function:
        { id: function.id
        , name: function.name
        , sorts: function.sorts
        , parameters: map parameterType function.parameters
        , result: rigid function.result
        , row: Entry.resolvedRow settledSubst env.current
        , body: holes settled
        , span: function.span
        }
    , state: marked
    }
  where
  parameterType parameter = rigid parameter.ty

-- The state a body starts in: the signature's variables are numbered
-- before any meta, and its record tails lack what it says (R001 design §2),
-- its `where` clauses included (R005 design §2).
own ∷ Env → Resolved.FunctionDecl → State
own env function = required Unify.Rigid function.constraints
  ( seeded env function.sorts signature
      (start { next = Array.length function.variables })
  )
  where
  signature = map parameterType function.parameters
    <> [ rigid function.result, rigid (TFun TUnit function.row TUnit) ]
  parameterType parameter = rigid parameter.ty

-- Every type in the body, resolved. An empty substitution resolves each
-- type to itself, so a body that bound no meta (every monomorphic one) is
-- kept rather than rebuilt (T003).
settle ∷ Subst → Checked.Expr → Checked.Expr
settle subst body =
  if isEmpty subst then body else retype (resolved subst) body

current ∷ Resolved.FunctionDecl → TyRow Open
current function = case rigid (TFun TUnit function.row TUnit) of
  TFun _ row _ → if function.name == "main" then mainRow row else row
  _ → Row [] Nothing
  where
  mainRow (Row labels tail) = Row labels (map flexible tail)
  flexible (Rigid (VarId index)) = Hole index
  flexible hole = hole
