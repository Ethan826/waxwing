module Features.Check.Extension (Introduced, checkExtension) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), isJust, maybe, maybe')
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, NoteReason(..), Span, problemAt)
import Domain.Type (Ty(..), VarId(..))
import Domain.Type.Record (RecordRow, labels, recordRow)
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.FreshRecord (freshRest)
import Features.Check.Lacks (addLacks, lacksOf)
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)
import Features.Check.Unify as Unify

-- Where each of the enclosing signature's record row variables is
-- introduced, by name (Resolved.FunctionDecl `introduced`).
type Introduced r = (introduced ∷ Map String Span | r)

type Checked a = Either Diagnostic (Threaded a)

-- A checked item and the span of what it adds: a field's label, or the
-- spread `...e`. `given` is a field's label and type.
type Added =
  { item ∷ Checked.LiteralItem
  , span ∷ Span
  , given ∷ Maybe (Tuple String (Ty Open))
  }

-- The literal's one spread (Resolve allows no second) and its base.
type Base = { span ∷ Span, value ∷ Checked.Expr }

-- R005 design §1. Items are checked in written order, which is
-- evaluation order; then the base's type, under the substitution, must
-- hold none of the fields. The result has the base's fields and tail and
-- the literal's fields.
checkExtension
  ∷ ∀ r
  . Infer (Introduced r)
  → CheckEnv (Introduced r)
  → State
  → Span
  → Array Resolved.LiteralItem
  → Checked Checked.Expr
checkExtension infer env state span items = do
  threaded ← threadAll (literalItem infer env) state items
  base ← maybe' (noSpread span) Right (Array.findMap baseOf threaded.value)
  extended ← extend env threaded.state base threaded.value
  pure
    { value: Checked.Expr
        { ty: extended.value
        , span
        , node: Checked.RecordExtension (map itemOf threaded.value)
        }
    , state: extended.state
    }
  where
  itemOf added = added.item

literalItem
  ∷ ∀ r. Infer r → CheckEnv r → State → Resolved.LiteralItem → Checked Added
literalItem infer env state = case _ of
  Resolved.Given found → given found <$> infer env state found.value
  Resolved.Spreading at value → spread at <$> infer env state value
  where
  given found checked = checked
    { value =
        { item: Checked.Given { label: found.name, value: checked.value }
        , span: found.span
        , given: Just (Tuple found.name (Checked.typeOf checked.value))
        }
    }
  spread at checked = checked
    { value =
        { item: Checked.Spreading checked.value, span: at, given: Nothing }
    }

baseOf ∷ Added → Maybe Base
baseOf added = case added.item of
  Checked.Spreading value → Just { span: added.span, value }
  Checked.Given _ → Nothing

noSpread ∷ ∀ a. Span → Unit → Either Diagnostic a
noSpread span _ = Left
  (problemAt (Internal "Record extension without a spread") span)

-- A record base is judged; a hole base becomes `{ ...ρ }`, ρ lacking the
-- fields, and is judged as that; anything else is no record.
extend
  ∷ ∀ r
  . CheckEnv (Introduced r)
  → State
  → Base
  → Array Added
  → Checked (Ty Open)
extend env state base added = do
  bounded state ty base.span
  case resolved state.subst ty of
    TRecord row → fromRecord env state base added row
    TVar (Hole _) → fromHole unit
    other → notRecord other
  where
  ty = Checked.typeOf base.value
  fresh = freshRest state (map labelOf (fields added))
  fromHole _ = expectType env fresh.state ty fresh.record base.span
    >>= extendFrom
  extendFrom reached = extend env reached base added
  labelOf (Tuple label _) = label
  notRecord other = do
    name ← typeName env base.span other
    Left (problemAt (ExpectedRecord name) base.span)

-- No field may be one the base's row knows (the first in written order is
-- reported); a rigid tail must lack each; a hole tail is told to.
fromRecord
  ∷ ∀ r
  . CheckEnv (Introduced r)
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
  . CheckEnv (Introduced r)
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
  ∷ ∀ r a. CheckEnv (Introduced r) → VarId → Added → Either Diagnostic a
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
