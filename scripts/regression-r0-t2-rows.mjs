// Tranche 2 Task 8 regression rows (the effect-row read-back; design
// §C.1-§C.2, §E, dossier §18.155 (3), (8)), for the tranche 2 registry;
// probes in test/regression-r0-t2-rows.mjs. Each restores one defect in
// a whole, compiling form.
const sites = 'src/Features/Check/Strategy/ReadBack/EffectSites.purs';
const convert = 'src/Features/Check/Strategy/ReadBack/Convert.purs';
const rows = 'src/Features/Check/Strategy/ReadBack/EffectRows.purs';
const places = 'src/Features/Check/Strategy/ReadBack/EffectPlaces.purs';

export const t2RowsRows = [
  {
    // A key met twice resolved by taking its first entry.
    name: 'r0-t2-rows-clash',
    file: sites,
    needle: '    | Array.length found > 1 = Left (Clash (named key))\n',
    replacement: '    | Array.length found > 1 = Right (Array.head found)\n',
    probe: 'r0-t2-rows-clash',
    message: /r0-t2-rows-clash: \["clash"\]/
  },
  {
    // Applied rows looked up by the Apply's span only, not its argument's.
    name: 'r0-t2-rows-applied-key',
    file: sites,
    needle: '    (Tuple (keyOf span) (keyOf (Checked.spanOf argument)))\n',
    replacement: '    (Tuple (keyOf span) (keyOf (const span argument)))\n',
    probe: 'r0-t2-rows-applied-key',
    message: /applied-key: \["applied","logged","overTwo","inExtra"\]/
  },
  {
    // A Fail label read with its live mark's term instead of N.
    name: 'r0-t2-rows-fail-n',
    file: convert,
    needle: '    FailEffect, _ → Right TermN\n',
    replacement: '    FailEffect, _ → '
      + 'note (UnmarkedLabel effect) (terms mark)\n',
    probe: 'r0-t2-rows-fail-n',
    message: /r0-t2-rows-fail-n: \["failing"\]/
  },
  {
    // Two sources that disagree resolved by taking the first reading.
    name: 'r0-t2-rows-apart',
    file: rows,
    needle: '    | otherwise = Left (Apart variable)\n',
    replacement: '    | otherwise = Right (Tuple variable first)\n',
    probe: 'r0-t2-rows-apart',
    message: /r0-t2-rows-apart: \["apart"\]/
  },
  {
    // The body root's ambient read from the checked row, whose holes
    // `recheck` does not renumber: main's entry tail leaves the numbering.
    name: 'r0-t2-rows-entry-root',
    file: places,
    needle: '  AtRoot → Right (matchRow row traced.row)\n',
    replacement: '  AtRoot → Right (matchRow row checked.row)\n',
    probe: 'r0-t2-rows-entry-root',
    message: /r0-t2-rows-entry-root: \["services"/
  },
  {
    // `finish` drops the declaration's row: the trace's row is closed.
    name: 'r0-t2-rows-entry-finish',
    file: 'src/Features/Check/Trace.purs',
    needle: '  resolved = mapTraced resolve raw { row = row }\n',
    replacement: '  resolved = mapTraced resolve raw '
      + '{ row = const raw.row row }\n',
    probe: 'r0-t2-rows-entry-finish',
    message: /r0-t2-rows-entry-finish: \[/
  },
  {
    // A variable no source reads given a closed empty row.
    name: 'r0-t2-rows-unread',
    file: rows,
    needle: '  chosen converted = maybe (Left (Unread variable)) '
      + '(agreed converted)\n',
    replacement: '  chosen converted = maybe (Right (Tuple variable '
      + '{ labels: [], tail: Array.head [] })) (agreed converted)\n',
    probe: 'r0-t2-rows-unread',
    message: /r0-t2-rows-unread: \["unread"\]/
  },
  {
    // A piped stage keyed by the pipe's own span, not its left operand's.
    name: 'r0-t2-rows-piped-key',
    file: sites,
    needle: '    (keyOf (Checked.spanOf left))\n',
    replacement: '    (keyOf (const found.span left))\n',
    probe: 'r0-t2-rows-piped-key',
    message: /r0-t2-rows-piped-key: \["piped"\]/
  },
  {
    // A Console label read with its live mark's term instead of N.
    name: 'r0-t2-rows-console-n',
    file: convert,
    needle: '    ConsoleEffect, _ → Right TermN\n',
    replacement: '    ConsoleEffect, _ → '
      + 'note (UnmarkedLabel effect) (terms mark)\n',
    probe: 'r0-t2-rows-console-n',
    message: /r0-t2-rows-console-n: \["console"\]/
  },
  {
    // A Fail label's payload dropped.
    name: 'r0-t2-rows-fail-payload',
    file: convert,
    needle: '  { effect, args: _, mark: _ } <$> traverse (convertTy terms) '
      + 'arguments\n',
    replacement: '  { effect, args: _, mark: _ } <$> traverse '
      + '(convertTy terms) (if effect == FailEffect then [] else arguments)\n',
    probe: 'r0-t2-rows-fail-payload',
    message: /r0-t2-rows-fail-payload: \["payload"\]/
  },
  {
    // An unmarked user label converted with a default term.
    name: 'r0-t2-rows-unmarked',
    file: convert,
    needle: '    UserEffect _, Unmarked → Left (UnmarkedLabel effect)\n',
    replacement: '    UserEffect _, Unmarked → Right TermN\n',
    probe: 'r0-t2-rows-unmarked',
    message: /r0-t2-rows-unmarked: \["unmarked"\]/
  }
];
