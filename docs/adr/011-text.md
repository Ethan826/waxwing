# ADR 011: Text, literals, interpolation and `show`

Implemented on branch `text` 2026-10-13 (plan Tasks 1-9), whole-branch
review done (with fixes); merged into main 2026-10-13. Binding spec:
docs/plans/2026-10-13-text-design.md, with its plan-time amendments and its
"as built" notes; plan docs/plans/2026-10-13-text-plan.md; evidence
docs/progress.md ("Text v1"). Builds on ADR 005 (structural order), ADR 006
(nesting limit), ADR 008 (evaluation order) and ADR 010 (effects). This is
the first tranche of BACKLOG D001; numbers and collections stay open.

## Context

A program could compute only with Int, Bool, Unit and user ADTs, so
examples read like puzzles and diagnostics could not show realistic
messages. Text v1 adds the smallest set that makes programs read naturally:
literals, interpolation, joining, comparison, printing and `show`. It is not
a text library (BACKLOG STD001).

## Decision

### A built-in type, with no special syntax

`Text` is a ground type and a reserved type name, like `Int` and `Bool`. The
user's principle, applied throughout, is that a built-in gets no special
syntax: `++` is an ordinary left-associative operator typed Text x Text ->
Text at the precedence of `+`; `show` is a built-in name used as a call,
exactly like `print`; there is no format string, template tag or printing
form beyond the literal and `${…}`. Text has no operations beyond the core
(no length, indexing, split, join, trim or parsing).

### Values and source

Values are immutable sequences of Unicode scalar values. Source files are
UTF-8, and literals may hold any Unicode; identifiers and keywords stay
ASCII. Invalid UTF-8 is an error at the first invalid byte, found by the
Runtime read (amendment 4): Runtime.Node reads bytes with a fatal UTF-8
decoder, because Node's `readFileSync(path, 'utf8')` would replace them
silently. Program.Compile still receives a decoded `String`. The read path
returns `ReadFailure = Unreadable HostFailure | InvalidUtf8 Position`, a
separate type, so `HostFailure` and its wire form keep their shape and no
unreachable wrong-shape fallback exists (Task 7 review). A byte order mark
is kept as U+FEFF and rejected by the lexer as before.

Locations keep the documented convention: half-open UTF-16 code-unit
offsets, so a character outside the BMP counts 2. A non-ASCII character
outside a literal stays E_LEX `Unexpected character`, but its span now
covers the whole code point (amendment 5, the only intended change to an
existing diagnostic).

### Token model

A literal is a flat token stream, not a nested tree: `TextOpen`, then
`TextChunk` (decoded text) and holes (`HoleOpen`, the hole's ordinary
tokens, `HoleClose`) in source order, then `TextClose`. Tokens gained a
`kind` (`Plain` for everything else). All decoding is done in the lexer:
escapes, delimiter counts, block indentation, CRLF. The scanner keeps an
explicit stack of open literals and holes, so nesting uses no host
recursion. The parser assembles the literal from kinds, not from token
text: a literal with no holes is a plain constant, and one with holes is an
`Interpolate` node with a list of parts, not nested `++` (so 10,000 parts
are flat). Token texts stay `"`, `${`, `"` for raw, extended and block forms
so the parser's text dispatch is unchanged; spans cover the whole delimiter.

