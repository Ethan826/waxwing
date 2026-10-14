module Format.Go.RecordHelpers (RecordHelpers, recordHelpers) where

import Prelude
import Data.Array as Array
import Data.Set as Set
import Data.String.Common (joinWith)
import Data.Tuple (Tuple(..), snd)
import Domain.IR.Internal as IR
import Domain.IR.Internal (LayoutId(..), Ty(..))
import Format.Go.Compare (fieldComparison)
import Format.Go.Data (fieldType)
import Format.Go.RecordNames
  ( compareRecordName
  , recordField
  , recordName
  , showRecordName
  )
import Format.Go.RecordUse (recordUse)
import Format.Go.Show (appendText, showValue)

-- The Go of the program's record layouts (R001 design §5): one struct per
-- layout, and the compare and show helpers the program uses, in layout
-- order. `bool`, `fmt` and `quote` say whether those helpers call
-- waxwingCmpBool, fmt.Append and the quoting printer. A program without
-- records emits nothing here.
type RecordHelpers =
  { structs ∷ String
  , compares ∷ String
  , shows ∷ String
  , bool ∷ Boolean
  , fmt ∷ Boolean
  , quote ∷ Boolean
  }

type Layout = { id ∷ LayoutId, fields ∷ Array (Tuple String Ty) }

recordHelpers ∷ IR.Program → RecordHelpers
recordHelpers program'@(IR.Program program) =
  { structs: joinWith "" (map struct layouts)
  , compares: joinWith "" (map compareHelper compared)
  , shows: joinWith "" (map showHelper shown)
  , bool: Array.any (holds isBool) compared
  , fmt: Array.any (holds formatted) shown
  , quote: Array.any (holds isText) shown
  }
  where
  layouts = Array.mapWithIndex layout program.records
  layout number info = { id: LayoutId number, fields: info.fields }
  use = recordUse program'
  compared = Array.filter (member use.compared) layouts
  shown = Array.filter (member use.shown) layouts
  member used found = Set.member (index found.id) used
  index (LayoutId number) = number
  holds test found = Array.any (test <<< snd) found.fields

-- Fields in sorted label order; a field of declared type is a pointer, as
-- a constructor's is, so a type may hold itself through a record.
struct ∷ Layout → String
struct found = "type " <> recordName found.id <> " struct {\n"
  <> joinWith "" (map line found.fields)
  <> "}\n\n"
  where
  line (Tuple label ty) = recordField label <> " " <> fieldType ty <> "\n"

-- Fields compare in sorted label order; the first nonzero result decides.
compareHelper ∷ Layout → String
compareHelper found =
  "func " <> compareRecordName found.id <> "(a " <> name <> ", b " <> name
    <> ") int {\n"
    <> joinWith "" (map field found.fields)
    <> "return 0\n}\n\n"
  where
  name = recordName found.id
  field (Tuple label ty) = fieldComparison (recordField label) ty

-- `{ age: 36, name: "Ada" }`: sorted labels, each value nested.
showHelper ∷ Layout → String
showHelper found =
  "func " <> showRecordName found.id <> "(out []byte, v "
    <> recordName found.id
    <> ") []byte {\n"
    <> body
    <> "}\n\n"
  where
  body
    | Array.null found.fields = "return " <> appendText "{}"
    | otherwise = joinWith "" (Array.mapWithIndex field found.fields)
        <> "return "
        <> appendText " }"
  field position (Tuple label ty) = "out = "
    <> appendText ((if position == 0 then "{ " else ", ") <> label <> ": ")
    <> showValue ("v." <> recordField label) ty

isBool ∷ Ty → Boolean
isBool = eq TBool

isText ∷ Ty → Boolean
isText = eq TText

-- Printed with fmt.Append (Format.Go.Show).
formatted ∷ Ty → Boolean
formatted ty = ty == TInt || ty == TBool
