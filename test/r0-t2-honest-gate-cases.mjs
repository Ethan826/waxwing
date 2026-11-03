// Synthetic rows for Tranche 2 Task 13's gate (fixture-level), shaped as
// test/r0-t2-honest-report.mjs gives them, read by
// test/r0-t2-honest-gate.test.mjs and the gate's restored-defect probe
// (test/regression-r0-t2-honest.mjs). Each case returns the problems
// `gateProblems`, `admission` or the re-pin rule (`repin`) names; []
// means it holds.
import { admission, gateProblems, observe, pinOf, unjudged, unreadImages,
  unsupported } from './r0-t2-honest-gate.mjs';
import { repin } from './r0-t2-honest-repin.mjs';

export { admission };

const refusal = 'RequirementUnjudged {"decl":0}';
const [u0, u1, u2] = unjudged;
const row = (at, fields = {}) => ({ at, read: 'package', i3: 'ok',
  validate: 'validated', certify: 'accepted', sameG0: false, ...fields });
const faulted = (at, read) => row(at, { read, i3: null, validate: null });
const refused = (at, refusal, certify = refusal, sameG0 = true) =>
  row(at, { validate: refusal, certify, sameG0 });

// One denominator: every approved fault, the three named
// RequirementUnjudged and three validated packages.
const baseRows = () => [
  ...Object.entries(unsupported).map(([at, kind]) =>
    faulted(at, `Declined ${kind}`)),
  ...unreadImages.map(at => faulted(at, 'UnreadImage {"FreshVar":[0]}')),
  ...unjudged.map(at => refused(at, refusal)),
  row('v.wxw#a'), row('v.wxw#b'), row('v.wxw#c')];

const origins = rows => new Set(rows.map(entry =>
  entry.at.slice(0, entry.at.lastIndexOf('#'))));

const against = rows => gateProblems(pinOf(observe(baseRows())),
  observe(rows));

const admitted = (rows, explained = false) => admission(observe(rows),
  origins(baseRows()), explained);

// The re-pin rule from the base pin to `rows`' pin.
const repinned = (rows, options = {}) => {
  const pinned = { denominators: { d: pinOf(observe(baseRows())) },
    explanations: [{ explanation: 'earlier', covers: [] }] };
  return repin(pinned, { denominators: { d: pinOf(observe(rows)) } },
    { repin: true, ...options });
};

const replaced = (at, made) => baseRows().map(entry =>
  (entry.at === at ? made : entry));

export const gateCases = () => ({
  holds: () => against(baseRows()),
  extraRefusal: () => against(replaced('v.wxw#c',
    refused('v.wxw#c', refusal))),
  // A pinned refusal now validated: only the vanished entry differs.
  removedEntry: () => against(replaced(u0, row(u0))),
  // The count alone one below the floor (the lists unchanged).
  belowFloor: () => gateProblems(pinOf(observe(baseRows())),
    { ...observe(baseRows()), validated: 2 }),
  acceptedRefused: () => against(replaced('v.wxw#b',
    refused('v.wxw#b', 'NotCertifiable ForcedTail', 'accepted', false))),
  admitted: () => admitted(baseRows()),
  malformed: () => admitted(replaced('v.wxw#a',
    row('v.wxw#a', { i3: 'MissingKey', validate: 'Malformed MissingKey',
      certify: 'accepted' }))),
  extraFault: () => admitted(replaced('v.wxw#a',
    faulted('v.wxw#a', 'Unread'))),
  missingFault: () => admitted(baseRows().filter(entry =>
    entry.at !== unreadImages[0])),
  // A named declaration refused otherwise than certify: three refusals
  // still, so only the refusal itself is named.
  otherRefusal: () => admitted(replaced(u2,
    refused(u2, 'NotCertifiable ForcedTail', 'accepted', false))),
  differentG0: () => admitted(replaced(u0,
    refused(u0, refusal, refusal, false))),
  fourUnjudged: () => admitted([...baseRows(),
    refused('w.wxw#a', refusal)]),
  // A named refusal now validated: a disappearance, admitted only
  // when explained.
  vanishedRefusal: () => admitted(replaced(u1, row(u1))),
  explainedVanish: () => admitted(replaced(u1, row(u1)), true),
  // A new (b) entry with G0's own refusal, three in all: refused.
  newRefusal: () => admitted(replaced(u2, row(u2)).map(entry =>
    (entry.at === 'v.wxw#a' ? refused('v.wxw#a', refusal) : entry)), true),
  // The re-pin rule.
  repinHolds: () => repinned(baseRows()).problems,
  repinKeeps: () => repinned(replaced(u1, row(u1)),
    { explanation: 'why' }).pin.explanations,
  withoutRepin: () => repinned(baseRows(), { repin: false }).problems,
  repinVanish: () => repinned(replaced(u1, row(u1))).problems,
  repinLowered: () => repinned(replaced('v.wxw#a',
    refused('v.wxw#a', refusal))).problems,
  // §18.157: an explanation never permits a lower floor or candidate
  // count. A validated package refused lowers the floor; an approved
  // fault gone with its declaration lowers the candidates only.
  explainedFloor: () => repinned(replaced('v.wxw#a',
    refused('v.wxw#a', refusal)), { explanation: 'why' }).problems,
  explainedCandidates: () => repinned(baseRows().filter(entry =>
    entry.at !== unreadImages[0]), { explanation: 'why' }).problems,
  // An equal or higher floor and count, explained: accepted.
  explainedEqual: () => repinned(baseRows(),
    { explanation: 'why' }).problems,
  explainedHigher: () => repinned([...baseRows(), row('v.wxw#d')],
    { explanation: 'why' }).problems,
  repinMissing: () => repin({ denominators: {} },
    { denominators: { d: pinOf(observe(baseRows())) } },
    { repin: true }).problems
});
