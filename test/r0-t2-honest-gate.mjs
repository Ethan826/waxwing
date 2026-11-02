// Tranche 2 Task 13's gate (design §I Task 8; dossier §18.155 (7)): pure
// functions over the rows of test/r0-t2-honest-report.mjs, shared by the
// serial test, the pin script (scripts/r0-t2-honest-pin.mjs) and the
// regression probes. Per denominator the pin holds (a) the declarations
// without a package, each with its read fault, (b) the packages I3 or
// the validator refuses, each with its refusal, and (c) the floor on
// validated packages, candidates − |a| − |b|.
//
// `admission` is ruling (7)'s condition on an initial pin: (a) exactly
// the identified unsupported declarations (`Declined`) and the two
// statsEvidence `UnreadImage`s; (b) at most three entries, each a
// `RequirementUnjudged` that today's `certify` gives too, the same
// refusal by its own Eq (checked per entry). Anything else, a
// `Malformed` included, is a stop: it names the entry, never adjusts.
// `gateProblems` compares an observation with a pin in both directions.
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

const byAt = (left, right) => (left.at < right.at ? -1 : 1);

// One denominator's observation: its lists and counts.
export const observe = rows => ({
  candidates: rows.length,
  validated: rows.filter(row => row.validate === 'validated').length,
  malformed: rows.filter(row => row.i3 !== null && row.i3 !== 'ok')
    .map(row => ({ at: row.at, i3: row.i3 })),
  faults: rows.filter(row => row.read !== 'package')
    .map(row => ({ at: row.at, fault: row.read })).sort(byAt),
  refusals: rows.filter(row => row.read === 'package'
    && row.validate !== 'validated')
    .map(row => ({ at: row.at, refusal: row.validate,
      certify: row.certify, sameG0: row.sameG0 })).sort(byAt),
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

// Ruling (7)'s condition for initializing the pin from `observed`, for a
// denominator whose candidates have the origins in `origins`.
export const admission = (observed, origins) => {
  const problems = observed.malformed.map(entry =>
    `Malformed: ${entry.at} ${entry.i3}`);
  const inside = at => origins.has(at.slice(0, at.lastIndexOf('#')));
  const allowed = new Map([
    ...Object.entries(unsupported).map(([at, kind]) =>
      [at, `Declined ${kind}`]),
    ...unreadImages.map(at => [at, 'UnreadImage'])]
    .filter(([at]) => inside(at)));
  const seen = new Map(observed.faults.map(entry =>
    [entry.at, entry.fault]));
  for (const [at, fault] of seen)
    if (!approved(allowed.get(at), fault))
      problems.push(`read fault not approved: ${at} ${fault}`);
  for (const [at, fault] of allowed)
    if (!approved(fault, seen.get(at)))
      problems.push(`approved read fault not observed: ${at} ${fault}`);
  for (const entry of observed.refusals)
    if (!isUnjudged(entry.refusal) || !entry.sameG0
      || entry.certify !== entry.refusal)
      problems.push(`unexpected validator refusal: ${entry.at} `
        + `${entry.refusal} (certify: ${entry.certify})`);
  if (observed.refusals.length > maxUnjudged)
    problems.push(`${observed.refusals.length} refusals, more than `
      + `${maxUnjudged}`);
  return problems;
};

// The pin of one denominator, derived only from (a), (b) and the count.
export const pinOf = observed => ({
  candidates: observed.candidates,
  faults: observed.faults,
  refusals: observed.refusals.map(entry =>
    ({ at: entry.at, refusal: entry.refusal })),
  floor: observed.candidates - observed.faults.length
    - observed.refusals.length
});

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
  const refusals = listed(observed.refusals);
  // Pinned (a) and (b): the only declarations not validated.
  const excused = new Set([...pin.faults, ...pin.refusals]
    .map(entry => entry.at));
  const unvalidated = new Set([...observed.faults, ...observed.refusals]
    .map(entry => entry.at));
  return [
    ...apart('read fault', listed(pin.faults), faults),
    ...apart('refusal', listed(pin.refusals), refusals),
    ...(observed.candidates === pin.candidates ? []
      : [`candidates ${observed.candidates}, pinned ${pin.candidates}`]),
    ...(observed.validated >= pin.floor ? []
      : [`validated ${observed.validated} below the floor ${pin.floor}`]),
    ...observed.malformed.map(entry => `Malformed: ${entry.at}`),
    ...observed.accepted.filter(at => unvalidated.has(at)
      && !excused.has(at))
      .map(at => `certify accepts, not validated nor pinned: ${at}`)];
};
