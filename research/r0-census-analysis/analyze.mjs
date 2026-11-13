// Census analysis for a first lift (dossier §18.188). Evidence only; it
// reads pinned files and runs nothing: the whole-program loss file
// (test/fixtures/r0/t2-replacement-losses.json, current by its serial
// test), the census (test/fixtures/r0/census.json), the FX008 probe
// tables and the R0 fixtures' recorded phase. For each lost program: its
// exact cause set (the union of its blockers' `decide` causes); the
// programs each lift, and each combination of lifts, rescues (a rescue
// only when every cause of every blocker is lifted); its evidence tier;
// and the reconciliation of the census union with the losses.
// usage: node research/r0-census-analysis/analyze.mjs > out.json
import { readFileSync } from 'node:fs';
import { probes } from '../../test/fx008-probe-table.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const losses = json('test/fixtures/r0/t2-replacement-losses.json');
const census = json('test/fixtures/r0/census.json');

// `decide`'s reason as cause atoms. A reason this does not know throws,
// so no cause is dropped silently.
const atoms = [
  [/^Outside (\w+)$/, match => match[1]],
  [/^EffectLimit ForcedTail$/, () => 'ForcedTail'],
  [/^EffectsUnchecked \[UnframedInstall\]$/, () => 'UnframedInstall'],
  [/^EffectsUnread Declined$/, () => null],
  [/^EffectsUnread UnreadImage$/, () => 'UnreadImage'],
  [/^RequirementAtoms$/, () => 'RequirementAtoms']];
const causesOf = reason => {
  const prefix = 'Unresolved Unsupported ';
  if (!reason.startsWith(prefix)) throw new Error(`reason: ${reason}`);
  return reason.slice(prefix.length).split(', ').map(part => {
    const found = atoms.find(([pattern]) => pattern.test(part));
    if (!found) throw new Error(`cause: ${part}`);
    return found[1](found[0].exec(part));
  }).filter(cause => cause !== null);
};

// The evidence that the program is valid, strongest first.
const probeOk = new Map(probes.map(entry =>
  [`test/fx008-probes/${entry.file}.wxw`, entry.fx008.accepted]));
const outputFiles = ['fx-run', 'fx-block', 'fx-task7', 'fx-cleanup',
  'fx-scale', 'fx-services'];
const oracleFiles = ['fn', 'poly'];
const tierOf = origin => {
  if (origin.startsWith('examples/')) return 'shipped example';
  if (probeOk.has(origin)) return probeOk.get(origin)
    ? 'tested valid: probe pinned ok' : 'probe pinned refused';
  const file = /^test\/(.+)-programs\.mjs:/.exec(origin)?.[1];
  if (outputFiles.includes(file)) return 'tested valid: expected output';
  if (oracleFiles.includes(file)) return 'tested valid: execution oracle';
  if (file !== undefined) return `test program (${file})`;
  if (origin.startsWith('test/fixtures/')) {
    const fixture = json(origin);
    return fixture.phase === 'compiled' && fixture.code === null
      ? 'fixture pinned compiling' : 'fixture, other pin';
  }
  if (origin.startsWith('editors/')) return 'editor fixture';
  return 'unclassified (docs or research)';
};

const lost = losses.programs.filter(program => program.class === 'lost')
  .map(program => {
    const blockers = program.blockers.map(blocker =>
      ({ name: blocker.name, causes: causesOf(blocker.reason) }));
    const causes = [...new Set(blockers.flatMap(b => b.causes))].sort();
    return { origin: program.origin, named: program.named,
      tier: tierOf(program.origin), causes, blockers };
  });

const allCauses = [...new Set(lost.flatMap(p => p.causes))].sort();
const rescued = lifts => lost.filter(p =>
  p.causes.every(cause => lifts.includes(cause)));

// Every combination of lifts, with the programs it rescues.
const subsets = [];
for (let mask = 1; mask < 1 << allCauses.length; mask += 1) {
  const lifts = allCauses.filter((_, i) => mask & (1 << i));
  subsets.push({ lifts, rescued: rescued(lifts).length });
}
// For each size, the combinations rescuing the most.
const frontier = Object.fromEntries(allCauses.map((_, i) => {
  const sized = subsets.filter(s => s.lifts.length === i + 1);
  const best = Math.max(...sized.map(s => s.rescued));
  return [i + 1, { rescued: best, lifts: sized
    .filter(s => s.rescued === best).map(s => s.lifts.join(' + ')) }];
}));

const count = (list, key) => Object.fromEntries(Object.entries(
  list.reduce((found, item) => {
    const k = key(item);
    found[k] = (found[k] ?? 0) + 1;
    return found;
  }, {})).sort((a, b) => b[1] - a[1]));

const notLost = losses.programs.filter(p => p.class === 'notLost');
const union = new Set(census.union.origins);
console.log(JSON.stringify({
  lost: lost.length,
  causes: allCauses,
  programsPerCause: Object.fromEntries(allCauses.map(cause =>
    [cause, lost.filter(p => p.causes.includes(cause)).length])),
  censusCategoryPrograms: Object.fromEntries(Object.entries(
    census.categories).map(([name, c]) => [name, c.programs])),
  exactCauseSets: count(lost, p => p.causes.join(' + ')),
  single: Object.fromEntries(allCauses.map(cause =>
    [cause, rescued([cause]).length])),
  frontier,
  tiers: count(lost, p => p.tier),
  tiersByCauseSet: count(lost, p => `${p.tier} | ${p.causes.join(' + ')}`),
  reconciliation: {
    censusUnion: union.size,
    unionLost: lost.filter(p => union.has(p.origin)).length,
    unionNotLost: notLost.filter(p => union.has(p.origin))
      .map(p => p.origin),
    lostOutsideUnion: lost.filter(p => !union.has(p.origin))
      .map(p => `${p.origin} (${p.causes.join(' + ')})`),
    unionAbsent: [...union].filter(origin => !losses.programs
      .some(p => p.origin === origin)) },
  programs: lost
}, null, 1));
