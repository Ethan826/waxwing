// Record check 6 regression rows (dossier §18.155 (2); spec §4.1), spread
// into a2Rows (scripts/regression-r0-a2.mjs); the probe is in
// test/regression-r0-a2-record-duplicates.mjs. Each restores one defect
// in a whole, compiling form.
const effects = 'src/Features/Check/Strategy/Effects';
const duplicates = `${effects}/RecordDuplicates.purs`;
const lists = '  if repeated effects.flexEff || repeated effects.positions'
  + ' then Just at\n';

export const a2DuplicateRows = [
  {
    // The check dropped: Effects.Record goes from the declarations entry
    // straight to the coverage.
    name: 'r0-a2-duplicates-dropped',
    file: `${effects}/Record.purs`,
    needle: '  declared _ = maybe\' lists Just (declarationsDefect problem)\n',
    replacement:
      '  declared _ = maybe\' coverage Just (declarationsDefect problem)\n',
    probe: 'r0-a2-duplicates-dropped',
    message: /duplicates-dropped: \[\["a repeated flexEff entry",null\]/
  },
  {
    // `flexEff` deduplicated, as a conversion to a set would, before the
    // check reads it.
    name: 'r0-a2-duplicates-flexeff-set',
    file: duplicates,
    needle: lists,
    replacement: '  if repeated (nub effects.flexEff) || repeated'
      + ' effects.positions then Just at\n',
    probe: 'r0-a2-duplicates-flexeff-set',
    message: /flexeff-set: \[\["a repeated flexEff entry",null\]/
  },
  {
    // `positions` deduplicated before the check reads it.
    name: 'r0-a2-duplicates-positions-set',
    file: duplicates,
    needle: lists,
    replacement: '  if repeated effects.flexEff || repeated'
      + ' (nub effects.positions) then Just at\n',
    probe: 'r0-a2-duplicates-positions-set',
    message: /positions-set: \[\["a repeated positions entry",null\]\]/
  }
];
