// R004 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r004.mjs. Each restores one defect in a whole,
// compiling form.
export const r004Rows = [
  {
    // The check for unlisted fields never finds one, so a pattern that
    // omits a field and does not end with `...` is accepted.
    name: 'r004-missing-field', file: 'src/Features/Check/PatternRow.purs',
    needle: '  (Array.find unlisted (labels known.row))\n',
    replacement: '  (Array.find unlisted [])\n',
    probe: 'r004-missing-field',
    message: /missing field accepted: 0\n/
  },
  {
    // An unknown label is reported at its field's pattern, not at the
    // label the user wrote.
    name: 'r004-label-span',
    file: 'src/Features/Resolve/RecordPattern.purs',
    needle: '{ label: field.label, span: field.span, pattern: '
      + 'resolution.pattern }',
    replacement: '{ label: field.label, span: Syntax.patternSpan '
      + 'field.pattern, pattern: resolution.pattern }',
    probe: 'r004-label-span',
    message: /label span lost: E_TYPE zz is not a field of \{ a: Int \} @1\n/
  },
  {
    // A record pattern is not widened to its type's labels: it keeps only
    // the fields written, so its row has fewer columns than another's.
    name: 'r004-widening', file: 'src/Features/Check/Matrix.purs',
    needle: '  TRecord row → Headed (recordHead row) (map (fieldAt <<< fst)',
    replacement: '  TRecord row | false → Headed (recordHead row) (map '
      + '(fieldAt <<< fst)',
    probe: 'r004-widening',
    message: /widening lost: E_INTERNAL Coverage field count mismatch/
  },
  {
    // Settlement does not retype a record pattern's field patterns, so a
    // constructor pattern inside a field keeps an unsolved hole type.
    name: 'r004-walk-binders', file: 'src/Features/Check/Walk.purs',
    needle: '  field found = found { pattern = retypePattern change '
      + 'found.pattern }\n',
    replacement: '  field found = found { pattern = found.pattern }\n',
    probe: 'r004-walk-binders',
    message: /record fields skipped: E_INTERNAL Invalid constructor id/
  },
  {
    // A record field is read as Int again, so a record holding an
    // uninhabited type is inhabited and `Some(Wrap)` needs a pattern.
    name: 'r004-inhabitation', file: 'src/Features/Check/Expand.purs',
    needle: '  TRecord row → Array.concat <$> traverse (field numbers <<< snd) '
      + 'row.fields\n',
    replacement: '  TRecord _ → Right [ TInt ]\n',
    probe: 'r004-inhabitation',
    message: /record read as Int: E_NON_EXHAUSTIVE Missing pattern: Some\(_\)/
  },
  {
    // The lowered conditions test no record field, so the first record
    // arm always matches.
    name: 'r004-go-fields', file: 'src/Format/Go/Match.purs',
    needle: '  IR.Record fields _ → guarded (Array.concatMap named fields)',
    replacement: '  IR.Record fields _ → guarded (Array.concatMap named '
      + '(Array.take 0 fields))',
    probe: 'r004-go-fields',
    message: /record fields ignored: admin Bo\n/
  },
  {
    // A hole tail is never extended, so a later arm naming a field the
    // earlier arms did not is an unknown field.
    name: 'r004-hole-tail', file: 'src/Features/Check/PatternRow.purs',
    needle: '    Hole _ → not (Array.null (unknown row written))\n',
    replacement: '    Hole _ → not (Array.null (unknown row written)) '
      + '&& false\n',
    probe: 'r004-hole-tail',
    message: /hole tail not extended: E_TYPE fm is not a field of \{ fk: Bool/
  }
];