As built, the lexer walks UTF-16 code units rather than code points. Every
character it classifies (`"`, `\`, `$`, `{`, `}`, `#`, CR, LF, hex digits) is
ASCII and no surrogate unit is ASCII, so it only slices at ASCII boundaries
and a surrogate pair is never split. Wherever it quotes the character after
a backslash it takes one whole code point. This replaces the spec's
"iterates by code point", with identical spans (Task 2).

### Literals

The surface is spec §1: the ordinary escapes `\n \t \r \" \\ \$` and
`\u{H…}` (1 to 6 hex digits; surrogates and values above 10FFFF rejected),
raw and extended delimiters with `n` `#`s, `"""` blocks that strip the
closing line's indent as an exact character prefix, and `${e}` holes whose
expression has type Text. A non-Text hole is the ordinary `Expected Text,
found <t>`. Parts are evaluated left to right, each once, with their
ordinary effects.

Decisions made while building, none adding user-facing text beyond spec §6:
- **Escape boundaries.** `\u` not followed by `{` is `Unknown escape \u`;
  a malformed `\u{…` ends before the first character that is neither a hex
  digit nor `}`, and the error quotes that prefix.
- **`"""` always opens a block** (maximal munch). A one-line literal whose
  text begins with `""` writes its first quote as `\"` (`\#"` when raw);
  `#"\#"""x"#` is `"""x`. Task 8's generator found this.
- **Termination generalised.** For `n` `#`s, a quote followed by exactly `n`
  closes, by fewer is text, by more is `Expected "##, found "###`. A line
  literal running out of line, or a block out of file, reports its last quote
  and its `#`s the same way (`Expected "#, found "` for `#"x"`; for a block
  `Expected """#, found """`), or `Unterminated text literal` when there is no
  quote. A raw literal running out inside a hole is that hole's
  `Unterminated interpolation`.
- **Lone CR.** In a literal it is the line-break error; in a block its span
  runs from the opening delimiter to the CR, possibly across lines. Only LF
  or CRLF ends a `#` line literal. A backslash before a line break in a block
  is `Unknown escape \` (spanning the backslash and its `#`s). `"""` at end of
  file is `Unterminated text literal`.
- **Dedent ordering.** The indent is known only at the closing line, so a
  closed block's own chunks are rescanned with it (Format.Lex.Dedent); any
  error from the first scan wins over an under-indent error.
- **Holes and nesting.** A hole's expression goes through the parser's
  `nested`, so holes share the nesting budget (ADR 006); the lexer also
  stops at 128 open holes with E_NESTING at the 129th `${` (two units). A
  literal itself does not nest, so any number of holes side by side compile.
  `++` counts like `+`: the spec asked for a 20,000-operand chain, but the
  128-level limit also bounds flat operator chains (amendment 1), so 129
  operands compile and 130 give E_NESTING; BACKLOG O001 would lift both.
  `++` needed the parser's `chainLeft1` generalised to `chainLeftAny`, which
  tags each operand with the operator before it.
- **Boundaries of a hole** are counted over tokens, so a nested literal is
  one whole token. A hole may span lines inside a block, and also when a
  `"""` block is nested in a one-line literal's hole: `"a ${ """` then
  an indented `inner` line and a closing `"""` line `} b"` prints `a inner b`.
- **Gate allowance.** The pure layers may import exactly Data.Enum
  (`toEnum`/`fromEnum` between Int and CodePoint); `enums` was already in
  the build through `strings`, so no new code entered, and the structure
  gate pins that Data.Char and Data.Enum.* stay rejected.

### Go lowering, order and joining

`Text` is a Go `string`. A literal lowers to a Go string literal with
canonical escaping (printable ASCII as is, the five named escapes, every
other scalar as `\uXXXX` or `\UXXXXXXXX`), so output is deterministic and the
generated file stays ASCII. `++` and interpolation lower to Go `+`. No
temporaries are needed (amendment 2): Go evaluates the operands of `+` left
to right, binary operators already rely on this (ADR 008), and Waxwing
values are immutable. Runtime helpers are emitted only when used, so
programs without Text emit today's Go, and the six existing snapshots are
byte-identical (amendment 3; examples/text.wxw adds bootstrap/text.go).

### Code-point order

`== != < <= > >=` compare Text by Unicode code point, lexicographically,
never by UTF-16 unit: U+1F600 sorts after U+FFFD. Go's `==` and `<` on
strings are bytewise, which on valid UTF-8 equals code-point order, so the
comparison needs no helper and a Text field takes part in ADR 005's
structural order unchanged. The reference interpreter compares with
`codePointAt`, never JavaScript's native `<`, and a test pins the pair
U+1F600 / U+FFFD in both. The Runtime UTF-8 check is what makes the premise
(valid UTF-8) true.

### Printing and canonical escaping

A Text printed alone is written raw; a Text nested in data is written
quoted with the canonical escaping, a valid Waxwing literal that reads back
to the same text: `"` `\` `\n` `\t` `\r` by name, `\$` before `{` (a `$` not
followed by `{` stays), and `\u{…}` in lowercase hex for the **escape set**:
the controls U+0000 to U+001F and U+007F to U+009F (apart from the three
named), U+2028, U+2029, and the bidi controls U+202A to U+202E and U+2066 to
U+2069. Every other scalar is written as is.

The set is fixed code points rather than Go's `unicode.IsPrint` (the first
implementation, replaced on review) for three reasons: output must not
change with Go's Unicode tables across toolchains, the JavaScript reference
must match exactly without matching Go's tables, and the bidi controls are
included because of the Trojan Source attack. The cost is that other
invisible scalars, such as U+200B and the BOM, print raw inside quotes. The
printer is `waxwingQuoteText` (Format.Go.TextShow), emitted only when a
declared type has a Text field.

### `show` is a compiler-provided built-in until C001

`show(x)` takes one printable value (everything but functions and
handlers), is pure, and returns as Text exactly what `print(x)` would write,
without the final LF. It reuses the existing printers (`string(waxwingShowN(
nil, v))` for declared types; direct forms for Int, Bool, Unit, Text);
`show(t)` of a Text is `t` itself. It is not a type class.

**The explicit gap:** Waxwing has no classes, so `show`, like `print` and the
comparison operators, is a built-in over every printable type with a fixed
format that users cannot customise. When C001 lands, `show` and `print` are
expected to become a Show-style class with derived instances; that is a
planned migration this ADR does not decide.

As built, a bare `show` (used as a value) is a monomorphic lambda with a
fresh **open** effect row, as `crash` has, not `print`'s `Console` row and
not a closed empty row: a closed empty row was rejected where an effectful
arrow is expected, and `Console` would be misleading for a pure function.

### The Text key in `Fail`

`Fail` is keyed by the head of its payload (ADR 010). Text becomes a head,
and `Fail(Text)` is accepted (it was "Fail needs a concrete error family").
Its runtime key is `math.MinInt32` (-2147483648), `textFailKey` in
Format.Go.Context, outside all existing ranges: Int -1, Bool -2, Unit -3,
data -4 minus its id. No existing key moved, which the differential showed
(the Int Fail program was identical) and a layout test pins. Go's key type
`int` is at least 32 bits.

### Reference model and differential

The effects oracle gained Text values, literals, holes, `++`, comparison,
printing and `show` with the same rules, and an independent decoder, quoter
and code-point comparison (test/text-reference.mjs). The FX differential
generator gained a Text frame: effectful holes, nested data, comparisons,
raw and block forms. Go output agrees with the interpreter on every seed
tried. No compiler defect was found by it.

## Consequences and limits

- User `Console` handlers are still uninhabited (ADR 010, ruling F3): `print`
  accepts any printable value, so a clause has no single parameter type.
- No operations on Text exist (BACKLOG STD001); comments do not exist (a
  separate design); a trailing-`\` line continuation is not supported.
- A flat chain of 130 `++` operands is E_NESTING until O001.
- Invisible scalars outside the escape set print raw inside quotes.
- Evidence and gates are in docs/progress.md ("Text v1"). Isolated-copy
  regression rows: `text-order`, `text-nested-raw`, `text-indent-count`,
  `text-dollar`, `text-hash-mismatch`, `text-surrogate`, `text-utf16-order`
  (scripts/regression-text.mjs). Scale bounds: test/text-scale.serial.test.mjs.
