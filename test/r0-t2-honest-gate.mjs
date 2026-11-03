// Tranche 2 Task 13's gate (design §I Task 8; dossier §18.155 (7)): pure
// functions over the rows of test/r0-t2-honest-report.mjs, shared by the
// serial test, the pin script (scripts/r0-t2-honest-pin.mjs) and the
// regression probes. Per denominator the pin holds (a) the declarations
// without a package, each with its read fault, (b) the packages I3 or
// the validator refuses, each with its refusal, apart from (b′) the
// admitted `NotCertifiable ForcedTail` refusals (§18.157), recorded
// separately, and (c) the floor on validated packages,
// candidates − |a| − |b| − |b′|.
//
// `admission` is ruling (7)'s condition on an initial pin: (a) exactly
// the identified unsupported declarations (`Declined`) and the two
// statsEvidence `UnreadImage`s; (b) only the three named
// `RequirementUnjudged` declarations, each with the refusal today's
// `certify` gives, the same by its own Eq (checked per entry); (b′) only
// the four named declarations `certify` accepts, each refused
// `NotCertifiable ForcedTail` (§18.157: known compatibility gaps, not an
// approved loss); an approved entry missing only with an explanation.
// Anything else, a `Malformed` included, is a stop: it names the entry,
// never adjusts.
// `gateProblems` compares an observation with a pin in both directions.
// Both name a declaration the rows hold twice.
const baseline = 'docs/plans/2026-10-21-c001-explicit/baseline/';

// The identified unsupported declarations (design §A), their kind.
export const unsupported = {
  'test/fx008-probes/f3.wxw#main': 'UnframedInstall',
  'test/fx008-probes/rev7/late1.wxw#main': 'UnframedInstall',
  'test/fx008-probes/rev7/late2.wxw#main': 'UnframedInstall',
  'test/fx008-probes/rev8/one3.wxw#main': 'UnframedInstall',
  'test/fx008-probes/rev8/two3.wxw#main': 'UnframedInstall',
  'test/fx008-probes/rigid.wxw#main': 'UnframedInstall',
  'test/fixtures/r0/audit/expected-handler.pinned-selection.json#k':
    'UnframedInstall',
  'test/fx008-defer-programs.mjs:r2#1#run': 'UnframedInstall',
  'test/fx008-defer-programs.mjs:r9#1#main': 'UnframedInstall',
  'inline:fx032#g': '(OperationWithRow 1 0)'
};

// The two declarations whose auxiliary images hold an arrow (§18.155
// (6)); they get no invented effects.
export const unreadImages = [
  `${baseline}c7-pure-stages-construction.wxw#statsEvidence`,
  `${baseline}q7-pure-construction.wxw#statsEvidence`];

export const maxUnjudged = 3;

// The four ForcedTail refusals the author admitted (§18.157), by
// identity; a fifth, or one of these refused otherwise, is not admitted.
export const forcedTail = [
  'editors/vscode/fixtures/effect-namespaces.wxw#main',
  'examples/services.wxw#main',
  'test/fx-services-programs.mjs:fake#1#main',
  'test/fx008-defer-programs.mjs:aroundBoth#1#around'];

// A `NotCertifiable ForcedTail` refusal, by its whole constructor
// name: `NotCertifiable ForcedTailX` is not one (final review B-M3).
const forcedKind = 'NotCertifiable ForcedTail';
export const isForced = text => text === forcedKind
  || text.startsWith(`${forcedKind} `);

const byAt = (left, right) => (left.at < right.at ? -1 : 1);

// The packages the validator refuses, with certify's verdict.
const refusedOf = rows => rows.filter(row => row.read === 'package'
  && row.validate !== 'validated')
  .map(row => ({ at: row.at, refusal: row.validate,
    certify: row.certify, sameG0: row.sameG0 })).sort(byAt);

// The declarations met more than once among the rows: each row is one
// declaration, so a repeat would count it twice (final review B-M6).
const repeatedOf = rows => {
  const seen = new Set();
  const repeated = new Set();
  for (const row of rows) {
    if (seen.has(row.at)) repeated.add(row.at);
    seen.add(row.at);
  }
  return [...repeated].sort();
};

// One denominator's observation: its lists and counts.
export const observe = rows => ({
  candidates: rows.length,
  repeated: repeatedOf(rows),
  validated: rows.filter(row => row.validate === 'validated').length,
  malformed: rows.filter(row => row.i3 !== null && row.i3 !== 'ok')
    .map(row => ({ at: row.at, i3: row.i3 })),
  faults: rows.filter(row => row.read !== 'package')
    .map(row => ({ at: row.at, fault: row.read })).sort(byAt),
  refusals: refusedOf(rows).filter(entry => !isForced(entry.refusal)),
  forcedTail: refusedOf(rows).filter(entry => isForced(entry.refusal)),
  // Declarations today's `certify` accepts: each must be validated or
  // in (a) or (b).
  accepted: rows.filter(row => row.certify === 'accepted')
    .map(row => row.at).sort()
});

// An approved fault is named by its constructor and, for `Declined`,
// its kind; an `UnreadImage` names its variable after that.
const approved = (allowed, fault) => allowed !== undefined
  && fault !== undefined
  && (fault === allowed || fault.startsWith(`${allowed} `));

