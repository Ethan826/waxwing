// A2 arity regression rows (dossier §18.148 (1); docs/plans/
// 2026-11-01-a2-arity-metadata.md), spread into a2Rows
// (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-arity.mjs. Each restores one defect in a whole,
// compiling form.
const effects = 'src/Features/Check/Strategy/Effects';
const arity = `${effects}/Arity.purs`;
const record = `${effects}/Record.purs`;
const lookup = 'src/Features/Check/Generate/Lookup.purs';

export const a2ArityRows = [
  {
    // I3's check (k) dropped: an undeclared or miscounted application in
    // a package image, an unused binding's included, passes I3.
    name: 'r0-a2-arity-image',
    file: `${effects}/Malformed.purs`,
    needle: '    , keylessFailIn\n    , arityIn\n    ]\n',
    replacement: '    , keylessFailIn\n    ]\n',
    probe: 'r0-a2-arity-image',
    message: /arity-image: \[\["undeclared effect, unused binding",null\]/
  },
  {
    // A clause row's labels accepted at any count, not only bare.
    name: 'r0-a2-arity-bare-lax',
    file: arity,
    needle: '    || (application.bare && application.given == '
      + '{ types: 0, rows: 0 })\n',
    replacement: '    || application.bare\n',
    probe: 'r0-a2-arity-bare-lax',
    message: /r0-a2-arity-bare-lax: \[\["bare C: wrong count",null\]\]/
  },
  {
    // Every row read as a clause row, so a bare label passes in R.
    name: 'r0-a2-arity-bare-everywhere',
    file: `${effects}/MalformedTerms.purs`,
    needle: 'rowParts row = rowWith false row\n',
    replacement: 'rowParts row = rowWith true row\n',
    probe: 'r0-a2-arity-bare-everywhere',
    message: /bare-everywhere: \[\["Cell without its argument",null\]/
  },
  {
    // Record check 5 never judges an entry.
    name: 'r0-a2-arity-record',
    file: record,
    needle: '    , applicationsWrong scope.declared entry.refs\n',
    replacement: '    , applicationsWrong Nothing entry.refs\n',
    probe: 'r0-a2-arity-record',
    message: /r0-a2-arity-record: \[\["Cell declared with two",null\]/
  },
  {
    // The data arities not compared with `holders.declared`.
    name: 'r0-a2-arity-holders',
    file: arity,
    needle: '    && Map.keys declarations.types == declared\n',
    replacement: '    && Map.size declarations.types >= 0\n',
    probe: 'r0-a2-arity-holders',
    message: new RegExp('arity-holders: \\[\\["a data type not in '
      + 'holders",null\\],\\["a declared data type dropped",null\\]\\]')
  },
  {
    // The built-ins' recorded counts unchecked.
    name: 'r0-a2-arity-builtins',
    file: arity,
    needle: '  builtinRecorded found = Map.lookup found.ref'
      + ' declarations.effects\n'
      + '    == Just (length found.parameters)\n',
    replacement: '  builtinRecorded found = length found.parameters >= 0\n',
    probe: 'r0-a2-arity-builtins',
    message: /r0-a2-arity-builtins: \[\["Fail declared with two",null\]/
  },
  {
    // A negative count accepted.
    name: 'r0-a2-arity-sign',
    file: arity,
    needle: 'nonNegative count = count >= 0\n',
    replacement: 'nonNegative count = count >= count\n',
    probe: 'r0-a2-arity-sign',
    message: /r0-a2-arity-sign: \[\["a negative count",null\]\]/
  },
  {
    // Entries judged against invalid arities, so the entry is blamed.
    name: 'r0-a2-arity-blame',
    file: record,
    needle: '  , declared: validArities problem\n',
    replacement: '  , declared: Just recorded.effects.declarations\n',
    probe: 'r0-a2-arity-blame',
    message: new RegExp('arity-blame: \\[\\["Fail with two, a Fail label '
      + 'recorded","check 5 appended"\\]\\]')
  },
  {
    // Generation records no effect-row parameter of a data type.
    name: 'r0-a2-arity-generated-rows',
    file: lookup,
    needle: '    , rows: Array.length info.rowParameters\n',
    replacement: '    , rows: 0\n',
    probe: 'r0-a2-arity-generated-rows',
    message: /generated-rows: \["types \[\[0,\{\\"types\\":1,\\"rows\\":0\}/
  },
  {
    // Generation records one built-in only.
    name: 'r0-a2-arity-generated-builtins',
    file: lookup,
    needle: 'map builtin builtinEffects',
    replacement: 'map builtin (Array.take 1 builtinEffects)',
    probe: 'r0-a2-arity-generated-builtins',
    message: /generated-builtins: \["effects .*\[\\"ConsoleEffect\\",0\]\]"\]/
  },
  {
    // Ruling 3: data compared over a common prefix of arguments.
    name: 'r0-a2-arity-equal-prefix',
    file: `${effects}/Equal.purs`,
    needle: '  length arguments == length arguments\' && length rows'
      + ' == length rows\'\n',
    replacement: '  length arguments >= 0 && length arguments\' >= 0'
      + ' && length rows >= 0 && length rows\' >= 0\n',
    probe: 'r0-a2-arity-equal-prefix',
    message: /r0-a2-arity-equal-prefix: \["data arguments","data rows"\]/
  },
  {
    // Ruling 3: handler labels' heads compared without their counts.
    name: 'r0-a2-arity-handler-head',
    file: `${effects}/Handler.purs`,
    needle: '    && length left.args == length right.args\n',
    replacement: '    && length left.args >= 0 && length right.args >= 0\n',
    probe: 'r0-a2-arity-handler-head',
    message: /r0-a2-arity-handler-head: \["handler labels"\]/
  },
  {
    // Ruling 3: a row's same-key labels zipped over a common prefix.
    name: 'r0-a2-arity-row-prefix',
    file: `${effects}/Handler.purs`,
    needle: '  | length lefts == length rights = sequenced'
      + ' (zipWith same lefts rights)\n',
    replacement:
      '  | length lefts >= 0 = sequenced (zipWith same lefts rights)\n',
    probe: 'r0-a2-arity-row-prefix',
    message: /r0-a2-arity-row-prefix: \["row labels"\]/
  },
  {
    // Ruling 3: consumed labels' arguments zipped over a common prefix.
    name: 'r0-a2-arity-consume-prefix',
    file: `${effects}/Consume.purs`,
    needle: '  length lefts == length rights && all identity'
      + ' (zipWith same lefts rights)\n',
    replacement: '  all identity (zipWith same lefts rights)\n',
    probe: 'r0-a2-arity-consume-prefix',
    message: /r0-a2-arity-consume-prefix: \["consumed labels"\]/
  }
];
