// Activation prerequisites regression rows (docs/plans/
// 2026-11-04-activation-prerequisites-proposal.md; dossier §18.161),
// R036 (1)-(3), spread into t2Rows; probes in
// test/regression-r0-t2-prerequisites.mjs. Each row's name carries its
// criterion 4 tag (`r036-1`, `r036-2`, `r036-3`) as a hyphen-separated
// part, and each restores one defect in a whole, compiling form.
const dir = 'src/Features/Check/Strategy/ReadBack/';

const row = (name, file, needle, replacement, message) =>
  ({ name, file, needle, replacement, probe: name, message });

const types = 'src/Features/Check/Trace/Types.purs';

const scan = 'test/readback-total-scan.mjs';

export const t2PrerequisitesRows = [
  // R036 (1): the audit scan's forbidden list without Partial.Unsafe.
  { ...row('r0-t2-r036-1-scan-blind', scan,
    "export const forbiddenImports = ['Partial', 'Partial.Unsafe',\n",
    "export const forbiddenImports = ['Partial',\n",
    /r0-t2-r036-1-scan-blind: \["Partial\.Unsafe"\]/), tree: 'test' },
  // R036 (1): the loop table compared for ReadBack's modules only.
  { ...row('r0-t2-r036-1-loop-unlisted', scan,
    '  const derived = entries;\n',
    "  const derived = entries.filter(entry => entry.key.includes("
      + "'.ReadBack.'));\n",
    /r0-t2-r036-1-loop-unlisted: \["MarkStore"\]/), tree: 'test' },
  // R036 (2): a meta the numbering lacks kept raw, not a fault.
  row('r0-t2-r036-2-meta-raw', types,
    '  unnumbered meta = Left (Unnumbered meta)\n',
    '  unnumbered meta = Right (Hole meta)\n',
    /r0-t2-r036-2-meta-raw: \["lacking"\]/),
  // R036 (2): Function.purs injects no row resolution.
  row('r0-t2-r036-2-row-unresolved', 'src/Features/Check/Function.purs',
    '  , row: toOpenRow <<< Unify.resolveRow subst <<< toFlexRow\n',
    '  , row: const identity (toOpenRow <<< Unify.resolveRow subst '
      + '<<< toFlexRow)\n',
    /r0-t2-r036-2-row-unresolved: \["slot"\]/),
  // R036 (2): the trace's fault taken ahead of `Declined`.
  row('r0-t2-r036-2-trace-first', `${dir}Package.purs`,
    'readEffectsWith problem found checked terms finished = do\n',
    'readEffectsWith problem found checked terms finished =\n'
      + '  unfinished finished *> do\n',
    /r0-t2-r036-2-trace-first: \["declined"\]/),
  // R036 (3): EffectRows maps a conversion failure back to `Unread`.
  row('r0-t2-r036-3-row-coarse', `${dir}EffectRows.purs`,
    '  unconverted (UnmarkedLabel effect) = Left (RowUnconverted variable '
      + 'effect)\n',
    '  unconverted (UnmarkedLabel effect) = Left (Unread (const variable '
      + 'effect))\n',
    /r0-t2-r036-3-row-coarse: \["unmarked","unread mark"\]/),
  // R036 (3): Images collapses a conversion failure into `UnreadImage`.
  row('r0-t2-r036-3-image-coarse', `${dir}Images.purs`,
    '    Left (ImageUnconverted variable effect)\n',
    '    Left (UnreadImage (const variable effect))\n',
    /r0-t2-r036-3-image-coarse: \["held"\]/)
];
