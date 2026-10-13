module Domain.Syntax.Core where

import Prelude
import Data.Maybe (Maybe)
import Domain.Note (NoteReason)
import Domain.Problem (Problem)

type Position = { offset ∷ Int, line ∷ Int, column ∷ Int }
type Span = { start ∷ Position, end ∷ Position }
type Note = { span ∷ Span, reason ∷ NoteReason }

type Diagnostic =
  { problem ∷ Problem, span ∷ Span, related ∷ Array Note }

data Operator = Equal | NotEqual | Less | LessEqual | Greater | GreaterEqual

derive instance eqOperator ∷ Eq Operator

data Expr
  = Integer Span Int
  | Boolean Span Boolean
  | Variable Span String
  | Call Span String (Array Expr)
  | Add Span Expr Expr
  | Concat Span Expr Expr
  | Interpolate Span (Array Expr)
  | Compare Span Operator Expr Expr
  | If Span Expr Expr Expr
  | Match Span Expr (Array Arm)
  | Lambda Span (Array LambdaParam) Expr
  | Apply Span Expr (Array Expr)
  | Pipe Span Expr Expr
  | UnitValue Span
  | Block Span (Array Item) Expr
  | HandlerExpr Span LabelRef (Array Clause)
  | With Span Expr Expr
  | Handle Span Expr (Array FailClause)
  | Fail Span Expr
  | TextLiteral Span String

-- A block item (FX001 design §1): `let name = e`, `let _ = e` (Nothing)
-- spanning `let` through `e`, `defer e` spanning `defer` through `e`, or
-- `e`, whose value is discarded. A block whose items end in `;` has the
-- value `UnitValue` at its closing `}`; no written value ends where the
-- block does, so that span marks it.
data Item = Let Span (Maybe String) Expr | Defer Span Expr | Discard Expr

-- A lambda parameter spans its name; `_` (no name) binds nothing.
type LambdaParam = { name ∷ Maybe String, ty ∷ Maybe TypeRef, span ∷ Span }

data Pattern
  = PWildcard Span
  | PBind Span String
  | PInt Span Int
  | PBool Span Boolean
  | PCtor Span String (Array Pattern)

type Arm = { pattern ∷ Pattern, body ∷ Expr, span ∷ Span }
type Clause =
  { name ∷ String
  , parameters ∷ Array HandlerParameterRef
  , body ∷ Expr
  , span ∷ Span
  }

type HandlerParameterRef = { name ∷ Maybe String, span ∷ Span }
type FailClause = { name ∷ String, ty ∷ TypeRef, body ∷ Expr, span ∷ Span }

-- A lowercase name is a type variable; an applied type spans its head
-- through its closing parenthesis. `FunRef` is one arrow, parameter then
-- result; `(A, B) -> C` is written notation for `A -> B -> C`.
data TypeRef
  = IntRef Span
  | BoolRef Span
  | UnitRef Span
  | TextRef Span
  | VarRef Span String
  | NamedRef Span String (Array TypeArgument)
  | THandlerRef Span LabelRef (Maybe RowRef)
  | FunRef Span TypeRef (Maybe RowRef) TypeRef

data TypeArgument = TypeArgument TypeRef | RowArgument RowRef

data Sort = TypeSort | RowSort

derive instance eqSort ∷ Eq Sort
derive instance ordSort ∷ Ord Sort

data RowTail = Spread String | Pure
data RowRef = RowRef Span (Array LabelRef) (Maybe RowTail)
-- A written mark (FX008 design §3.2) spans `nofail` or `nofail(k)` alone;
-- the label's own `span` stays the label's.
data MarkRef = NofailRef Span | NofailVariableRef Span String

type LabelRef =
  { name ∷ String
  , arguments ∷ Array TypeRef
  , mark ∷ Maybe MarkRef
  , span ∷ Span
  }

-- An arrow's parameters along its result side, and the final result.
type RefSpine = { parameters ∷ Array TypeRef, result ∷ TypeRef }

type CtorDecl = { name ∷ String, fields ∷ Array TypeRef, span ∷ Span }
type TypeParameter = { name ∷ String, sort ∷ Sort, span ∷ Span }
type TypeDecl =
  { name ∷ String
  , parameters ∷ Array TypeParameter
  , ctors ∷ Array CtorDecl
  , span ∷ Span
  }

type Parameter = { name ∷ String, ty ∷ TypeRef, span ∷ Span }
type FunctionDecl =
  { name ∷ String
  , parameters ∷ Array Parameter
  , result ∷ TypeRef
  , row ∷ Maybe RowRef
  , body ∷ Expr
  , span ∷ Span
  }

type OperationDecl =
  { name ∷ String
  , parameters ∷ Array Parameter
  , result ∷ TypeRef
  , row ∷ Maybe RowRef
  , span ∷ Span
  }

type EffectDecl =
  { name ∷ String
  , parameters ∷ Array TypeParameter
  , operations ∷ Array OperationDecl
  , span ∷ Span
  }

type Program =
  { types ∷ Array TypeDecl
  , functions ∷ Array FunctionDecl
  , effects ∷ Array EffectDecl
  }

-- Wire codes; Format.Diagnostic maps each Problem to one.
data ErrorCode
  = LexError
  | SyntaxError
  | IntegerRange
  | NestingLimit
  | EntryError
  | DuplicateName
  | UnboundName
  | NotCallable
  | TypeMismatch
  | InternalError
  | ArityMismatch
  | Redundant
  | NonExhaustive
  | SpecializationError
  | EffectError
  | HandlerError

derive instance eqErrorCode ∷ Eq ErrorCode
