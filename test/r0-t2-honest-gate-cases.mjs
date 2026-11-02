// Synthetic rows for Tranche 2 Task 13's gate (fixture-level), shaped as
// test/r0-t2-honest-report.mjs gives them, read by
// test/r0-t2-honest-gate.test.mjs and the gate's restored-defect probe
// (test/regression-r0-t2-honest.mjs). Each case returns the problems
// `gateProblems` or `admission` names; [] means it holds.
import { admission, gateProblems, observe, pinOf, unreadImages,
  unsupported } from './r0-t2-honest-gate.mjs';

export { admission };

const unjudged = 'RequirementUnjudged {"decl":0}';
const row = (at, fields = {}) => ({ at, read: 'package', i3: 'ok',
  validate: 'validated', certify: 'accepted', sameG0: false, ...fields });
const faulted = (at, read) => row(at, { read, i3: null, validate: null });
const refused = (at, refusal, certify = refusal, sameG0 = true) =>
  row(at, { validate: refusal, certify, sameG0 });

// One denominator: every approved fault, two RequirementUnjudged and
// three validated packages.
const baseRows = () => [
  ...Object.entries(unsupported).map(([at, kind]) =>
    faulted(at, `Declined ${kind}`)),
  ...unreadImages.map(at => faulted(at, 'UnreadImage {"FreshVar":[0]}')),
  refused('u.wxw#a', unjudged), refused('u.wxw#b', unjudged),
  row('v.wxw#a'), row('v.wxw#b'), row('v.wxw#c')];

const origins = rows => new Set(rows.map(entry =>
  entry.at.slice(0, entry.at.lastIndexOf('#'))));

const against = rows => gateProblems(pinOf(observe(baseRows())),
  observe(rows));

const admitted = rows => admission(observe(rows), origins(baseRows()));

const replaced = (at, made) => baseRows().map(entry =>
  (entry.at === at ? made : entry));

export const gateCases = () => ({
  holds: () => against(baseRows()),
  extraRefusal: () => against(replaced('v.wxw#c',
    refused('v.wxw#c', unjudged))),
  // A pinned refusal now validated: only the vanished entry differs.
  removedEntry: () => against(replaced('u.wxw#a', row('u.wxw#a'))),
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
  otherRefusal: () => admitted(replaced('v.wxw#a',
    refused('v.wxw#a', 'NotCertifiable ForcedTail', 'accepted', false))),
  differentG0: () => admitted(replaced('u.wxw#a',
    refused('u.wxw#a', unjudged, unjudged, false))),
  fourUnjudged: () => admitted([...baseRows(),
    refused('w.wxw#a', unjudged), refused('w.wxw#b', unjudged)])
});
