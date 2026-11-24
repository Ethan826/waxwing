module Domain.Resolved
  ( module Domain.Resolved
  , module Domain.Resolved.Core
  , module Domain.Type
  ) where

import Data.Map (Map)
import Data.Maybe (Maybe)
import Domain.Arithmetic (Arithmetic)
import Domain.Resolved.Core
import Domain.Syntax (FieldName, Operator, Sort, Span)
import Domain.Syntax as Syntax
import Domain.Ids (EffectId)
import Domain.Type (Ty(..), TyRow, TypeId(..), VarId(..))
import Domain.Row (Label)

type Arm = { pattern ∷ Pattern, body ∷ Expr, span ∷ Span }

data Expr
  = Integer Span Int
  | Boolean Span Boolean
  | Local Span LocalId
  | FunctionRef Span FunctionId
  | CtorRef Span CtorId
  | Call Span FunctionId (Array Expr)
  | Construct Span CtorId (Array Expr)
  | Arith Span (Arithmetic Expr)
  | Concat Span Expr Expr
  | Interpolate Span (Array Expr)
  | Compare Span Operator Expr Expr
  | If Span Expr Expr Expr
  | Match Span Expr (Array Arm)
  | Lambda Span (Array Param) Expr
  | Apply Span Expr (Array Expr)
  | Pipe Span Expr Expr
  | UnitValue Span
  | Block Span (Array Item) Expr
  | OperationRef Span EffectId Int
  | Perform Span EffectId Int (Array Expr)
  | PrintRef Span
  | Print Span (Array Expr)
  | ShowRef Span
  | Show Span (Array Expr)
  | CrashRef Span
  | Crash Span (Array Expr)
  | Handler Span (Label (Ty VarId)) (Array HandlerClause)
  | With Span Expr Expr
  | Handle Span Expr (Array FailClause)
  -- `fail(e)`; a family written by an import (`Fail(E) { fail }`) fixes
  -- the payload type.
  | Fail Span (Maybe (Ty VarId)) Expr
  | TextLiteral Span String
  -- R001: fields in written order, each label with its span.
  | RecordLiteral Span (Array FieldValue)
  | FieldAccess Span Expr FieldName
  | RecordUpdate Span Expr (Array FieldValue)
  -- R005: a literal with a spread, items in written order; removal.
  | RecordExtension Span (Array LiteralItem)
  | RecordRemoval Span Expr (Array Syntax.Label)

type FieldValue = { name ∷ String, span ∷ Span, value ∷ Expr }

data LiteralItem = Given FieldValue | Spreading Span Expr

type HandlerClause =
  { operation ∷ Int
  , result ∷ Ty VarId
  , parameters ∷ Array HandlerParameter
  , body ∷ Expr
  , span ∷ Span
  }

type HandlerParameter = { local ∷ Maybe LocalId, ty ∷ Ty VarId }
type FailClause =
  { label ∷ Label (Ty VarId)
  , local ∷ Maybe LocalId
  , body ∷ Expr
  , span ∷ Span
  }

-- A block item: `let` binds a local, or `_` (Nothing); a discarded item's
-- value is evaluated and dropped; `defer` registers its expression, whose
-- span is the item's, for the block's exit (FX001 design §1).
data Item = Let Span (Maybe LocalId) Expr | Defer Span Expr | Discard Expr

-- A lambda parameter: a local, or `_` (Nothing), which binds nothing. Its
-- annotation names only the enclosing signature's variables.
type Param = { local ∷ Maybe LocalId, ty ∷ Maybe (Ty VarId), span ∷ Span }

-- `VarId i` in a signature is `variables !! i`: the i-th distinct type
-- variable in first-occurrence order, parameters then result. The mark
-- variables (`nofail(k)`, FX008) are a separate sort: their names, in
-- first-occurrence order.
type FunctionDecl =
  { id ∷ FunctionId
  , name ∷ String
  , variables ∷ Array String
  , markVariables ∷ Array String
  , sorts ∷ Array Sort
  , row ∷ TyRow VarId
  , parameters ∷ Array Parameter
  , result ∷ Ty VarId
  , body ∷ Expr
  , span ∷ Span
  , rowSpan ∷ Maybe Span
  -- Written `where` constraints (R005 design §2).
  , constraints ∷ Array Requirement
  -- Each record row variable's first written `...r`, for the note of
  -- `r may already have field a` (Features.Resolve.Lacking).
  , introduced ∷ Map String Span
  -- The pairs of record row variables its types write into one record.
  , joined ∷ Array Joined
  -- The written parameter types, then the result's: R005 Tranche B's
  -- D4 notes point into them (diagnostics R8).
  , syntax ∷ Array Syntax.TypeRef
  }

type Program =
  { types ∷ Array TypeInfo
  , ctors ∷ Array CtorInfo
  , effects ∷ Array EffectInfo
  , functions ∷ Array FunctionDecl
  , entry ∷ FunctionId
  }

exprSpan ∷ Expr → Span
exprSpan expression = case expression of
  Integer span _ → span
  Boolean span _ → span
  Local span _ → span
  FunctionRef span _ → span
  CtorRef span _ → span
  Call span _ _ → span
  Construct span _ _ → span
  Arith span _ → span
  Concat span _ _ → span
  Interpolate span _ → span
  Compare span _ _ _ → span
  If span _ _ _ → span
  Match span _ _ → span
  Lambda span _ _ → span
  Apply span _ _ → span
  Pipe span _ _ → span
  UnitValue span → span
  Block span _ _ → span
  OperationRef span _ _ → span
  Perform span _ _ _ → span
  PrintRef span → span
  Print span _ → span
  ShowRef span → span
  Show span _ → span
  CrashRef span → span
  Crash span _ → span
  Handler span _ _ → span
  With span _ _ → span
  Handle span _ _ → span
  Fail span _ _ → span
  TextLiteral span _ → span
  RecordLiteral span _ → span
  FieldAccess span _ _ → span
  RecordUpdate span _ _ → span
  RecordExtension span _ → span
  RecordRemoval span _ _ → span
