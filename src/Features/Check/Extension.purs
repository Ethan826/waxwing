module Features.Check.Extension (checkExtension) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.FreshRecord (freshRest)
import Features.Check.MergeLiteral (mergeLiteral)
import Features.Check.Overlap (Added, Base, fields, fromRecord)
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)

type Checked a = Either Diagnostic (Threaded a)

-- R005 design §1. Items are checked in written order, which is
-- evaluation order; then the base's type, under the substitution, must
-- hold none of the fields. The result has the base's fields and tail and
-- the literal's fields. A literal of two or more spreads is Tranche B's
-- (Features.Check.MergeLiteral, Task 7); one of a single spread keeps
-- Tranche A's rules unchanged.
checkExtension
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Array Resolved.LiteralItem
  → Checked Checked.Expr
checkExtension infer env state span items = do
  threaded ← threadAll (literalItem infer env) state items
  extended ←
    if Array.length (Array.mapMaybe baseOf threaded.value) > 1 then
      mergeLiteral env threaded.state span threaded.value
    else single threaded
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
  single threaded = do
    base ← maybe' (noSpread span) Right (Array.findMap baseOf threaded.value)
    extend env threaded.state base threaded.value

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
  . CheckEnv r
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

