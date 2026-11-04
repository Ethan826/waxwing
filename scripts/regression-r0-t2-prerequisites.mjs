// Activation prerequisites regression rows (docs/plans/
// 2026-11-04-activation-prerequisites-proposal.md; dossier §18.161),
// R036 (1)-(3), spread into t2Rows; probes in
// test/regression-r0-t2-prerequisites.mjs. Each row's name carries its
// criterion 4 tag (`r036-1`, `r036-2`, `r036-3`) as a hyphen-separated
// part, and each restores one defect in a whole, compiling form.
const dir = 'src/Features/Check/Strategy/ReadBack/';

const row = (name, file, needle, replacement, message) =>
  ({ name, file, needle, replacement, probe: name, message });

export const t2PrerequisitesRows = [
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
