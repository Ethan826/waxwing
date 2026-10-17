module Domain.Resolved.Core where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe, fromMaybe)
import Data.Tuple (Tuple)
import Domain.Syntax (Label, Sort(..), Span, TypeRef)
import Domain.Type (Ty, TypeId, VarId(..))

-- The declared names and patterns of resolved syntax: ids, the type and
-- effect tables, parameters and patterns, none of which mention an
-- expression. Domain.Resolved re-exports it; it is a module of its own so
-- that the expression forms there stay under the file budget (R005).

-- The sort of a variable of a declaration, from its `sorts`: type, record
-- row (the rest of a record) or effect row.
sortOf ∷ Array Sort → VarId → Sort
sortOf sorts (VarId index) = fromMaybe TypeSort (Array.index sorts index)

newtype FunctionId = FunctionId Int
newtype LocalId = LocalId Int
newtype CtorId = CtorId Int

derive instance eqFunctionId ∷ Eq FunctionId
derive instance eqLocalId ∷ Eq LocalId
derive instance ordLocalId ∷ Ord LocalId
derive instance eqCtorId ∷ Eq CtorId

-- `VarId i` in a constructor field is the owner's i-th parameter.
type TypeInfo =
  { name ∷ String
  , parameters ∷ Array String
  , rowParameters ∷ Array String
  , variables ∷ Array String
  , sorts ∷ Array Sort
  , sourceSorts ∷ Array Sort
  , ctors ∷ Array CtorId
  , span ∷ Span
  }

-- Field types are over the owner's parameters. `fieldSyntax` keeps each
-- field's source reference, whose nested spans diagnostics point into.
type CtorInfo =
  { name ∷ String
  , owner ∷ TypeId
  , fields ∷ Array (Ty VarId)
  , fieldSyntax ∷ Array TypeRef
  , span ∷ Span
  }

type Tables = { types ∷ Array TypeInfo, ctors ∷ Array CtorInfo }

-- The resolver's scope entry: a source name and the id it resolves to.
type Local = { name ∷ String, id ∷ LocalId }

-- A function carries its declared parameter count, which decides what its
-- bare name means (FN001 design §2).
data GlobalRef
  = GlobalFunction FunctionId Int
  | GlobalCtor CtorId
  | BuiltinShow
  | BuiltinCrash

-- Functions and constructors share one global namespace.
type Global = { name ∷ String, ref ∷ GlobalRef }

data Pattern
  = Wildcard Span
  | Bind Span LocalId
  | IntLit Span Int
  | BoolLit Span Boolean
  | Ctor Span CtorId (Array Pattern)
  | Record Span (Array FieldPattern) Rest

-- How a record pattern ends (R005 design §3): not at all, with a bare
-- `...` that ignores the rest, or with `...name`, which binds it.
data Rest = NoRest | IgnoredRest | NamedRest LocalId

-- The label's span is kept for diagnostics about the field (R004 design
-- §1).
type FieldPattern = { label ∷ String, span ∷ Span, pattern ∷ Pattern }

-- `rowSpan`: where the written `with` row is, for notes (FX001 Task 9): a
-- parameter's annotation row, or the signature's own.
type Parameter =
  { name ∷ String, ty ∷ Ty VarId, span ∷ Span, rowSpan ∷ Maybe Span }

-- `syntax` keeps the parameter types', then the result's, source
-- references, as `fieldSyntax` does for constructors (FX001 Task 6).
type OperationInfo =
  { name ∷ String
  , parameters ∷ Array Parameter
  , result ∷ Ty VarId
  , syntax ∷ Array TypeRef
  , span ∷ Span
  }

type EffectInfo =
  { name ∷ String
  , parameters ∷ Array String
  , operations ∷ Array OperationInfo
  , span ∷ Span
  }

-- A written `where r lacks { a, b }`: the variable it names (an index into
-- the signature's variables) with its written name and span, and the
-- labels with their spans, which later diagnostics point at (R005 design
-- §2, §5). `span` is the whole constraint. `r disjoint s` (Tranche B) names
-- two different record row variables, each with its written name.
data Requirement
  = Lacks
      { variable ∷ VarId
      , written ∷ Label
      , span ∷ Span
      , labels ∷ Array Label
      }
  | Disjoint
      { variables ∷ Tuple VarId VarId
      , written ∷ Tuple Label Label
      , span ∷ Span
      }
