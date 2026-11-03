// A synthetic body of evidence on which all seven criteria of the A2
// activation gate hold (fixture-level: its dossier, statements, status
// and files are invented; the pin carries §18.157's figures and the
// honest gate's named lists). test/r0-t2-activation-gate-cases.mjs
// changes one thing at a time from it.
import { forcedTail, unjudged, unreadImages, unsupported }
  from './r0-t2-honest-gate.mjs';

export const dossier = ['# Dossier', '### 18.150 Earlier',
  'C6, routing, read fault, ForcedTail and R035 named, not ruled.',
  'Corpus loader figures named early: corpus loader: 2822 candidates,'
    + ' floor 2804.',
  '### 18.155 Stage B',
  'UnreadImage and RequirementUnjudged lists; a read fault list.',
  '### 18.157 The four ForcedTail refusals admitted',
  '### 18.300 C6 decided', '### 18.301 Routing after activation',
  'The routing ruled.', '### 18.302 Performance budget',
  'R035 budget approved.', '### 18.303 Replacement losses',
  'Each read fault, RequirementUnjudged and ForcedTail loss ruled.',
  '### 18.304 Re-pin', 'corpus loader: 2822 candidates, floor 2804.',
  '### 18.305 Re-pin, a longer floor',
  'corpus loader: 2822 candidates, floor 28040.',
  '### 18.306 Re-pin, the other denominator',
  'effect pin: 2822 candidates, floor 2804.',
  '### 18.1580 A longer number', 'C6 decided under another number.',
  ''].join('\n');

export const statements = ['## 0e. Changes',
  '| U4 | §11 | unresolved | no | yes |',
  '| U6 / P1, coverage | §11 | argued | no | yes |',
  '## 7. Pipeline and routing', 'After activation: dossier §18.301.',
  '## 7a. Trace', ''].join('\n');

const faultOf = at => (unsupported[at] === undefined
  ? { at, fault: 'UnreadImage (FreshVar {} Rest)' }
  : { at, fault: `Declined ${unsupported[at]}` });

const faultsAt = [...Object.keys(unsupported), ...unreadImages];

// A denominator as §18.157 pinned it: its candidates, floor and lists.
const denominator = (candidates, floor, faults) => ({ candidates, floor,
  faults: faultsAt.slice(0, faults).map(faultOf),
  refusals: unjudged.map(at => ({ at, refusal: 'RequirementUnjudged {}' })),
  forcedTail: forcedTail.map(at =>
    ({ at, refusal: 'NotCertifiable ForcedTail {}' })) });

const budget = () => ({ compileTime: 2, peakMemory: 2 });

const within = () => ({ compileTime: { measured: 1 },
  peakMemory: { measured: 2 } });

export const met = () => ({
  status: { repin: null, losses: { faults: '§18.303',
    refusals: '§18.303', forcedTail: '§18.303' }, c6: '§18.300',
  landed: { 'R034 (2)': 'r0-a2-r034-2-merge',
    'R034 (10)': 'r0-a2-r034-10-owner' }, comparison: 'cmp.json',
  performance: { ruling: '§18.302', measurement: 'perf.json',
    budget: { readBack: budget(), validator: budget() } },
  routing: '§18.301' },
  pin: { ruling: 'dossier §18.155 (7), §18.157', explanations: [],
    denominators: { 'corpus loader': denominator(2823, 2805, 11),
      'effect pin': denominator(2832, 2813, 12) } },
  dossier, statements,
  rows: new Set(['r0-a2-r034-2-merge', 'r0-a2-r034-10-owner',
    'r0-a2-defect-block', 'r0-r034-2-r034-10']),
  files: { 'cmp.json': { build: 'abc', census: { moved: [] },
    window: { moved: [] }, rt8: { moved: [] }, shadow: { moved: [] } },
  'perf.json': { conditions: 'quiet machine', readBack: within(),
    validator: within() } }
});
