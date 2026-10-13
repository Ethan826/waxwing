module Format.Go.TextShow (quoteName, quoteHelper, holdsText) where

import Prelude
import Data.Array as Array
import Domain.IR.Internal (Ty(..))
import Format.Go.Layout (Layout)

quoteName ∷ String
quoteName = "waxwingQuoteText"

-- Whether a declared type has a Text field, the only place the quoting
-- printer is called from. Every other program emits no helper, so its Go is
-- unchanged.
holdsText ∷ Layout → Boolean
holdsText program = Array.any declaredHolds program.types
  where
  declaredHolds declared = Array.any memberHolds declared.members
  memberHolds member = Array.any (_ == TText) member.ctor.fields

-- The canonical quoting of a nested Text (design §4), a valid Waxwing
-- literal that reads back to the same text: `"` `\` and the three line
-- escapes by name, `$` before `{` as `\$` so no `${` survives, the fixed
-- set of controls (Cc, U+2028-2029 and the bidi controls) as `\u{…}` in
-- lowercase hex, and everything else as is. The set does not depend on any
-- Unicode table. The input is valid UTF-8, so `range` yields every scalar
-- whole.
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
    <> "case r < 0x20 || (r >= 0x7f && r <= 0x9f) || r == 0x2028 ||\n"
    <> "r == 0x2029 || (r >= 0x202a && r <= 0x202e) ||\n"
    <> "(r >= 0x2066 && r <= 0x2069):\n"
    <> "out = fmt.Appendf(out, \"\\\\u{%x}\", r)\n"
    <> "default:\nout = append(out, string(r)...)\n"
    <> "}\n}\n"
    <> "return append(out, '\"')\n}\n\n"
