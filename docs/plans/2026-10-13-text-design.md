# Text v1: design (D001, first tranche)

Status: approved by the user section by section on 2026-10-13. This document
records that design; the user must still review it before the plan is
written. The plan has not been written and nothing is implemented. It is the
first of two specs in the tranche the user chose on 2026-10-13: Text first,
then Records (R001, PureScript-style). Numbers and collections stay in D001.

## Purpose

The goal is better examples and tests. Today a Waxwing program can compute
only with Int, Bool, Unit and user ADTs, so examples read like puzzles and
diagnostics tests cannot show realistic messages. Text v1 adds the smallest
set of text features that makes programs read naturally: literals,
interpolation, joining, comparison, printing and `show`. It also has to
carry INF001's reference scenario later. It is not D001's full text
library, which waits for STD001, a prelude decision and built-in List and
Option types.

## User decisions (2026-10-13)

1. Build text with interpolation and `++`. Interpolation accepts only
   `Text`; other values go through `show(x)`.
2. Printing: a Text on its own is written raw; a Text inside data is
   written quoted and escaped.
3. Text is Unicode. Values are sequences of Unicode scalar values stored as
   UTF-8. Source files are UTF-8 and literals may contain any Unicode.
   Identifiers stay ASCII.
4. There are no operations beyond the core: no length, indexing, split,
   join or parsing in v1.
5. Raw and multiline literals follow Swift's model: `"""` blocks strip
   indentation, and `#` delimiters make escapes and interpolation literal.
6. The error texts in §6 are approved as written.

## 1. Surface

**Type.** `Text` is a built-in ground type, like `Int` and `Bool`. Its
values are immutable sequences of Unicode scalar values.

**Ordinary literals.** An ordinary literal is written `"…"` and is a single
line.
- Escapes: `\n` `\t` `\r` `\"` `\\` `\$`, and `\u{H…}` with 1–6 hex digits
  naming a Unicode scalar value. Surrogates D800–DFFF and values above
  10FFFF are rejected.
- Any other `\x` is an error, and so is a raw line break inside the
  literal.

**Interpolation.** `${e}` inside a literal holds any expression of type
`Text`. A non-Text expression gives the ordinary `Expected Text, found <t>`
error at that expression.
- Interpolations may nest, as in `"a ${f("b ${c}")} d"`.
- `\${` is a literal `${`. A `$` not followed by `{` is literal.
- Parts are evaluated left to right, each exactly once, with their
  ordinary effects. This is FN001's evaluation order: `"${a()}${b()}"`
  performs a's effects before b's.

**Joining.** `a ++ b` requires Text on both sides and returns Text.
- It is left-associative, at the same precedence as `+`, so it binds
  tighter than comparison and looser than application.
- Mixing it with `+` without parentheses is not special-cased:
  `1 + "a"` is an ordinary type error.

**Comparison.** `== != < <= > >=` on Text compare by Unicode code point,
lexicographically. Text fields inside data take part in the structural order
of ADR 005 unchanged.

**`show(x)`.** `show` is a built-in name, like `print`. It takes one value
of any printable type and returns, as `Text`, exactly what `print(x)` would
write.
- `show` is pure.
- `show(t)` of a Text `t` is `t` itself.
- A function or handler argument gives the existing `Expected a printable
  value, found <t>` error.

**Printing.** A Text on its own is written raw. This covers `print(t)` and
a `main` that returns Text.
- A Text nested in data is written quoted, using the canonical escaping of
  §4, for example `Pair("a b", 1)` and `Some("line\nbreak")`.
- Every other printing rule is unchanged.

**Multiline blocks.** A block opens with `"""` followed by a line break and
closes with `"""` on its own line. The closing line's leading whitespace,
its *indent*, is removed from every content line.
- The indent must be an exact character-for-character prefix of each
  content line, so tabs and spaces never mix silently. A content line
  indented less than the indent is an error at that line. Blank or
  whitespace-only lines are exempt and become empty.
- The line break after the opening `"""` and the one before the closing
  `"""` are not part of the text.
