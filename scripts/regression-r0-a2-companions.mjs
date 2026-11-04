// A2 completion wave regression rows (dossier §18.148 (2)): record
// validation's check 4, the companions of `Install`, `HandlerLit` and
// `Defer` (spec §4.1). Spread into a2Rows (scripts/regression-r0-a2.mjs);
// probes in test/regression-r0-a2-companions.mjs. Each restores one
// defect in a whole, compiling form.
const companions = 'src/Features/Check/Strategy/Effects/RecordCompanions.purs';
const record = 'src/Features/Check/Strategy/Effects/Record.purs';
// The probe's whole failure line: exactly these mutants missed.
const exactly = (what, names) =>
  new RegExp(`${what} companions not check 4: ${names.join(', ')}$`, 'm');

export const a2CompanionRows = [
  {
    // Check 4 not in record validation's list at all.
    name: 'r0-a2-companion-wired',
    file: record,
    needle: '    , maybe false (companionWrong scope.companions)'
      + ' entry.obligation\n',
    replacement: '    , maybe false (companionWrong scope.companions)'
      + ' Nothing\n',
    probe: 'r0-a2-companion-deleted',
    message: exactly('deleted', ['InstallR', 'AtInstalledC', 'ClauseIntoR',
      'ClauseIntoC', 'AtDefer', 'UnframedInstall', 'C15 InstallR'])
  },
  {
    // An owner's required companions not looked for.
    name: 'r0-a2-companion-required',
    file: companions,
    needle: '      not (all once (owner.companions site)) || repeated site\n',
    replacement: '      not (all (const true) (owner.companions site))'
      + ' || repeated site\n',
    probe: 'r0-a2-companion-deleted',
    message: exactly('deleted', ['InstallR', 'AtInstalledC', 'ClauseIntoR',
      'ClauseIntoC', 'AtDefer', 'UnframedInstall', 'C15 InstallR'])
  },
  {
    // A companion's source and target not compared: presence only.
    name: 'r0-a2-companion-rows',
    file: companions,
    needle: '    && wanted.source == found.source\n'
      + '    && wanted.target == found.target\n',
    replacement: '\n',
    probe: 'r0-a2-companion-miswired',
    message: exactly('miswired', ['InstallR source', 'AtInstalledC source',
      'ClauseIntoC source', 'AtDefer source', 'InstallR target',
      'ClauseIntoR target', 'AtDefer target'])
  },
  {
    // A companion's identity (path and role) not compared.
    name: 'r0-a2-companion-identity',
    file: companions,
    needle: 'fits companion placed = companion.provenance'
      + ' == placed.provenance\n  && ',
    replacement: 'fits companion placed = ',
    probe: 'r0-a2-companion-miswired',
    message: exactly('miswired', ['InstallR path', 'AtDefer path',
      'ClauseIntoR path', 'AtInstalledC role', 'UnframedInstall role'])
  },
  {
    // "Exactly once" read as "at least once": a duplicate accepted.
    name: 'r0-a2-companion-once',
    file: companions,
    needle: '    length (filter (fits companion) companions.obligations)'
      + ' == 1\n',
    replacement: '    length (filter (fits companion) companions.obligations)'
      + ' >= 1\n',
    probe: 'r0-a2-companion-miswired',
    message: exactly('miswired', ['InstallR duplicated'])
  },
  {
    // The reverse direction dropped: a companion with no owner accepted.
    name: 'r0-a2-companion-unowned',
    file: companions,
    needle: '  unowned _ = companionKind placed.value\n'
      + '    && not (any (flip fits placed) companions.required)\n',
    replacement: '  unowned _ = false\n',
    probe: 'r0-a2-companion-unowned',
    message: exactly('unowned', ['Install deleted', 'HandlerLit deleted',
      'Defer deleted', 'stray InstallR', 'UnframedInstall beside a handler',
      'InstallR beside an unframed install'])
  },
  {
    // The owner's identity (rule and role) not compared.
    name: 'r0-a2-companion-owner',
    file: companions,
    needle: 'identified owner site = site.rule == owner.rule'
      + ' && site.role == owner.role\n',
    replacement: 'identified _ _ = true\n',
    probe: 'r0-a2-companion-unowned',
    message: exactly('unowned', ['Install under another role'])
  },
  {
    // The table's installed-C row reads R where an owned C exists.
    name: 'r0-a2-companion-table',
    file: companions,
    needle: '        (fromMaybe rows.inference rows.clauses)\n',
    replacement: '        (fromMaybe rows.inference Nothing)\n',
    probe: 'r0-a2-companion-table',
    message: /unchanged problems refused: use,c15$/m
  }
];
