-- T-R0b §3.3, E27 and E28: record update and removal, each operand
-- equated with a record of this node's auxiliaries (§4). Children:
-- `RecordUpdate/record`, `RecordUpdate/fields/i/value`,
-- `RecordRemoval/record`. Checked nodes as today's (Check/Record.purs
-- `checkUpdate`, Removal.purs; D1 spec §3.5, R0 Task 7.1b); E28's
-- `{ ...⟨p, rest⟩ }` is the removal's checked type, so `build` reads the
-- auxiliary `⟨p, rest⟩` (spec §12.2).
module Features.Check.Generate.Update (removal, update) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (Role(..), VarSort(..))
import Domain.Recorded.Origin (Path, RowGroup(..), RuleId(..), Step(..))
import Domain.Resolved (Expr, FieldValue)
import Domain.Syntax (Label, Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Ref(..))
import Features.Check.Generate.Fresh (auxiliary, child, childAt, childOf)
import Features.Check.Generate.Gen (Gen, GenAtom(..), Tagged, emit)
import Features.Check.Generate.Node (Generated, Ruled, fixed, flex, recordOf)
import Features.Check.Generate.Record (shape)

-- E27: per field, `eq τ_e { l: ⟨p, upd l⟩, ...⟨p, updrest l⟩ }` and
-- `eq τ_{e_l} ⟨p, upd l⟩` (B7); the result is `τ_e`.
update
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Expr
  → Array FieldValue
  → Gen s (Ruled s)
update recur context path value fields = do
  operand ← recur context (childOf path "RecordUpdate" "record") value
  generated ← sequence (Array.mapWithIndex given fields)
  updated ← traverse (fieldUpdate path operand)
    (Array.zip fields generated)
  pure
    { ty: operand.ty
    , node: fixed
        ( Checked.RecordUpdate <$> operand.expr
            <*> traverse replaced (Array.zip fields generated)
        )
    , emits: do
        emit (at context path (ExprRule 27)) (Array.concat updated)
        operand.emits
        traverse_ _.emits generated
    }
  where
  given index found = recur context
    (child (childAt path "RecordUpdate" "fields" index) [ Named "value" ])
    found.value
  replaced (Tuple found generated) = { label: found.name, value: _ }
    <$> generated.expr

fieldUpdate
  ∷ ∀ s
  . Path
  → Generated s
  → Tuple FieldValue (Generated s)
  → Gen s (Array (Tagged s))
fieldUpdate path operand (Tuple field given) = entries
  <$> auxiliary path (ExprRule 27) (Upd field.name) SortType field.span
  <*> auxiliary path (ExprRule 27) (UpdRest field.name) SortRow field.span
  where
  entries upd rest =
    [ shape RowB 7 field.span
        ( GenEqual operand.ty
            (recordOf [ Tuple field.name (flex upd) ] [ FlexRef rest ])
        )
    , shape RowB 7 field.span (GenEqual given.ty (flex upd))
    ]

-- E28: `eq τ_e { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }` (B8); the result is
-- `{ ...⟨p, rest⟩ }`. Every variable is an auxiliary.
removal
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → Array Label
  → Gen s (Ruled s)
removal recur context path span value labels = do
  operand ← recur context (childOf path "RecordRemoval" "record") value
  fields ← traverse fieldVar labels
  rest ← FlexRef <$> auxiliary path (ExprRule 28) Rest SortRow span
  pure
    { ty: recordOf [] [ rest ]
    , node: fixed (Checked.RecordRemoval <@> map _.name labels <$> operand.expr)
    , emits: do
        emit (at context path (ExprRule 28))
          [ shape RowB 8 span (GenEqual operand.ty (recordOf fields [ rest ])) ]
        operand.emits
    }
  where
  fieldVar label = Tuple label.name <<< flex
    <$> auxiliary path (ExprRule 28) (Field label.name) SortType label.span

