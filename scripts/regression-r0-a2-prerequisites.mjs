// The activation prerequisites' regression rows for R034 (2) and (10)
// (docs/plans/2026-11-04-activation-prerequisites-proposal.md; dossier
// §18.161), spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-prerequisites.mjs. Each restores one defect in a
// whole, compiling form. Each name carries its activation-gate criterion
// 4 tag (`r034-2`, `r034-10`) as a hyphen-separated part.
const reason = 'src/Features/Check/Decide/Reason.purs';
const companions = 'src/Features/Check/Strategy/Effects/RecordCompanions.purs';

export const a2PrerequisiteRows = [
  {
    // R034 (2): the blocks and declines joined without `merged`, so a
    // block's `EffectsUnchecked [k1, k2]` and a decline's `[k1]` both stay.
    name: 'r0-a2-r034-2-unmerged',
    file: reason,
    needle: '    Unsupported (NonEmptyArray.nubEq (merged (withAll found)))\n',
    replacement: '    Unsupported (NonEmptyArray.nubEq (withAll found))\n',
    probe: 'r0-a2-r034-2-unmerged',
    message: /^blocks and declines unmerged: 2 EffectsUnchecked entries$/m
  },
  {
    // R034 (2): the same for the declines alone (`unlimited`).
    name: 'r0-a2-r034-2-unlimited-unmerged',
    file: reason,
    needle: '      (NonEmptyArray.fromArray (nubEq (merged'
      + ' (declines strategies))))\n',
    replacement: '      (NonEmptyArray.fromArray (nubEq'
      + ' (declines strategies)))\n',
    probe: 'r0-a2-r034-2-unlimited-unmerged',
    message: /^declines unmerged: 2 EffectsUnchecked entries$/m
  },
  {
    // R034 (10): owners not counted, so an owner recorded twice at one
    // identity passes when each copy finds its companions once.
    name: 'r0-a2-r034-10-owner-twice',
    file: companions,
    needle: '  repeated _ = length (filter (eq placed.provenance)'
      + ' companions.owners) > 1\n',
    replacement: '  repeated _ = false\n',
    probe: 'r0-a2-r034-10-owner-twice',
    message: new RegExp('^owners twice not check 4: Install twice, '
      + 'Install beside an unframed copy, HandlerLit with no clauses twice, '
      + 'HandlerLit twice, Defer twice$', 'm')
  }
];
