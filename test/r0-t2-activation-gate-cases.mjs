// Must-fail cases for the A2 activation gate (test/r0-t2-activation-
// gate.mjs), shared by test/r0-t2-activation-gate.test.mjs and the
// regression probe (test/regression-r0-t2-activation.mjs). Each case
// changes one thing in the synthetic evidence of
// test/r0-t2-activation-gate-met.mjs and names the criteria it must
// leave unmet (none for a case that must hold); every other criterion
// must stay met. `gateCases()` gives, per case, the ids `evaluate` finds
// unmet.
import { evaluate, unmet } from './r0-t2-activation-gate.mjs';
import { met, statements } from './r0-t2-activation-gate-met.mjs';

const loader = evidence => evidence.pin.denominators['corpus loader'];

// The corpus loader's candidates and floor both one lower: the counts
// still balance, so only §18.157's figures can see it (review I3).
const lowered = evidence => {
  loader(evidence).candidates = 2822;
  loader(evidence).floor = 2804;
};

const status = evidence => evidence.status;

// Each case: [criteria left unmet, the change].
const changes = {
  pinMissing: [[1, 2], evidence => { evidence.pin = null; }],
  pinUncited: [[1], evidence => { evidence.pin.ruling = '§18.155'; }],
  pinLowered: [[1], lowered],
  pinLoweredRepinned: [[], evidence => {
    lowered(evidence);
    status(evidence).repin = '§18.304'; }],
  // §18.150 names the lowered figures; only its number is too early.
  repinEarly: [[1], evidence => {
    lowered(evidence);
    status(evidence).repin = '§18.150'; }],
  repinPartNumber: [[1], evidence => {
    lowered(evidence);
    status(evidence).repin = '§18.305'; }],
  repinOtherDenominator: [[1], evidence => {
    lowered(evidence);
    status(evidence).repin = '§18.306'; }],
  pinCitesLonger: [[1], evidence => {
    evidence.pin.ruling = 'dossier §18.155 (7), §18.1570'; }],
  explanationsNotList: [[1], evidence => {
    evidence.pin.explanations = 'none'; }],
  fifthForced: [[1, 2], evidence => {
    loader(evidence).forcedTail[0].at = 'examples/other.wxw#main'; }],
  forcedOtherClass: [[1, 2], evidence => {
    loader(evidence).forcedTail[0].refusal = 'NotCertifiable RigidExact'; }],
  otherRefusal: [[1, 2], evidence => {
    loader(evidence).refusals[0].refusal = 'ObligationFailed {}'; }],
  unruledFault: [[2], evidence => {
    loader(evidence).faults[0].fault = 'Declined PositionApart'; }],
  // One more named fault than the count allows, figures unchanged.
  uncounted: [[2], evidence => {
    loader(evidence).faults.push(evidence.pin.denominators['effect pin']
      .faults[11]); }],
  denominatorMissing: [[1, 2], evidence => {
    delete evidence.pin.denominators['effect pin']; }],
  unreadable: [[2], evidence => { loader(evidence).faults.push(null); }],
  lossUnruled: [[2], evidence => {
    status(evidence).losses.forcedTail = null; }],
  lossEarly: [[2], evidence => {
    status(evidence).losses.faults = '§18.155'; }],
  lossesAbsent: [[2], evidence => { delete status(evidence).losses; }],
  statusMissing: [[2, 3, 4, 5, 6, 7], evidence => {
    evidence.status = null; }],
  c6Unruled: [[3], evidence => { status(evidence).c6 = null; }],
  c6Absent: [[3], evidence => { delete status(evidence).c6; }],
  c6NoSection: [[3], evidence => { status(evidence).c6 = '§18.999'; }],
  c6WrongSection: [[3], evidence => { status(evidence).c6 = '§18.301'; }],
  c6Early: [[3], evidence => { status(evidence).c6 = '§18.150'; }],
  // Only `### 18.1580` exists: a later number whose heading is absent.
  c6Prefix: [[3], evidence => { status(evidence).c6 = '§18.158'; }],
  landedNull: [[4], evidence => {
    status(evidence).landed['R034 (10)'] = null; }],
  // One row carrying both tags, recorded for both items.
  landedSame: [[4], evidence => {
    status(evidence).landed['R034 (2)'] = 'r0-r034-2-r034-10';
    status(evidence).landed['R034 (10)'] = 'r0-r034-2-r034-10'; }],
  landedUnrelated: [[4], evidence => {
    status(evidence).landed['R034 (2)'] = 'r0-a2-defect-block'; }],
  rowUnknown: [[4], evidence => {
    evidence.rows.delete('r0-a2-r034-2-merge'); }],
  comparisonNotRun: [[5], evidence => {
    status(evidence).comparison = null; }],
  comparisonFile: [[5], evidence => { delete evidence.files['cmp.json']; }],
  comparisonPartial: [[5], evidence => {
    delete evidence.files['cmp.json'].shadow; }],
  perfUnruled: [[6], evidence => {
    status(evidence).performance.ruling = null; }],
  perfEarly: [[6], evidence => {
    status(evidence).performance.ruling = '§18.150'; }],
  overBudget: [[6], evidence => {
    evidence.files['perf.json'].readBack.peakMemory.measured = 3; }],
  overOwnBudget: [[6], evidence => {
    evidence.files['perf.json'].readBack.peakMemory =
      { budget: 100, measured: 3 }; }],
  negativeMeasured: [[6], evidence => {
    evidence.files['perf.json'].validator.compileTime.measured = -1; }],
  measuredNotNumber: [[6], evidence => {
    evidence.files['perf.json'].validator.compileTime.measured = '1'; }],
  budgetMissing: [[6], evidence => {
    status(evidence).performance.budget = null; }],
  validatorApart: [[6], evidence => {
    delete evidence.files['perf.json'].validator; }],
  perfUnmeasured: [[6], evidence => {
    status(evidence).performance.measurement = null; }],
  routingUnruled: [[7], evidence => { status(evidence).routing = null; }],
  routingEarly: [[7], evidence => {
    status(evidence).routing = '§18.150'; }],
  routingUncited: [[7], evidence => {
    evidence.statements = statements.replace('§18.301', ''); }],
  routingPrefix: [[7], evidence => {
    evidence.statements = statements.replace('§18.301', '§18.3015'); }],
  u6Missing: [[7], evidence => {
    evidence.statements = statements.replace('| U6 ', '| U9 '); }],
  u4OutsideTable: [[7], evidence => {
    evidence.statements = statements
      .replace('| U4 | §11 | unresolved | no | yes |\n', '')
      .replace('## 7a. Trace', '## 7a. Trace\n| U4 | §11 | x | no | y |'); }]
};

export const expected = Object.fromEntries(Object.entries(changes)
  .map(([name, [ids]]) => [name, ids]));

const changed = change => {
  const evidence = met();
  change(evidence);
  return unmet(evaluate(evidence));
};

export const gateCases = () => ({
  met: unmet(evaluate(met())),
  ...Object.fromEntries(Object.entries(changes)
    .map(([name, [, change]]) => [name, changed(change)]))
});

// The cases whose unmet criteria differ from those expected, the met
// body of evidence included (it must leave none unmet).
export const wrongCases = () => {
  const found = gateCases();
  return [...(found.met.length === 0 ? [] : ['met']),
    ...Object.keys(expected).filter(name =>
      JSON.stringify(found[name]) !== JSON.stringify(expected[name]))];
};