const isUnjudged = text => text.startsWith('RequirementUnjudged ');

// The three candidates `certify` refuses today (`RequirementUnjudged`),
// the only ones list (b) may hold, each with that same refusal.
export const unjudged = [
  'examples/records.wxw#details',
  'research/division-campaign/r0/probes/f05-print-key.wxw#shown',
  'research/division-campaign/compile/split-selection.md#1#divide'];

const inside = origins => at =>
  origins.has(at.slice(0, at.lastIndexOf('#')));

// The approved read faults of a denominator, by declaration.
const allowedFaults = origins => new Map([
  ...Object.entries(unsupported).map(([at, kind]) =>
    [at, `Declined ${kind}`]),
  ...unreadImages.map(at => [at, 'UnreadImage'])]
  .filter(([at]) => inside(origins)(at)));

// The approved entries of (a) and (b) the observation lacks: each a
// disappearance, which needs an explanation (ruling (7)).
export const vanishedApproved = (observed, origins) => {
  const faults = new Map(observed.faults.map(entry =>
    [entry.at, entry.fault]));
  const refused = new Set([...observed.refusals, ...observed.forcedTail]
    .map(entry => entry.at));
  return [
    ...[...allowedFaults(origins)].filter(([at, fault]) =>
      !approved(fault, faults.get(at)))
      .map(([at, fault]) => `approved read fault not observed: ${at} `
        + fault),
    ...[...unjudged, ...forcedTail].filter(at => inside(origins)(at)
      && !refused.has(at))
      .map(at => `approved refusal not observed: ${at}`)];
};

// Ruling (7)'s condition for initializing the pin from `observed`, for a
// denominator whose candidates have the origins in `origins`. A
// disappearance is a problem unless `explained`.
export const admission = (observed, origins, explained = false) => {
  const problems = [...observed.repeated.map(at =>
    `declaration repeated: ${at}`), ...observed.malformed.map(entry =>
    `Malformed: ${entry.at} ${entry.i3}`)];
  const allowed = allowedFaults(origins);
  for (const entry of observed.faults)
    if (!approved(allowed.get(entry.at), entry.fault))
      problems.push(`read fault not approved: ${entry.at} ${entry.fault}`);
  for (const entry of observed.refusals)
    if (!unjudged.includes(entry.at) || !isUnjudged(entry.refusal)
      || !entry.sameG0 || entry.certify !== entry.refusal)
      problems.push(`unexpected validator refusal: ${entry.at} `
        + `${entry.refusal} (certify: ${entry.certify})`);
  for (const entry of observed.forcedTail)
    if (!forcedTail.includes(entry.at) || entry.certify !== 'accepted')
      problems.push(`ForcedTail not admitted: ${entry.at} `
        + `${entry.refusal} (certify: ${entry.certify})`);
  if (observed.refusals.length > maxUnjudged)
    problems.push(`${observed.refusals.length} refusals, more than `
      + `${maxUnjudged}`);
  return explained ? problems
    : [...problems, ...vanishedApproved(observed, origins)];
};

// The pin of one denominator, derived only from (a), (b) and the count.
export const pinOf = observed => ({
  candidates: observed.candidates,
  faults: observed.faults,
  refusals: observed.refusals.map(pinEntry),
  forcedTail: observed.forcedTail.map(pinEntry),
  floor: observed.candidates - observed.faults.length
    - observed.refusals.length - observed.forcedTail.length
});

const pinEntry = entry => ({ at: entry.at, refusal: entry.refusal });

const listed = entries => entries.map(entry =>
  `${entry.at} ${entry.fault ?? entry.refusal}`);

const apart = (name, pinned, found) => [
  ...found.filter(item => !pinned.includes(item))
    .map(item => `${name} not pinned: ${item}`),
  ...pinned.filter(item => !found.includes(item))
    .map(item => `${name} pinned, not observed: ${item}`)];

// Every way `observed` departs from `pin` (one denominator); [] holds.
export const gateProblems = (pin, observed) => {
  const faults = listed(observed.faults);
  // Pinned (a), (b) and (b′): the only declarations not validated.
  const excused = new Set([...pin.faults, ...pin.refusals,
    ...pin.forcedTail].map(entry => entry.at));
  const unvalidated = new Set([...observed.faults, ...observed.refusals,
    ...observed.forcedTail].map(entry => entry.at));
  return [
    ...observed.repeated.map(at => `declaration repeated: ${at}`),
    ...apart('read fault', listed(pin.faults), faults),
    ...apart('refusal', listed(pin.refusals), listed(observed.refusals)),
    ...apart('ForcedTail', listed(pin.forcedTail),
      listed(observed.forcedTail)),
    ...(observed.candidates === pin.candidates ? []
      : [`candidates ${observed.candidates}, pinned ${pin.candidates}`]),
    ...(observed.validated >= pin.floor ? []
      : [`validated ${observed.validated} below the floor ${pin.floor}`]),
    ...observed.malformed.map(entry => `Malformed: ${entry.at}`),
    ...observed.accepted.filter(at => unvalidated.has(at)
      && !excused.has(at))
      .map(at => `certify accepts, not validated nor pinned: ${at}`)];
};
