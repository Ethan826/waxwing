import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus } from './r0-corpus.mjs';
import { sourcesOf } from './r0-effects-pin-run.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';
import { compatChecks } from './r0-t2-compat-checks.mjs';

// Tranche 2 Task 14: A2 spec §11's owed compatibility checks, run on the
// honest packages tranche 2's read-back assembles (`readEffects`, as
// test/r0-t2-package-corpus.serial.test.mjs reads them), with today's
// read-back σ (`unsettled`) beside each; test/r0-t2-compat-checks.mjs
// states each check. Two denominators: the corpus loader
// (test/r0-corpus.mjs) and the effect pin's sources
// (test/r0-effects-pin-run.mjs `sourcesOf`: RT8's sources and the
// window's defect probes, a superset); a declaration counts when the
// online search offers a candidate. Excluded: the candidates whose read
// faults, which have no honest package (on the corpus, the 9
// `Declined UnframedInstall`, an `Unsupported` problem the validator
// refuses first, the effect pin adding one `Declined OperationWithRow`;
// and the 2 statsEvidence `UnreadImage`s, a θ binding
// the package cannot hold); the faults are listed and pinned, never
// filtered silently. Corpus-observed (and corpus-derived for the runs
// less a variable): it holds on these sources today, not a proof and
// not a claim about every program. "Hole numerals" (spec §2.4, §11):
// asserted are the witness agreeing with bindingsOf σ on every package,
// a fresh hole new to every map of P, and agreement wherever P has no
// effect hole; where it has one, bindingsOf's numerals differ as §2.4
// predicts and are counted (whether a pinned witness records them is
// test/r0-a2-properties.serial.test.mjs's scan). Corpus-wide, serial.
const online = await onlineFrom(load);
const checks = await compatChecks(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const Function = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const RB = await load('Features.Check.Strategy.ReadBack');
const Package = await load('Features.Check.Strategy.ReadBack.Package');
const { named } = checks.cases;

// One declaration's result: null (no candidate), a fault, or a judgement.
const declaration = (program, inputs, where) => decl => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return null;
  const problem = Elaborating.problem(generated.value0);
  const found = Online.onlineSearch(online.contextOf(program))(budget)(
    problem);
  if (named(found) !== 'Candidate') return null;
  const at = `${where}#${decl.name}`;
  const live = Function.recheck(functional(program.ctors))(program)(decl)
    .value0;
  const readBack = RB.readBack(problem)(live.function).value0;
  const read = Package.readEffects(problem)(readBack)(live.function)(
    live.state.subst.marks)(live.trace);
  if (named(read) === 'Left') {
    const fault = read.value0;
    const kind = named(fault) === 'Declined' ? named(fault.value0) : '';
    return { at, fault: `${at} ${named(fault)} ${kind}`.trim() };
  }
  return { at, ...checks.judge(problem, read.value0, readBack.unsettled) };
};
const resultsOf = ({ origin, source }) => {
  let program;
  try { program = resolved(source); } catch { return []; }
  const inputs = Inputs.generationInputs(program);
  return program.functions.map(declaration(program, inputs, origin))
    .filter(Boolean);
};

const g0Counts = () => ({ both: 0, before: [], after: 0, neither: 0 });
const count = (counts, outcome, at) => {
  if (outcome === 'before') counts.before.push(at);
  else counts[outcome] += 1;
};
const tally = results => {
  const out = { candidates: results.length, packages: 0, faults: [],
    erasure: [], commute: [], projection: [], numerals: [], g0: g0Counts(),
    effectHoles: 0, runs: 0, derivedG0: g0Counts(), collides: [],
    differs: 0, todayCollides: 0, differsPlain: [], neither: [] };
  for (const item of results) {
    if (item.fault) { out.faults.push(item.fault); continue; }
    out.packages += 1;
    for (const name of ['erasure', 'commute', 'projection', 'numerals'])
      if (!item[name]) out[name].push(item.at);
    count(out.g0, item.g0, item.at);
    if (item.g0 === 'neither') out.neither.push(item.at);
    if (item.effectHoles) out.effectHoles += 1;
    for (const run of item.derived) {
      out.runs += 1;
      count(out.derivedG0, run.g0, item.at);
      if (run.collides) out.collides.push(item.at);
      if (run.differs) out.differs += 1;
      if (run.differs && !item.effectHoles) out.differsPlain.push(item.at);
      if (run.todayCollides) out.todayCollides += 1;
    }
  }
  return out;
};
const report = (name, out) => `${name} (corpus-observed): `
  + `${out.candidates} candidates, ${out.packages} packages`
  + ` (${out.effectHoles} with an effect hole), ${out.faults.length}`
  + ` faults excluded; failing: erase ${out.erasure.length}, commute`
  + ` ${out.commute.length}, projection ${out.projection.length},`
  + ` numerals ${out.numerals.length}; G0 both ${out.g0.both}, only`
  + ` settle P_in ${out.g0.before.length}, only P_c ${out.g0.after},`
  + ` neither ${out.g0.neither}. Derived (corpus-derived): ${out.runs}`
  + ` runs; G0 both ${out.derivedG0.both}, only settle P_in`
  + ` ${out.derivedG0.before.length}, only P_c ${out.derivedG0.after},`
  + ` neither ${out.derivedG0.neither}; fresh hole met in P`
  + ` ${out.collides.length}; bindingsOf's numeral differs`
  + ` ${out.differs}, of which met in P ${out.todayCollides}; G0 refuses`
  + ` both: ${out.neither.join('; ')}`;

