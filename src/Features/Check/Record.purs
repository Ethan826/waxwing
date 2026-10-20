module Features.Check.Record
  ( checkLiteral
  , checkAccess
  , checkUpdate
  , select
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..), TypeName)
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, FieldName, Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.FreshRecord (freshRecord)
import Features.Check.Require (bounded, require, tooDeepAt, typeName)
import Features.Check.Scheme
  ( State
  , Threaded
  , flexible
  , headOf
  , resolved
  , threadAll
  )
import Features.Check.Merged (mergedAt)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.Unify (Failure(..), unify)

type Checked a = Either Diagnostic (Threaded a)

-- R001 design §2. A literal has the closed record type of its fields; its
-- values are checked in written order, which is evaluation order.
checkLiteral
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Array Resolved.FieldValue
  → Checked Checked.Expr
checkLiteral infer env state span fields = do
  threaded ← threadAll (fieldValue infer env) state fields
  pure
    { value: Checked.Expr
        { ty: TRecord (recordRow (map fieldType threaded.value) [])
        , span
        , node: Checked.RecordLiteral threaded.value
        }
    , state: threaded.state
    }
  where
  fieldType found = Tuple found.label (Checked.typeOf found.value)

-- `e.l` has the type of `e`'s field `l`.
checkAccess
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Resolved.Expr
  → FieldName
  → Checked Checked.Expr
checkAccess infer env state span record label = do
  found ← infer env state record
  selected ← select env found.state found.value label
  pure
    { value: Checked.Expr
        { ty: selected.value
        , span
        , node: Checked.FieldAccess found.value label.name
        }
    , state: selected.state
    }

-- `e { l = v, … }` has `e`'s type: each label must be a field of it, and
-- each value must have that field's type, so no update changes a type
-- (design decision 3). The base is checked first, then each label and
-- its value in written order.
checkUpdate
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Resolved.Expr
  → Array Resolved.FieldValue
  → Checked Checked.Expr
checkUpdate infer env state span record fields = do
  found ← infer env state record
  threaded ← threadAll (replacement infer env found.value) found.state fields
  pure
    { value: Checked.Expr
        { ty: Checked.typeOf found.value
        , span
        , node: Checked.RecordUpdate found.value threaded.value
        }
    , state: threaded.state
    }

fieldValue
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Resolved.FieldValue
  → Checked Checked.Field
fieldValue infer env state found = do
  checked ← infer env state found.value
  pure
    { value: { label: found.name, value: checked.value }
    , state: checked.state
    }

replacement
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → Checked.Expr
  → State
  → Resolved.FieldValue
  → Checked Checked.Field
replacement infer env record state found = do
  selected ← select env state record { name: found.name, span: found.span }
  checked ← infer env selected.state found.value
  required ← require env checked.state selected.value checked.value
  pure
    { value: { label: found.name, value: checked.value }, state: required }

-- The record's type unifies with `{ l: α, ...ρ }` for a fresh α and a
-- fresh ρ that lacks `l`; the field's type is α. A record without `l`
-- whose tail cannot grow to hold it (closed, rigid, or lacking `l`) is the
-- missing field, at the label; anything else that is no record is reported
-- at the receiver (design §6).
select
  ∷ ∀ r
  . CheckEnv r
  → State
  → Checked.Expr
  → FieldName
  → Checked (Ty Open)
select env state record label = do
  bounded state ty (Checked.spanOf record)
  either failed bound
    (unify fresh.state.subst (flexible ty) (flexible fresh.record))
  where
  ty = Checked.typeOf record
  fresh = freshRecord state [ label.name ] true
  -- freshRecord numbers its first label's hole `state.next`.
  field = TVar (Hole state.next)
  bound subst = Right { value: field, state: fresh.state { subst = subst } }
  failed = case _ of
    TooDeep → tooDeepAt (Checked.spanOf record)
    -- A receiver of several tails is not yet told apart from a missing
    -- field (Features.Check.Placeholder).
    Placeholder what → Left (placeholderAt (Checked.spanOf record) what)
    Unexpected what → Left (problemAt (Internal what) (Checked.spanOf record))
    FromMerge cause inner → mergedAt env state.subst (Checked.spanOf record)
      cause
      inner
      failed
    Exhausted what → Left (problemAt (Internal what) (Checked.spanOf record))
    _ → notSelected env state record label

notSelected
  ∷ ∀ r. CheckEnv r → State → Checked.Expr → FieldName → Checked (Ty Open)
notSelected env state record label = case headOf state ty of
  TRecord _ → reported (MissingField label.name) label.span
  _ → reported ExpectedRecord (Checked.spanOf record)
  where
  ty = Checked.typeOf record

  reported ∷ (TypeName → Problem) → Span → Checked (Ty Open)
  reported problem span = do
    name ← typeName env span (resolved state.subst ty)
    Left (problemAt (problem name) span)
