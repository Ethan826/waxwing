module Features.Check.Signature
  ( Signature
  , Head(..)
  , buildSignature
  , candidates
  , fieldTypes
  , arity
  , witnessOf
  , recordHead
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Data.Tuple (fst, snd)
import Domain.Problem (Problem(..), Witness(..))
import Domain.Checked.Internal (Open)
import Domain.Resolved (CtorId(..), CtorInfo, Ty(..), TypeId, TypeInfo)
import Domain.Type.Record (RecordRow, labels)
import Features.Check.Expand (Expansion, application, expand)
import Features.Check.Inhabited (inhabitation)
import Features.Check.Substitute (substitute)
import Features.Check.Tables (Lookup, ctorInfo, typeInfo)

-- `inhabited` is indexed by the expansion's constructor numbers: one flag
-- per constructor of each type application.
type Signature =
  { types ∷ Array TypeInfo
  , ctors ∷ Array CtorInfo
  , expansion ∷ Expansion
  , inhabited ∷ Array Boolean
  }

-- Literals are nullary heads, so one specialization serves every type. A
-- record type is one head whose fields are its known labels in label
-- order; whether the type is open reaches the witness (R004 design §3).
data Head
  = HCtor CtorId
  | HInt Int
  | HBool Boolean
  | HRecord { labels ∷ Array String, open ∷ Boolean }

derive instance eqHead ∷ Eq Head

-- The existing fixpoint, run on the expanded tables: inhabitedness per
-- type application (design §5).
buildSignature
  ∷ Array TypeInfo → Array CtorInfo → Array (Ty Open) → Lookup Signature
buildSignature types ctors roots = do
  expansion ← expand types ctors roots
  inhabited ← inhabitation expansion.types expansion.ctors
  pure { types, ctors, expansion, inhabited }

-- Heads whose presence makes a column complete, in declaration order.
-- A type with no inhabited constructor has none, so it is vacuously
-- complete. A rigid variable or a hole is abstract (design §5), and so is
-- an arrow, which only `_` and binders match (FN001 design §3), as is
-- Unit (FX001): none has heads, and `complete` never reads one as
-- complete. A record type has its one head.
candidates ∷ Signature → Ty Open → Lookup (Array Head)
candidates tables ty = case ty of
  TInt → Right []
  TBool → Right [ HBool true, HBool false ]
  TUnit → Right []
  TText → Right []
  TData id _ _ → applied tables id ty
  TVar _ → Right []
  TFun _ _ _ → Right []
  THandler _ _ → Right []
  TRecord row → Right [ recordHead row ]

-- The declared constructors whose expanded counterparts are inhabited.
applied ∷ Signature → TypeId → Ty Open → Lookup (Array Head)
applied tables id ty = do
  info ← typeInfo tables.types id
  expanded ← application tables.expansion ty
  flags ← traverse (flag tables.inhabited) expanded.ctors
  pure (map (HCtor <<< fst) (Array.filter snd (Array.zip info.ctors flags)))

-- A constructor's declared fields with the column's type arguments
-- substituted; a constructor head on a column that is not data is a bug.
fieldTypes ∷ Signature → Ty Open → Head → Lookup (Array (Ty Open))
fieldTypes tables ty = case _ of
  HCtor id → ctorInfo tables.ctors id >>= fieldsOf
  HRecord _ → recordFields ty
  _ → Right []
  where
  fieldsOf ctor = arguments >>= substituted ctor
  substituted ctor values = traverse (substitute values) ctor.fields
  arguments = case ty of
    TData _ values _ → Right values
    _ → Left (Internal "Constructor head on a type that is not data")

-- The field types of a record column, in label order.
recordFields ∷ Ty Open → Lookup (Array (Ty Open))
recordFields = case _ of
  TRecord row → Right (map snd row.fields)
  _ → Left (Internal "Record head on a type that is not a record")

arity ∷ Signature → Head → Lookup Int
arity tables = case _ of
  HCtor id → fieldCount <$> ctorInfo tables.ctors id
  HRecord record → Right (Array.length record.labels)
  _ → Right 0
  where
  fieldCount ctor = Array.length ctor.fields

-- A witness carries the constructor's name, so Format needs no tables.
witnessOf ∷ Signature → Head → Array Witness → Lookup Witness
witnessOf tables head fields = case head of
  HCtor id → named <$> ctorInfo tables.ctors id
  HInt value → Right (WInt value)
  HBool value → Right (WBool value)
  HRecord record → Right
    (WRecord (Array.zip record.labels fields) record.open)
  where
  named ctor = WCtor ctor.name fields

-- The fields of the row's sorted record (ADR 013), and whether it has a
-- tail: a rigid or a hole tail alike is more than the labels it shows.
recordHead ∷ RecordRow (Ty Open) Open → Head
recordHead row = HRecord
  { labels: labels row, open: not (Array.null row.tails) }

flag ∷ Array Boolean → CtorId → Lookup Boolean
flag inhabited (CtorId index) = maybe' missing Right
  (Array.index inhabited index)
  where
  missing _ = Left (Internal "Invalid constructor id")