// One sweep: the corpus sources are judged once, and the effect pin's
// sources reuse them (same origin and text).
const corpus = await loadCorpus();
const seen = new Map();
const keyOf = entry => `${entry.origin}\0${entry.source}`;
for (const entry of corpus) seen.set(keyOf(entry), resultsOf(entry));
const pinned = (await sourcesOf()).flatMap(entry =>
  seen.get(keyOf(entry)) ?? resultsOf(entry));
const denominators = { corpus: tally(corpus.flatMap(entry =>
  seen.get(keyOf(entry)))), effectPin: tally(pinned) };

const holds = out => {
  for (const name of ['erasure', 'commute', 'projection', 'numerals'])
    assert.deepEqual(out[name].slice(0, 10), [], name);
  assert.deepEqual(out.g0.before.slice(0, 10), [], 'G0 monotonicity');
  assert.deepEqual(out.derivedG0.before.slice(0, 10), [],
    'G0 monotonicity, derived');
  assert.deepEqual(out.collides.slice(0, 10), [], 'fresh hole met in P');
  // With no effect hole in P, completion numbers as bindingsOf does.
  assert.deepEqual(out.differsPlain.slice(0, 10), [], 'numerals apart');
  // Not vacuous: packages hold effect holes, derived runs reach G0's
  // acceptance, and bindingsOf's numbering would reuse an effect hole.
  assert.ok(out.effectHoles > 0 && out.derivedG0.both > 0
    && out.todayCollides > 0);
};
const baseline = 'docs/plans/2026-10-21-c001-explicit/baseline/';
const unframed = ['test/fx008-probes/f3.wxw#main',
  'test/fx008-probes/rev7/late1.wxw#main',
  'test/fx008-probes/rev7/late2.wxw#main',
  'test/fx008-probes/rev8/one3.wxw#main',
  'test/fx008-probes/rev8/two3.wxw#main',
  'test/fx008-probes/rigid.wxw#main',
  'test/fixtures/r0/audit/expected-handler.pinned-selection.json#k',
  'test/fx008-defer-programs.mjs:r2#1#run',
  'test/fx008-defer-programs.mjs:r9#1#main'];
const corpusFaults = [
  `${baseline}c7-pure-stages-construction.wxw#statsEvidence UnreadImage`,
  `${baseline}q7-pure-construction.wxw#statsEvidence UnreadImage`,
  ...unframed.map(each => `${each} Declined UnframedInstall`)];

test('compatibility checks on the corpus loader\'s honest packages', t => {
  const out = denominators.corpus;
  t.diagnostic(report('corpus loader', out));
  assert.deepEqual(out.faults, corpusFaults);
  // Observed 2026-11-02 (corpus-observed; drift pins, not properties):
  // 2812 packages, 1008 with an effect hole; G0 accepts both 2809 and
  // refuses both 3; 3622 derived runs, bindingsOf's numeral apart from
  // completion's in 1216, of them an effect hole of P in 1112.
  assert.equal(out.packages, 2812);
  holds(out);
});

test('compatibility checks on the effect pin\'s honest packages', t => {
  const out = denominators.effectPin;
  t.diagnostic(report('effect pin sources', out));
  // Beyond the corpus's: one more `Unsupported` problem, declined.
  assert.deepEqual(out.faults.filter(each => !corpusFaults.includes(each)),
    ['inline:fx032#g Declined OperationWithRow']);
  // Observed 2026-11-02: 2820 packages, 1013 with an effect hole.
  assert.equal(out.packages, 2820);
  holds(out);
});
