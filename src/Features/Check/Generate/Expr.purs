-- T-R0b §3: the expression judgement `Γ ⊢_p e ⇝ τ ; C`, one rule per
-- constructor of `Resolved.Expr` (G-total, RT5: the match below names
-- all 36 with no wildcard). Every node's type joins `types` at its path
-- (§5.2). E1 and E2 are here; the other rules are in the modules named
-- by their group, given this function to generate children.
module Features.Check.Generate.Expr (expr) where

import Prelude (pure, (<$>))
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Domain.Recorded.Atom (Base(..), RTExpr(Base))
import Domain.Recorded.Origin (Path)
import Domain.Resolved (Expr(..), LocalId)
import Features.Check.Generate.Builtin (Builtin(..), builtinCall, builtinRef)
import Features.Check.Generate.Call (call, construct, ctorRef, functionRef)
import Features.Check.Generate.Fault (Gen, GenerationFault(..))
import Features.Check.Generate.Context (Context, localType)
import Features.Check.Generate.Control (block, lambda, match)
import Features.Check.Generate.Effect (handler, operationRef, perform, with)
import Features.Check.Generate.Failure (fail, handle)
import Features.Check.Generate.Operator
  ( application
  , arithmetic
  , comparison
  , conditional
  , interpolate
  , pipe
  )
import Features.Check.Generate.Out (Generated, concatOut, noOut, typeAt)
import Features.Check.Generate.Record
  ( extension
  , fieldAccess
  , literal
  , removal
  , update
  )

expr ∷ Context → Path → Expr → Gen Generated
expr context path found = typed <$> rule found
  where
  typed generated = generated
    { out = concatOut [ typeAt path generated.ty, generated.out ] }
  leaf base = pure { ty: Base base, out: noOut } -- E1
  rule = case _ of
    Integer _ _ → leaf IntBase
    Boolean _ _ → leaf BoolBase
    TextLiteral _ _ → leaf TextBase
    UnitValue _ → leaf UnitBase
    Local _ local → localOf context local -- E2
    FunctionRef span function → functionRef context path span function
    CtorRef span ctor → ctorRef context path span ctor
    Call span function arguments → call expr context path span function
      arguments
    Construct span ctor arguments → construct expr context path span ctor
      arguments
    Add span left right → arithmetic expr context path span 7 "Add" IntBase
      left
      right
    Concat span left right → arithmetic expr context path span 8 "Concat"
      TextBase
      left
      right
    Interpolate span parts → interpolate expr context path span parts
    Compare span _ left right → comparison expr context path span left
      right
    If span condition yes no → conditional expr context path span condition
      yes
      no
    Match span scrutinee arms → match expr context path span scrutinee arms
    Lambda span parameters body → lambda expr context path span parameters
      body
    Apply span function arguments → application expr context path span function
      arguments
    Pipe span left right → pipe expr context path span left right
    Block _ items result → block expr context path items result
    OperationRef span effect index → operationRef context path span effect
      index
    Perform span effect index arguments → perform expr context path span
      effect
      index
      arguments
    PrintRef span → pure (builtinRef context path span PrintBuiltin)
    Print span arguments → builtinCall expr context path span PrintBuiltin
      arguments
    ShowRef span → pure (builtinRef context path span ShowBuiltin)
    Show span arguments → builtinCall expr context path span ShowBuiltin
      arguments
    CrashRef span → pure (builtinRef context path span CrashBuiltin)
    Crash span arguments → builtinCall expr context path span CrashBuiltin
      arguments
    Handler span label clauses → handler expr context path span label
      clauses
    With span installed body → with expr context path span installed body
    Handle span body clauses → handle expr context path span body clauses
    Fail span family value → fail expr context path span family value
    RecordLiteral _ fields → literal expr context path fields
    FieldAccess span value label → fieldAccess expr context path span value
      label
    RecordUpdate _ value fields → update expr context path value fields
    RecordExtension span items → extension expr context path span items
    RecordRemoval span value labels → removal expr context path span value
      labels

-- E2: `Γ(id)`. Every resolved local is bound by Sig2, E13, E16, E20,
-- E22, P2 or P7 before its use; one that is not is a fault.
localOf ∷ Context → LocalId → Gen Generated
localOf context local = maybe (Left (UnboundLocal local)) found
  (localType context local)
  where
  found ty = Right { ty, out: noOut }
