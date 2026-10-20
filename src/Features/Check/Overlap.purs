module Features.Check.Overlap (Added, Base, fields, fromRecord) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe, isJust, maybe, maybe')
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Syntax (Diagnostic, NoteReason(..), Span)
import Domain.Type (Ty(..), VarId(..))
import Domain.Type.Record (RecordRow, labels, recordRow)
import Features.Check.Context (CheckEnv)
import Features.Check.Lacks (addLacks, lacksOf)
import Features.Check.Scheme (State, Threaded)
import Features.Check.Unify as Unify

-- The one-spread literal's check against its base's record row (R005
-- design §1, Tranche A): which item a known field repeats, and what each
-- tail must lack. A module of its own so that Features.Check.Extension
-- stays under the file budget (R005 Tranche B Task 7).

type Checked a = Either Diagnostic (Threaded a)

-- A checked item and the span of what it adds: a field's label, or the
-- spread `...e`. `given` is a field's label and type.
type Added =
  { item ∷ Checked.LiteralItem
  , span ∷ Span
  , given ∷ Maybe (Tuple String (Ty Open))
  }

-- The literal's spread and its value.
type Base = { span ∷ Span, value ∷ Checked.Expr }

-- No field may be one the base's row knows (the first in written order is
-- reported); a rigid tail must lack each; a hole tail is told to.
fromRecord
  ∷ ∀ r
  . CheckEnv r
  → State
  → Base
  → Array Added
  → RecordRow (Ty Open) Open
  → Checked (Ty Open)
fromRecord env state base added row =
  maybe' fitting (overlap base) (Array.find known withLabels)
  where
  withLabels = Array.filter hasLabel added
  hasLabel item = isJust item.given
  known item = maybe false held item.given
  held (Tuple label _) = Array.elem label (labels row)
  fitting _ = map typed (foldM (ofTail env withLabels) state row.tails)
  typed reached =
    { value: TRecord (recordRow (row.fields <> fields added) row.tails)
    , state: reached
    }

-- A field the base already has is the earlier and the later item of the
-- two, in written order (design §5).
overlap ∷ ∀ a. Base → Added → Either Diagnostic a
overlap base item = Left
  { problem: Duplicate DuplicateField (maybe "" fieldLabel item.given)
  , span: later
  , related: [ { span: earlier, reason: FirstWrittenHere } ]
  }
  where
  fieldLabel (Tuple label _) = label
  baseFirst = base.span.start.offset < item.span.start.offset
  earlier = if baseFirst then base.span else item.span
  later = if baseFirst then item.span else base.span

ofTail
  ∷ ∀ r
  . CheckEnv r
  → Array Added
  → State
  → Open
  → Either Diagnostic State
ofTail env added state = case _ of
  Hole meta → Right state
    { subst = addLacks (Unify.Meta meta) (Set.fromFoldable named)
        state.subst
    }
  Rigid variable → maybe (Right state) (mayHave env variable)
    (Array.find (unlacked variable) added)
  where
  named = map labelOf (fields added)
  labelOf (Tuple label _) = label
  unlacked variable item = maybe false (absent variable) item.given
  absent variable (Tuple label _) = not
    (Set.member label (lacksOf state.subst (Unify.Rigid variable)))

-- `r may already have field a` at the label, noted at the signature's
-- first `...r`, as Resolve reports a body type's label (ADR 013).
mayHave
  ∷ ∀ r a. CheckEnv r → VarId → Added → Either Diagnostic a
mayHave env (VarId index) item = Left
  { problem: RowMayHaveField name (maybe "" fieldLabel item.given)
  , span: item.span
  , related: maybe [] introducedAt (Map.lookup name env.introduced)
  }
  where
  name = maybe "" identity (Array.index env.variables index)
  fieldLabel (Tuple label _) = label
  introducedAt span = [ { span, reason: IntroducedHere name } ]

fields ∷ Array Added → Array (Tuple String (Ty Open))
fields added = Array.mapMaybe givenOf added
  where
  givenOf item = item.given
