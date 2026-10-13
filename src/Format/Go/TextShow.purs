module Format.Go.TextShow (quoteName, quoteHelper, holdsText) where

import Prelude
import Data.Array as Array
import Domain.IR.Internal (Ty(..))
import Format.Go.Layout (Layout)

quoteName ∷ String
quoteName = "waxwingQuoteText"

-- Whether a declared type has a Text field, the only place the quoting
-- printer is called from. Every other program emits no helper (and no
-- unicode import), so its Go is unchanged.
holdsText ∷ Layout → Boolean
holdsText program = Array.any declaredHolds program.types
  where
  declaredHolds declared = Array.any memberHolds declared.members
  memberHolds member = Array.any (_ == TText) member.ctor.fields

-- The canonical quoting of a nested Text (design §4), a valid Waxwing
-- literal that reads back to the same text: `"` `\` and the three line
-- escapes by name, `$` before `{` as `\$` so no `${` survives, other
-- non-printing scalars as `\u{…}` in lowercase hex, and everything else as
-- is. The input is valid UTF-8, so `range` yields every scalar whole.
quoteHelper ∷ String
quoteHelper =
  "func " <> quoteName <> "(out []byte, s string) []byte {\n"
    <> "out = append(out, '\"')\n"
    <> "for i, r := range s {\n"
    <> "switch {\n"
    <> "case r == '\"':\nout = append(out, \"\\\\\\\"\"...)\n"
    <> "case r == '\\\\':\nout = append(out, \"\\\\\\\\\"...)\n"
    <> "case r == '\\n':\nout = append(out, \"\\\\n\"...)\n"
    <> "case r == '\\t':\nout = append(out, \"\\\\t\"...)\n"
    <> "case r == '\\r':\nout = append(out, \"\\\\r\"...)\n"
    <> "case r == '$' && i+1 < len(s) && s[i+1] == '{':\n"
    <> "out = append(out, \"\\\\$\"...)\n"
    <> "case unicode.IsPrint(r):\nout = append(out, string(r)...)\n"
    <> "default:\nout = fmt.Appendf(out, \"\\\\u{%x}\", r)\n"
    <> "}\n}\n"
    <> "return append(out, '\"')\n}\n\n"