- CRLF in the source becomes `\n`. Trailing spaces are kept.
- Escapes and interpolation work as in ordinary literals.

**Raw and extended delimiters.** A literal or block may be wrapped in n ≥ 1
`#`s: `#"…"#`, `##"…"##`, `#"""…"""#`.
- Inside, `\` and `${` are literal. Escapes are written `\` + n `#`s + the
  escape (`\#n`, `\##u{…}`). Interpolation is `$` + n `#`s + `{…}`
  (`$#{x}`).
- The literal ends only at `"` followed by exactly n `#`s, so `"` and `"#`
  can appear inside a `##` literal.

**Not in v1:**
- length, indexing, slicing, split, join, trim and parsing (STD001, with a
  prelude, List and Option decision);
- Char and byte-level APIs;
- Swift's trailing-`\` line continuation;
- user `Console` handlers. `print` accepts any printable value, so a
  clause has no single parameter type; the handler stays uninhabited
  (ADR 010, ruling F3) and BACKLOG D001 keeps the note.

## 2. Source and locations

- Source files are decoded as UTF-8. Invalid UTF-8 is an error at the first
  invalid byte.
- Identifiers and keywords remain ASCII. Non-ASCII characters are allowed
  only inside text literals, since Waxwing has no comments
  (docs/language.md).
- Locations keep the documented convention (docs/language.md, "half-open
  UTF-16 code-unit offsets"; line and column one based). A character
  outside the BMP therefore counts as 2 in offsets and columns. Tests pin
  this with non-ASCII text before an error.
- The lexer must iterate by code point, not by UTF-16 unit, wherever it
  classifies characters.

## 3. Compiler structure

- **Lexing.** A new module beside `Format.Lex`, which is at 216 lines,
  scans text literals.
  - It does all decoding there: escapes, delimiter counts, block
    indentation and CRLF normalization.
  - It emits one literal token. The token carries an ordered list of parts:
    decoded text chunks and interpolation holes, each hole holding the
    tokens of its expression with exact spans.
  - Every error in §6 is raised here with an exact span.
- **Parsing and resolving.** New expression forms: a text literal (a
  constant chunk), an interpolated literal (parts) and `++`. A literal
  with no holes is a plain constant.
- **Types.** `Text` is a new ground type. `Domain/Type.purs` is at the
  250-line limit, so a behaviour-preserving split comes first, as its own
  step verified by the existing suite and the differential with zero
  differences. Then the constructor is added.
- **Checking.**
  - Each hole is checked against Text.
  - `++` is checked as Text × Text → Text.
  - `show` is checked like `print`'s argument (one printable value) and
    has no effect.
  - The current row is unchanged by literals themselves.
- **Specialization.** Text is ground, so it adds no keys.
- **Long `++` chains.** They are handled iteratively, like existing binary
  operator chains, so a 20,000-operand chain checks and lowers without
  stack failure.

## 4. Go lowering and printing

- **Representation.** `Text` is a Go `string`.
- **Literals.** A literal lowers to a Go string literal with canonical
  escaping, so output is deterministic for any input text.
- **Joining.** `++` and interpolation lower to Go string `+`.
  - Parts are evaluated in source order.
  - A part whose lowering may perform an effect or abort is bound to a
    temporary in order first. This matches how existing binary operators
    keep FN001's evaluation order.
  - A pure literal part is used directly.
- **Comparison.** Go's `==` and `<` on strings, which on valid UTF-8 equal
  code-point order.
- **Printing.**
  - A Text printed alone is written as is.
  - In the existing declared-type printers (`Format.Go.Show`), a Text
    field is written quoted with Waxwing's escaping: `"` and `\` escaped,
    and `\n`, `\t`, `\r` written as escapes.
  - Other control characters, and any non-printing scalar, are written as
    `\u{…}` in lowercase hex.
  - The result is a valid Waxwing literal that reads back to the same
    text.
- **`show(v)`.** It reuses those printers: `string(waxwingShowN(nil, v))`
  for declared types, plus direct forms for Int, Bool, Unit and Text.
- **Emission.** Runtime helpers, such as the escaper, are emitted only when
  used. The five existing `bootstrap/*.go` snapshots stay byte-identical,
  and programs without Text emit today's Go.

## 5. Reference model and differential

The reference interpreter in the test tree (effects oracle) gains Text
values, literals, interpolation, `++`, comparison, printing and `show`, with
the same printing rules. The FX differential generator gains Text
expressions: interpolations with effectful parts, nested data holding Text,
and comparisons. Go output is compared with the interpreter as today.

## 6. Diagnostics (approved texts)

All of these are E_SYNTAX at the exact span:

- `Invalid UTF-8 in source`
- `Unterminated text literal`
- `Text cannot contain a line break; use \n or a """ block`
- `Unknown escape \q` (quoting the offending escape)
- `Invalid Unicode escape \u{…}` (quoting it): a surrogate, a value above
  10FFFF, no digits, or more than 6 digits
- `Unterminated interpolation`
- `""" must be followed by a line break`
- `The closing """ must be on its own line`
- `This line is indented less than the closing """`
- `Expected "#, found "` (showing the expected closing delimiter when the
  `#` counts differ)

Type errors reuse the existing texts `Expected Text, found <t>` and
`Expected a printable value, found <t>`. Any further user-facing text found
necessary during implementation needs the user's approval first.

## 7. Acceptance and evidence

Work is test-first: each behavioural test is seen failing before its code.

- **Exact-text diagnostics.** Every §6 error with code, message and span,
  including a non-BMP character before the error.
- **Execution.**
  - escapes, and Unicode round-tripping through Go;
  - interpolation order traced with Console effects;
  - `++` and comparison, including non-ASCII code-point order;
  - raw versus nested-quoted printing;
  - `show` on every printable type;
  - raw literals, delimiter counts, blocks with tab and space indents,
    CRLF sources, and blank lines.
- **Properties.**
  - For any generated text, its quoted printed form lexes back to the same
    text.
  - Generated literals, raw and block forms with random delimiter counts
    decode as a reference decoder does.
  - Comparison agrees with a reference code-point comparison.
- **Differential.** Go output agrees with the reference interpreter on the
  generated corpus.
- **Scale.** Each of these compiles without stack failure, and a bounded
  check runs in the serial phase:
  - a 1 MB literal;
  - 10,000 interpolation parts;
  - a 20,000-operand `++` chain.
- **Regression proofs.** Isolated mutants, each caught:
  - parts evaluated out of order;
  - nested Text printed raw;
  - block indentation not stripped, or stripped by count rather than by
    exact prefix;
  - `\$` interpolating;
  - a `#`-count mismatch accepted;
  - a surrogate `\u{D800}` accepted.
- **Snapshots.** `examples/text.wxw` with a byte-for-byte snapshot
  `bootstrap/text.go`. The existing snapshots are unchanged.
- **Gate.** `npm run verify` exits 0, under the usual rules: no raised
  bounds and no reruns hiding failures.

## 8. Documentation

- ADR 011 (Text).
- A Text section in docs/language.md, including the location convention
  with non-BMP characters.
- docs/architecture.md (the lexer module, Text in Type, the printing
  escaper).
- BACKLOG: D001 split, with Text done and numbers and collections
  remaining. Notes on STD001 (text operations) and on user Console
  handlers.
- The README feature list, plus progress and next-session entries.

## Risks

- **Lexer rework.** UTF-8 decoding and code-point iteration touch every
  token's span arithmetic. The tests pin non-ASCII spans, and the
  differential must show no change for existing ASCII sources.
- **File limits.** `Domain/Type.purs` must be split before Text is added,
  and `Format/Diagnostic.purs` is at 249 lines, so new texts go in a new
  module.
- **Interaction with effects.** Interpolation holes are ordinary
  expressions, so effects, `fail` and `nofail` marks flow through them
  exactly as through call arguments. Tests include an effectful hole
  inside a `defer`.
