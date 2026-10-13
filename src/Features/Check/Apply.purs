module Features.Check.Apply
  ( checkApply
  , applyAll
  , applyValue
  , calleeOf
  , functionLike
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe, isJust, maybe')
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Row (openRow)
import Features.Check.Consume (consumeAt)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.Provenance (Callee, Consumed(Application))
import Features.Check.Require (expectType, require, typeName)
import Features.Check.Scheme (State, Threaded, headOf, resolved, threadAll)
import Features.Check.Sync (sync)

-- An application in progress: the checking state and the type still to
-- be applied.
type Applying = { ty ∷ Ty Open, state ∷ State }

-- A function type opened for one argument.
type Opened =
  { parameter ∷ Ty Open, result ∷ Ty Open, row ∷ TyRow Open }

-- FN001 design §3: `e(a1, …, aj)` is `e(a1)…(aj)`. The callee first.
checkApply
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Resolved.Expr
  → Array Resolved.Expr
  → Either Diagnostic (Threaded Checked.Expr)
checkApply infer env state span callee arguments = do
  head ← infer env state callee
  applyAll infer env span (calleeOf env callee) head arguments

-- A checked callee applied to each argument in turn, the type threaded
-- with the state (Scheme's `threadAll`, so no frame or copy per argument),
-- as one `Apply` spanning `span`.
applyAll
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → Span
  → Maybe Callee
  → Threaded Checked.Expr
  → Array Resolved.Expr
  → Either Diagnostic (Threaded Checked.Expr)
applyAll infer env span named callee arguments = do
  applied ← threadAll (applyNext infer env span named) start arguments
  pure
    { value: Checked.Expr
        { ty: applied.state.ty
        , span
        , node: Checked.Apply callee.value applied.value
        }
    , state: applied.state.state
    }
  where
  start = { ty: Checked.typeOf callee.value, state: callee.state }

-- The current type is opened before its argument is inferred, so a value
-- that is not a function is reported at the first argument it cannot take.
applyNext
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → Span
  → Maybe Callee
  → Applying
  → Resolved.Expr
  → Either Diagnostic { value ∷ Checked.Expr, state ∷ Applying }
applyNext infer env span named applying argument = do
  synced ← sync env applying.state (Resolved.exprSpan argument)
  opened ← open env synced applying.ty (Resolved.exprSpan argument)
  checked ← infer env opened.state argument
  reached ← require env checked.state opened.value.parameter checked.value
  consumed ← consumeAt env reached span (Application named) opened.value.row
  pure
    { value: checked.value
    , state: { ty: opened.value.result, state: consumed }
    }

-- A value of type `ty` applied to an argument already checked: a pipe's
-- left operand. Returns the result type.
applyValue
  ∷ ∀ r
  . CheckEnv r
  → State
  → Maybe Callee
  → Ty Open
  → Checked.Expr
  → Either Diagnostic (Threaded (Ty Open))
applyValue env state named ty argument = do
  synced ← sync env state (Checked.spanOf argument)
  opened ← open env synced ty (Checked.spanOf argument)
  reached ← require env opened.state opened.value.parameter argument
  consumed ← consumeAt env reached (Checked.spanOf argument)
    (Application named)
    opened.value.row
  pure { value: opened.value.result, state: consumed }

-- A callee that is a parameter of the enclosing function has a name and a
-- written row to point at (FX017). LocalIds below the parameter count are
-- the parameters; the resolved syntax keeps no other local's name.
calleeOf ∷ ∀ r. CheckEnv r → Resolved.Expr → Maybe Callee
calleeOf env = case _ of
  Resolved.Local _ (Resolved.LocalId index) → Array.index parameters index
    >>= parameterCallee index
  _ → Nothing
  where
  parameters = maybe' none _.parameters
    (Array.find named env.functions)
  none _ = []
  named function = function.name == env.functionName
  parameterCallee index parameter =
    if singleStage parameter.ty then Just
      { name: parameter.name
      , index
      , rowSpan: fromMaybe parameter.span parameter.rowSpan
      , written: isJust parameter.rowSpan
      }
    else Nothing

-- Only an arrow whose result is no arrow has one row to name: a `with`
-- after a curried type belongs to its last arrow, and a later stage is not
-- the parameter's row (FX017).
singleStage ∷ Ty Resolved.VarId → Boolean
singleStage = case _ of
  TFun _ _ (TFun _ _ _) → false
  TFun _ _ _ → true
  _ → false

-- Whether `ty` may still be applied: an arrow, or a meta not yet bound.
functionLike ∷ State → Ty Open → Boolean
functionLike state ty = case headOf state ty of
  TFun _ _ _ → true
  TVar (Hole _) → true
  _ → false

-- An arrow opens as its parameter and result; an unbound meta is first
-- bound to a pure arrow of two fresh metas (no syntax writes a row yet);
-- anything else (Int, Bool, a declared type, a rigid variable) is not a
-- function, at `span`.
open
  ∷ ∀ r
  . CheckEnv r
  → State
  → Ty Open
  → Span
  → Either Diagnostic (Threaded Opened)
open env state ty span = case headOf state ty of
  TFun parameter row result → Right { value: { parameter, result, row }, state }
  meta@(TVar (Hole _)) → bindArrow env state meta span
  other → notAFunction env state other span

bindArrow
  ∷ ∀ r
  . CheckEnv r
  → State
  → Ty Open
  → Span
  → Either Diagnostic (Threaded Opened)
bindArrow env state meta span = do
  reached ← expectType env fresh meta (TFun parameter row result) span
  pure { value: { parameter, result, row }, state: reached }
  where
  parameter = TVar (Hole state.next)
  result = TVar (Hole (state.next + 1))
  row = openRow (Hole (state.next + 2))
  fresh = state { next = state.next + 2 + 1 }

notAFunction
  ∷ ∀ r a. CheckEnv r → State → Ty Open → Span → Either Diagnostic a
notAFunction env state ty span = do
  name ← typeName env span (resolved state.subst ty)
  Left (problemAt (NotAFunction name) span)
