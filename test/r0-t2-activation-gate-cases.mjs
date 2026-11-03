// Must-fail cases for the A2 activation gate (test/r0-t2-activation-
// gate.mjs), shared by test/r0-t2-activation-gate.test.mjs and the
// regression probe (test/regression-r0-t2-activation.mjs). `met` is a
// synthetic body of evidence on which all seven criteria hold
// (fixture-level: its dossier, statements and files are invented). Each
// case changes one thing and names the criteria it must leave unmet;
// every other criterion must stay met. `gateCases()` gives, per case,
// the ids `evaluate` finds unmet.
import { forcedTail, unjudged, unreadImages }
  from './r0-t2-honest-gate.mjs';
import { evaluate, unmet } from './r0-t2-activation-gate.mjs';

const dossier = ['# Dossier', '### 18.155 Stage B',
  'UnreadImage and RequirementUnjudged lists ruled.',
  '### 18.157 The four ForcedTail refusals admitted',
  '### 18.300 C6 decided', '### 18.301 Routing after activation',
  'The routing ruled.', '### 18.302 Performance budget',
  'R035 budget approved.', ''].join('\n');

const statements = ['| U4 | §11 | unresolved | no | yes |',
  '| U6 / P1, coverage | §11 | argued | no | yes |',
  '## 7. Pipeline and routing', 'After activation: dossier §18.301.',
  '## 7a. Trace', ''].join('\n');

const denominator = () => ({ candidates: 10, floor: 6,
  faults: [{ at: 'test/fx008-probes/f3.wxw#main',
    fault: 'Declined UnframedInstall' },
  { at: unreadImages[0], fault: 'UnreadImage (FreshVar {} Rest)' }],
  refusals: [{ at: unjudged[0], refusal: 'RequirementUnjudged {}' }],
  forcedTail: [{ at: forcedTail[0],
    refusal: 'NotCertifiable ForcedTail {}' }] });

const within = () => ({ compileTime: { budget: 2, measured: 1 },
  peakMemory: { budget: 2, measured: 2 } });

const met = () => ({
  status: { c6: '§18.300', landed: { 'R034 (2)': 'row-a',
    'R034 (10)': 'row-b' }, comparison: 'cmp.json',
  performance: { ruling: '§18.302', measurement: 'perf.json' },
  routing: '§18.301' },
  pin: { ruling: 'dossier §18.155 (7), §18.157',
    denominators: { 'corpus loader': denominator(),
      'effect pin': denominator() } },
  dossier, statements, rows: new Set(['row-a', 'row-b']),
  files: { 'cmp.json': { build: 'abc', census: { moved: [] },
    window: { moved: [] }, rt8: { moved: [] }, shadow: { moved: [] } },
  'perf.json': { conditions: 'quiet machine', readBack: within(),
    validator: within() } }
});

const loader = evidence => evidence.pin.denominators['corpus loader'];

// Each case: [criteria left unmet, the change].
const changes = {
  pinMissing: [[1, 2], evidence => { evidence.pin = null; }],
  pinUncited: [[1], evidence => { evidence.pin.ruling = '§18.155'; }],
  fifthForced: [[1, 2], evidence => {
    loader(evidence).forcedTail[0].at = 'examples/other.wxw#main'; }],
  otherRefusal: [[1, 2], evidence => {
    loader(evidence).refusals[0].refusal = 'ObligationFailed {}'; }],
  unruledFault: [[2], evidence => {
    loader(evidence).faults[0].fault = 'Declined PositionApart'; }],
  uncounted: [[2], evidence => { loader(evidence).candidates = 11; }],
  denominatorMissing: [[1, 2], evidence => {
    delete evidence.pin.denominators['effect pin']; }],
  unreadable: [[2], evidence => { loader(evidence).faults.push(null); }],
  statusMissing: [[3, 4, 5, 6, 7], evidence => { evidence.status = null; }],
  c6Unruled: [[3], evidence => { evidence.status.c6 = null; }],
  c6Absent: [[3], evidence => { delete evidence.status.c6; }],
  c6NoSection: [[3], evidence => { evidence.status.c6 = '§18.999'; }],
  c6WrongSection: [[3], evidence => { evidence.status.c6 = '§18.301'; }],
  c6Prefix: [[3], evidence => { evidence.status.c6 = '§18.30'; }],
  landedNull: [[4], evidence => {
    evidence.status.landed['R034 (10)'] = null; }],
  rowUnknown: [[4], evidence => { evidence.rows.delete('row-a'); }],
  comparisonNotRun: [[5], evidence => { evidence.status.comparison = null; }],
  comparisonFile: [[5], evidence => { delete evidence.files['cmp.json']; }],
  comparisonPartial: [[5], evidence => {
    delete evidence.files['cmp.json'].shadow; }],
  perfUnruled: [[6], evidence => {
    evidence.status.performance.ruling = null; }],
  overBudget: [[6], evidence => {
    evidence.files['perf.json'].readBack.peakMemory.measured = 3; }],
  validatorApart: [[6], evidence => {
    delete evidence.files['perf.json'].validator; }],
  perfUnmeasured: [[6], evidence => {
    evidence.status.performance.measurement = null; }],
  routingUnruled: [[7], evidence => { evidence.status.routing = null; }],
  routingUncited: [[7], evidence => {
    evidence.statements = statements.replace('§18.301', ''); }],
  u6Missing: [[7], evidence => {
    evidence.statements = statements.replace('| U6 ', '| U9 '); }]
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
