module Domain.Checked.Internal where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe)
import Domain.Arithmetic (Arithmetic)
import Domain.Syntax (Operator, Sort, Span)
import Domain.Type (TyRow, rename)
import Domain.Ids (EffectId)
import Domain.Resolved
  ( CtorId
  , CtorInfo
  , EffectInfo
  , FunctionId
  , LocalId
  , Ty
  , TypeInfo
  , VarId
  )

-- The checked IR: typed and possibly polymorphic. Constructors are internal
-- to checking and specialization, enforced by the structure gate.

-- A variable a checked type may hold: a rigid variable of the enclosing
-- function's signature, or a hole (a use whose type checking left open).
data Open = Rigid VarId | Hole Int

derive instance eqOpen ∷ Eq Open
derive instance ordOpen ∷ Ord Open

-- The type arguments of a reference to a function or constructor, in the
-- callee's (or the owner's) variable order.
type Instantiation = Array (Ty Open)

newtype Program = Program
  { effects ∷ Array EffectInfo
  , types ∷ Array TypeInfo
  , ctors ∷ Array CtorInfo
  , functions ∷ Array FunctionDecl
  , entry ∷ FunctionId
  }

-- The name appears only in diagnostics. `sorts` is each signature
-- variable's, by VarId, as resolved: specialization reads which
-- instantiation slots are record rows (R001 design §5).
type FunctionDecl =
  { id ∷ FunctionId
  , name ∷ String
  , sorts ∷ Array Sort
  , parameters ∷ Array (Ty Open)
  , result ∷ Ty Open
  , row ∷ TyRow Open
  , body ∷ Expr
  , span ∷ Span
  }

data Expr = Expr { ty ∷ Ty Open, span ∷ Span, node ∷ Node }

-- FN001: `Call` and `Construct` hold 1 to n arguments, fewer than the
-- declared n being a partial application (a construction of a nullary
-- constructor holds none); `FunctionRef` and `CtorRef` are bare
-- references; `Apply` applies any other function value, including an
-- over-applied call's result; `Pipe` keeps its left operand first
-- (design §5, §7).
data Node
  = Integer Int
  | Boolean Boolean
  | Local LocalId
  | FunctionRef FunctionId Instantiation
  | CtorRef CtorId Instantiation
  | Call FunctionId Instantiation (Array Expr)
  | Construct CtorId Instantiation (Array Expr)
  | Arith (Arithmetic Expr)
  | Concat Expr Expr
  | Interpolate (Array Expr)
  | Compare Operator Expr Expr
  | If Expr Expr Expr
  | Match Expr (Array Arm)
  | Apply Expr (Array Expr)
  | Lambda (Array Param) Expr
  | Pipe Expr Expr
  | UnitValue
  | Block (Array Item) Expr
  | Print Expr
  | Show Expr
  | Crash Expr
  | OperationRef EffectId Int Instantiation
  | Perform EffectId Int Instantiation (Array Expr)
  | Handler EffectId Instantiation (Array HandlerClause)
  | With Expr Expr
  | Handle Expr (Array FailClause)
  | Fail Expr
  | Text String
  -- R001: a literal's fields in written order, which is evaluation order;
  -- the sorted order is its type's. An update's base, then replacements.
  | RecordLiteral (Array Field)
  | FieldAccess Expr String
  | RecordUpdate Expr (Array Field)
  -- R005: a literal with a spread, its items in written order, which is
  -- evaluation order (design §1); a removal's receiver and its labels.
  | RecordExtension (Array LiteralItem)
  | RecordRemoval Expr (Array String)

type Field = { label ∷ String, value ∷ Expr }

data LiteralItem = Given Field | Spreading Expr

-- A block item (FX001): a monomorphic `let` of a local or `_`, a deferred
-- expression of type Unit, or a discarded value.
data Item = Let (Maybe LocalId) Expr | Defer Expr | Discard Expr

-- A lambda parameter: a typed local, or a typed discard (`_`).
type Param = { local ∷ Maybe LocalId, ty ∷ Ty Open }

type Arm = { pattern ∷ Pattern, body ∷ Expr, span ∷ Span }
type HandlerClause =
  { operation ∷ Int, parameters ∷ Array Param, body ∷ Expr, span ∷ Span }

type FailClause =
  { payload ∷ Ty Open, local ∷ LocalId, body ∷ Expr, span ∷ Span }

-- A pattern carries the type it was checked against.
data Pattern = Pattern { ty ∷ Ty Open, span ∷ Span, shape ∷ Shape }

data Shape
  = Wildcard
  | Bind LocalId
  | IntLit Int
  | BoolLit Boolean
  | Ctor CtorId (Array Pattern)
  -- R004: the fields written, in written order, and how the pattern ends.
  | Record (Array FieldPattern) Rest

-- R005 design §3: no `...`, a bare one, or `...name`, whose binder has
-- the matched record's type without the written labels; the type is kept
-- so that settlement resolves it and lowering can lay the remainder out.
data Rest = NoRest | IgnoredRest | NamedRest LocalId (Ty Open)

type FieldPattern = { label ∷ String, pattern ∷ Pattern }

-- A declared type seen from inside its declaration, where its variables are
-- rigid.
rigid ∷ Ty VarId → Ty Open
rigid = rename Rigid

typeOf ∷ Expr → Ty Open
typeOf (Expr expression) = expression.ty

spanOf ∷ Expr → Span
spanOf (Expr expression) = expression.span

itemValue ∷ Item → Expr
itemValue = case _ of
  Let _ value → value
  Defer value → value
  Discard value → value

-- A literal's values, in evaluation (written) order.
fieldValues ∷ Array Field → Array Expr
fieldValues fields = map fieldValue fields
  where
  fieldValue found = found.value

-- An extension's expressions in evaluation (written) order.
extensionParts ∷ Array LiteralItem → Array Expr
extensionParts items = map itemPart items
  where
  itemPart = case _ of
    Given found → found.value
    Spreading value → value

-- An update's expressions in evaluation order: its base, then its values.
updateParts ∷ Expr → Array Field → Array Expr
updateParts record fields = Array.cons record (fieldValues fields)

-- A block's expressions in evaluation order: its items', then its value.
blockParts ∷ Array Item → Expr → Array Expr
blockParts items value = Array.snoc (map itemValue items) value
