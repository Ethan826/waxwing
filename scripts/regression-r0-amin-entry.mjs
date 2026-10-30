// R0 a-min regression row for main's inferable top-level tail (§18.124
// ruling 2), spread into r0AminRows (scripts/regression-r0-amin.mjs);
// probe in test/regression-r0-amin-entry.mjs. The defect is restored in
// a compiling form: the open tail is left rigid in the ambient row and
// in `Entry`.
export const entryRows = [
  {
    name: 'r0-amin-entry-tail',
    file: 'src/Features/Check/Generate/Body.purs',
    needle: '      row { tail = Just inferred } <$ effected'
      + ' [ MintedVar inferred ]\n',
    replacement: '      pure (row { tail = const row.tail inferred })\n',
    probe: 'r0-amin-entry-tail',
    message: /main's ambient row and Entry keep a rigid tail/
  }
];
