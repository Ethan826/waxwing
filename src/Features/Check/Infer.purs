module Features.Check.Infer (Env, infer) where

import Prelude
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe, maybe')
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved (Ty(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Operator, Span, problemAt)
import Domain.Type (TyRow)
import Features.Check.Show (showCall, showRef)
import Features.Check.Operation
  ( operationCall
  , operationRef
  , printCall
  , printRef
  , crashCall
  , crashRef
  )
import Features.Check.Apply (checkApply)
import Features.Check.Arms (checkMatch)
import Features.Check.Block (checkBlock)
import Features.Check.Handle as Handle
import Features.Check.Handler as Handler
import Features.Check.Failure as Failure
import Features.Check.Call (checkCall, checkConstruct)
import Features.Check.Context (Locals)
import Features.Check.Lambda (checkLambda)
import Features.Check.Pipe (checkPipe)
import Features.Check.Use (checkCtorRef, checkFunctionRef)
import Features.Check.Require (bounded, require)
import Features.Check.Scheme (State, Threaded, threadAll)
import Features.Check.Sync (sync)
import Features.Check.Site (Site)

type Env =
  { current ∷ TyRow Open
  , sites ∷ Array Site
  , functionName ∷ String
  , functionSpan ∷ Span
  , rowSpan ∷ Maybe Span
  , effects ∷ Array Resolved.EffectInfo
  , functions ∷ Array Resolved.FunctionDecl
  , types ∷ Array Resolved.TypeInfo
  , ctors ∷ Array Resolved.CtorInfo
  , variables ∷ Array String
  , markVariables ∷ Array String
  , locals ∷ Locals
  }

type Inferred = Either Diagnostic (Threaded Checked.Expr)

-- Every expression's type is bounded once built (ruling R7), so the
-- expression reported is the first, in checking order, whose type would
-- exceed the limit.
infer ∷ Env → State → Resolved.Expr → Inferred
infer env state expression = do
  inferred ← inferNode env state expression
  synced ← sync env inferred.state (Checked.spanOf inferred.value)
  bounded synced (Checked.typeOf inferred.value)
    (Checked.spanOf inferred.value)
  pure inferred { state = synced }

-- Every type equality is a unification, in the order monomorphic checking
-- compared types, so a monomorphic program's first error is unchanged.
-- A flat exhaustive dispatch (BACKLOG E003).
inferNode ∷ Env → State → Resolved.Expr → Inferred
inferNode env state expression = case expression of
  Resolved.Integer span value → typed state span TInt (Checked.Integer value)
  Resolved.Boolean span value → typed state span TBool
    (Checked.Boolean value)
  Resolved.TextLiteral span value → typed state span TText
    (Checked.Text value)
  Resolved.Local span id → checkLocal env state span id
  Resolved.FunctionRef span id → checkFunctionRef env state span id
  Resolved.CtorRef span id → checkCtorRef env state span id
  Resolved.Call span id arguments → checkCall infer env state span id
    arguments
  Resolved.Construct span id arguments → checkConstruct infer env state span
    id
    arguments
  Resolved.Add span left right → checkAddition env state span left right
  Resolved.Concat span left right → checkConcat env state span left right
  Resolved.Interpolate span parts → checkInterpolate env state span parts
  Resolved.Compare span operator left right → checkComparison env state
    { span, operator }
    left
    right
  Resolved.If span condition yes no → checkConditional env state span
    condition
    { yes, no }
  Resolved.Match span scrutinee arms → checkMatch infer env state span
    scrutinee
    arms
  Resolved.Lambda span parameters body → checkLambda infer env state span
    parameters
    body
  Resolved.Apply span callee arguments → checkApply infer env state span
    callee
    arguments
  Resolved.Pipe span left right → checkPipe infer env state span left right
  Resolved.UnitValue span → typed state span TUnit Checked.UnitValue
  Resolved.OperationRef span effect index → operationRef env state span effect
    index
  Resolved.Perform span effect index arguments →
    operationCall infer env state span effect index arguments
  Resolved.PrintRef span → printRef env state span
  Resolved.Print span arguments → printCall infer env state span arguments
  Resolved.ShowRef span → showRef env state span
  Resolved.Show span arguments → showCall infer env state span arguments
  Resolved.CrashRef span → crashRef env state span
  Resolved.Crash span arguments → crashCall infer env state span arguments
  Resolved.Block span items value → checkBlock infer env state span items
    value
  Resolved.Handler span label clauses → Handler.handler infer env state span
    label
    clauses
  Resolved.With span handler body → Handler.withHandler infer env state span
    handler
    body
  Resolved.Handle span body clauses → Handle.handleFailure infer env state
    span
    body
    clauses
  Resolved.Fail span family value → Failure.failExpression infer env state
    span
    family
    value

typed ∷ State → Span → Ty Open → Checked.Node → Inferred
typed state span ty node = pure
  { value: Checked.Expr { ty, span, node }, state }

checkAddition
  ∷ Env → State → Span → Resolved.Expr → Resolved.Expr → Inferred
checkAddition env state span left right = do
  first ← infer env state left
  second ← infer env first.state right
  added ← require env second.state TInt first.value
  checked ← require env added TInt second.value
  typed checked span TInt (Checked.Add first.value second.value)

checkConcat
  ∷ Env → State → Span → Resolved.Expr → Resolved.Expr → Inferred
checkConcat env state span left right = do
  first ← infer env state left
  second ← infer env first.state right
  joined ← require env second.state TText first.value
  checked ← require env joined TText second.value
  typed checked span TText (Checked.Concat first.value second.value)

-- Each hole is inferred, then must be Text, in source order.
checkInterpolate ∷ Env → State → Span → Array Resolved.Expr → Inferred
checkInterpolate env state span parts = do
  threaded ← threadAll (hole env) state parts
  typed threaded.state span TText (Checked.Interpolate threaded.value)

hole ∷ Env → State → Resolved.Expr → Either Diagnostic (Threaded Checked.Expr)
hole env state part = do
  found ← infer env state part
  checked ← require env found.state TText found.value
  pure { value: found.value, state: checked }

checkComparison
  ∷ Env
  → State
  → { span ∷ Span, operator ∷ Operator }
  → Resolved.Expr
  → Resolved.Expr
  → Inferred
checkComparison env state at left right = do
  first ← infer env state left
  second ← infer env first.state right
  checked ← require env second.state (Checked.typeOf first.value)
    second.value
  typed checked at.span TBool
    (Checked.Compare at.operator first.value second.value)

-- The else branch is checked against the then branch's type.
checkConditional
  ∷ Env
  → State
  → Span
  → Resolved.Expr
  → { yes ∷ Resolved.Expr, no ∷ Resolved.Expr }
  → Inferred
checkConditional env state span condition branches = do
  predicate ← infer env state condition
  tested ← require env predicate.state TBool predicate.value
  first ← infer env tested branches.yes
  second ← infer env first.state branches.no
  checked ← require env second.state (Checked.typeOf first.value)
    second.value
  typed checked span (Checked.typeOf first.value)
    (Checked.If predicate.value first.value second.value)

checkLocal ∷ Env → State → Span → Resolved.LocalId → Inferred
checkLocal env state span id = maybe' missing found
  (Map.lookup id env.locals)
  where
  missing _ = Left (problemAt (Internal "Invalid resolved local") span)
  found ty = typed state span ty (Checked.Local id)
