// Support for Task 4.1's `decide` tests: the sources they record, and
// `describe`, which names a `decide` result's constructors as T-R0a §3
// writes them (`Unresolved Inference NoAcceptedCertificate`,
// `CheckFailed ClaimsComplete Unsatisfied`), so a test compares text.
const main = 'fn main(): Int = 0;\n';
export const sources = {
  main,
  // E7's `eq Bool Int`: a refutable atom.
  clash: `fn f(): Int = 1 + true;\n${main}`,
  // A `DataApplication` marker beside the same atom (test/r0-markers).
  boxed: `type Box(a) = Box(a);\nfn f(): Int = { let b = Box(1);`
    + ` 1 + true };\n${main}`,
  // `D` holds `lacks r a`.
  lacking: `fn f(p: { ...r }): Int where r lacks { a } = 1;\n${main}`
};

const named = value => value.constructor.name;

const unsupport = value => named(value) === 'Outside'
  ? `Outside ${named(value.value0)}` : named(value);

const limit = at => `${named(at.limit)}@${({ InBody: 'body' })[
  named(at.site.root)] ?? named(at.site.root)}`;

const reasons = {
  Inference: failure => `Inference ${named(failure)}`,
  Unsupported: all => `Unsupported ${all.map(unsupport).join(', ')}`,
  Limit: all => `Limit ${all.map(limit).join(', ')}`
};

const verdict = value => {
  switch (named(value)) {
  case 'Solved': return 'Solved';
  case 'Contradiction': return `Contradiction ${named(value.value0)}`;
  case 'Unresolved': return `Unresolved ${reasons[named(
    value.value0.reason)](value.value0.reason.value0)}`;
  }
  throw new Error(`unknown verdict ${named(value)}`);
};

const end = value => named(value) === 'NoCounterInstance'
  ? `NoCounterInstance ${named(value.value0)}` : named(value);

const attempts = {
  Declined: value => `Declined ${unsupport(value.value1)}`,
  Searched: value => `Searched ${named(value.value1)}`,
  CheckFailed: value =>
    `CheckFailed ${named(value.value1)} ${named(value.value2)}`,
  Accepted: () => 'Accepted',
  RefuterEnded: value => `RefuterEnded ${end(value.value1)}`,
  Shadow: value => `Shadow ${named(value.value0.result)}`
};

const faults = {
  CandidateRefused: value => `CandidateRefused ${named(value.value1)}`,
  SearchBroke: () => 'SearchBroke'
};

const internal = {
  BothVerdicts: value => `BothVerdicts ${named(value.value1)}`,
  DerivationRefused: value => `DerivationRefused ${named(value.value1)}`,
  BrokenInvariant: () => 'BrokenInvariant'
};

// `{ fault }` for a `Left`, else the decision's three fields.
export const describe = result => {
  if (named(result) === 'Left')
    return { fault: internal[named(result.value0)](result.value0) };
  const decision = result.value0;
  return { verdict: verdict(decision.verdict),
    attempts: decision.attempts.map(item => attempts[named(item)](item)),
    searchFaults: decision.searchFaults.map(item =>
      faults[named(item)](item)) };
};

// The verdict class AT7 compares: Solved, Contradiction, Unresolved or
// Faulted.
export const verdictClass = result => named(result) === 'Left'
  ? 'Faulted' : named(result.value0.verdict);
