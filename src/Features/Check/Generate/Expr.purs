-- T-R0b §3: the expression judgement `Γ ⊢_p e ⇝ τ ; C`, one rule per
-- constructor of `Resolved.Expr` (G-total, RT5: the match below names
-- all 36 with no wildcard). Every node's type is positioned at
-- `NodeType p` (§5.2): it joins `types` and is read there for the
-- checked node (D1 spec §3.3; R0 Task 7.1b), whose span is the resolved
-- node's. E1 and E2 are here; the other rules are in the modules named
-- by their group, given this function to generate children.
module Features.Check.Generate.Expr (expr) where

import Prelude
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..))
import Domain.Recorded.Origin (Path)
import Domain.Resolved (Expr(..), LocalId, exprSpan)
import Domain.Type (Ty(..))
import Features.Check.Generate.Builtin (Builtin(..), builtinCall, builtinRef)
import Features.Check.Generate.Call (call, construct, ctorRef, functionRef)
import Features.Check.Generate.Context (Context, localType)
import Features.Check.Generate.Block (block)
import Features.Check.Generate.Control (lambda, match)
import Features.Check.Generate.Effect (handler, operationRef, perform, with)
import Features.Check.Generate.Failure (fail, handle)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Gen (Gen, lifted, positioned)
import Features.Check.Generate.Node (Generated, Ruled, fixed, none)
import Features.Check.Generate.Operator
  ( application
  , arithmetic
  , comparison
  , conditional
  , interpolate
  , pipe
  )
import Features.Check.Generate.Record (extension, fieldAccess, literal)
import Features.Check.Generate.Update (removal, update)

expr ∷ ∀ s. Context s → Path → Expr → Gen s (Generated s)
expr context path found = do
  ruled ← rule found
  read ← positioned (NodeType path) ruled.ty
  pure
    { ty: ruled.ty
    , expr: checked <$> read <*> ruled.node
    , emits: ruled.emits
    }
  where
  checked ty node = Checked.Expr { ty, span: exprSpan found, node: node ty }
  leaf ty node = pure { ty, node: fixed (pure node), emits: none } -- E1
  recur = expr
  rule = case _ of
    Integer _ value → leaf TInt (Checked.Integer value)
    Boolean _ value → leaf TBool (Checked.Boolean value)
    TextLiteral _ value → leaf TText (Checked.Text value)
    UnitValue _ → leaf TUnit Checked.UnitValue
    Local _ local → localOf context local -- E2
    FunctionRef span function → functionRef context path span function
    CtorRef span ctor → ctorRef context path span ctor
    Call span function arguments → call recur context path span function
      arguments
    Construct span ctor arguments → construct recur context path span ctor
      arguments
    Add span left right → arithmetic recur context path span
      { rule: 7, label: "Add", base: TInt, made: Checked.Add }
      left
      right
    Concat span left right → arithmetic recur context path span
      { rule: 8, label: "Concat", base: TText, made: Checked.Concat }
      left
      right
    Interpolate span parts → interpolate recur context path span parts
    Compare span operator left right → comparison recur context path span
      operator
      left
      right
    If span condition yes no → conditional recur context path span condition
      yes
      no
    Match span scrutinee arms → match recur context path span scrutinee arms
    Lambda span parameters body → lambda recur context path span parameters
      body
    Apply span function arguments → application recur context path span
      function
      arguments
    Pipe span left right → pipe recur context path span left right
    Block _ items result → block recur context path items result
    OperationRef span effect index → operationRef context path span effect
      index
    Perform span effect index arguments → perform recur context path span
      effect
      index
      arguments
    PrintRef span → builtinRef context path span PrintBuiltin
    Print span arguments → builtinCall recur context path span PrintBuiltin
      arguments
    ShowRef span → builtinRef context path span ShowBuiltin
    Show span arguments → builtinCall recur context path span ShowBuiltin
      arguments
    CrashRef span → builtinRef context path span CrashBuiltin
    Crash span arguments → builtinCall recur context path span CrashBuiltin
      arguments
    Handler span label clauses → handler recur context path span label
      clauses
    With span installed body → with recur context path span installed body
    Handle span body clauses → handle recur context path span body clauses
    Fail span family value → fail recur context path span family value
    RecordLiteral _ fields → literal recur context path fields
    FieldAccess span value label → fieldAccess recur context path span value
      label
    RecordUpdate _ value fields → update recur context path value fields
    RecordExtension span items → extension recur context path span items
    RecordRemoval span value labels → removal recur context path span value
      labels

-- E2: `Γ(id)`. Every resolved local is bound by Sig2, E13, E16, E20,
-- E22, P2 or P7 before its use; one that is not is a fault.
localOf ∷ ∀ s. Context s → LocalId → Gen s (Ruled s)
localOf context local = lifted
  ( maybe (Left (UnboundLocal local)) found
      (localType context local)
  )
  where
  found ty = Right { ty, node: fixed (pure (Checked.Local local)), emits: none }
