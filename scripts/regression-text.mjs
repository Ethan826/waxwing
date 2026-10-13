// Text v1 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-text.mjs. Each replacement is a whole defect that
// still compiles. Go compares strings bytewise, which on valid UTF-8 is
// code-point order, so there is no Go helper that could regress to UTF-16
// order; the faithful mutant is a UTF-16 comparison in the field
// comparison, the one place Text order is generated.
export const textRows = [
  {
    // Interpolation parts evaluated right to left (design §1).
    name: 'text-order', file: 'src/Format/Go/Expression.purs',
    needle: 'interpolation codes = "(" <> joinWith " + " (orEmpty codes)'
      + ' <> ")"\n  where\n',
    replacement: 'interpolation codes\n'
      + '  | Array.null codes = "(\\"\\")"\n'
      + '  | otherwise = "func(" <> joinWith ", " (Array.reverse names)\n'
      + '      <> " string) string { return " <> joinWith " + " names\n'
      + '      <> " }(" <> joinWith ", " (Array.reverse codes) <> ")"\n'
      + '  where\n'
      + '  names = Array.mapWithIndex (\\index _ → "p" <> show index) codes\n',
    probe: 'text-order', message: /holes evaluated right to left/
  },
  {
    // A Text nested in data printed raw instead of quoted.
    name: 'text-nested-raw', file: 'src/Format/Go/Show.purs',
    needle: '  TText → "out = " <> quoteName <> "(out, " <> field <> ")\\n"',
    replacement: '  TText → "out = append(out, " <> field <> "...)\\n"',
    probe: 'text-nested-raw', message: /nested Text printed raw/
  },
  {
    // A block's indent removed by its length, not as an exact prefix.
    name: 'text-indent-count', file: 'src/Format/Lex/Block.purs',
    needle: '    (String.stripPrefix (Pattern indent)'
      + ' (run origin state.at after))',
    replacement: '    (if after - state.at >= String.length indent'
      + ' then Just "" else Nothing)',
    probe: 'text-indent-count', message: /mixed indent was accepted/
  },
  {
    // `\$` left for the next step, which then reads `${` as a hole.
    name: 'text-dollar', file: 'src/Format/Lex/Escape.purs',
    needle: "  Other 'u' → unicode origin at body\n",
    replacement: "  Other 'u' → unicode origin at body\n"
      + "  Other '$' → Right { text: \"\", next: body }\n",
    probe: 'text-dollar', message: /escaped dollar interpolated/
  },
  {
    // A closing quote with more `#`s than the literal has, accepted.
    name: 'text-hash-mismatch', file: 'src/Format/Lex/Walk.purs',
    needle: '  else mismatch origin (here state.at) quotes following\n',
    replacement: '  else closing origin state\n',
    probe: 'text-hash-mismatch', message: /hash mismatch accepted/
  },
  {
    // A surrogate scalar accepted by `\u{…}`.
    name: 'text-surrogate', file: 'src/Format/Lex/Escape.purs',
    needle: '  else if number >= firstSurrogate && number <= lastSurrogate'
      + ' then Nothing\n',
    replacement: '  else if false then Nothing\n',
    probe: 'text-surrogate', message: /surrogate escape accepted/
  },
  {
    // The field comparison orders Text by UTF-16 code units, as JavaScript
    // does: U+1F600 (D83D DE00) then sorts before U+FFFD.
    name: 'text-utf16-order', file: 'src/Format/Go/Compare.purs',
    needle: '  TText → "if " <> left <> " < " <> right <> " { return -1 };'
      + ' if " <> left\n    <> " > "\n    <> right\n'
      + '    <> " { return 1 }\\n"\n',
    replacement: '  TText → "if c := func(a, b string) int {'
      + ' x, y := []rune(a), []rune(b); "\n'
      + '    <> "u := func(r rune) rune { if r >= 0x10000 {'
      + ' return 0xD7C0 + r>>10 }; "\n'
      + '    <> "return r }; for i := 0; i < len(x) && i < len(y); i++ { "\n'
      + '    <> "if u(x[i]) != u(y[i]) { if u(x[i]) < u(y[i]) {'
      + ' return -1 }; "\n'
      + '    <> "return 1 }; if x[i] != y[i] { if x[i] < y[i] {'
      + ' return -1 }; "\n'
      + '    <> "return 1 } }; if len(x) < len(y) { return -1 }; "\n'
      + '    <> "if len(x) > len(y) { return 1 }; return 0 }(" <> left'
      + ' <> ", " <> right\n'
      + '    <> "); c != 0 { return c }\\n"\n',
    probe: 'text-utf16-order', message: /UTF-16 order/
  }
];
