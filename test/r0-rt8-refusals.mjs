// T6 (dossier §18.161 (4); fix round 1): RT8's reading of a refused
// candidate (test/r0-rt8-account.mjs). Decide's `reading`
// (Features.Check.Decide.Reading) answers whether a refusal raises a
// `CandidateRefused` search fault, not whether the refusal is intended,
// so RT8 adds its own rules on top of it:
// - a `RecordDefect` refusal, and any verdict carrying the
//   `RecordDefective` pre-search block (Decide/Reason.purs `defective`),
//   is a generation defect (statements §7; §18.159 criterion 7;
//   test/r0-a2-differential.mjs files it `GenerationDefect`), under
//   either claim and either of today's results;
// - `RequirementUnjudged` stays the backstop defect (review I-2);
// - a refused Heuristic candidate is the ambiguous several-tail
//   read-back only for G0's own refusals; the validator's (`Malformed`,
//   `ObligationFailed`) are defects;
// - a decline is expected by its kind, read from Decide's decline
//   reason: a limitation (`EffectLimit`, `EffectsUnchecked`, from
//   `NotCertifiable`) or a read fault (`EffectsUnread`, the form the
//   minting comparison's scratch change gives a read fault,
//   docs/plans/2026-11-04-minting-comparison-scratch.diff; absent from
//   the committed `Unsupport`). Any other decline reason is a defect.
import { describe } from './r0-decide-support.mjs';
import { load } from './r0-generate-support.mjs';

const { reading } = await load('Features.Check.Decide.Reading');

const named = value => value.constructor.name;
const refusal = attempt => named(attempt.value2);

export const ambiguousClass = 'ambiguous several-tail read-back (Heuristic)';
export const generationDefect = what => `DEFECT: generation defect, ${what}`;

// G0's refusals: a several-tail read-back G0 refuses is ambiguous.
const g0Refusals = ['Unsatisfied', 'Undefined', 'NotEntailed',
  'RequirementFails', 'NotGeneric'];

// Decide's decline reason (an `Unsupport` constructor) to its kind.
const kinds = { EffectLimit: 'a limitation',
  EffectsUnchecked: 'a limitation', EffectsUnread: 'a read fault' };
export const declineKinds = ['a limitation', 'a read fault'];
// Where today refuses, a `RequirementOpen` decline too.
export const refusedKinds = [...declineKinds, 'an open requirement'];

const kindPattern = list => list.join('|');
export const checkDeclined = new RegExp('^declined by the check, ('
  + `${kindPattern(declineKinds)}) \\(\\w+\\): `);
export const checkDeclinedRefused = new RegExp('^declined by the check, ('
  + `${kindPattern(refusedKinds)}) \\(\\w+\\), today refuses$`);

const verdictOf = decision => describe({ constructor: { name: 'Right' },
  value0: decision }).verdict;

// A verdict carrying A2's record-defect block.
const recordBlocked = verdict => named(verdict) === 'Unresolved'
  && named(verdict.value0.reason) === 'Unsupported'
  && verdict.value0.reason.value0.some(found =>
    named(found) === 'RecordDefective');

// A generation defect the decision shows, whatever today's result, or
// null.
export const generationDefectOf = (decision, attempt) => {
  if (attempt !== undefined && named(attempt) === 'CheckFailed'
    && refusal(attempt) === 'RecordDefect')
    return generationDefect('RecordDefect');
  return recordBlocked(decision.verdict)
    ? generationDefect('RecordDefective block in the verdict') : null;
};

const declinedBy = (attempt, kind) =>
  `declined by the check, ${kind} (${refusal(attempt)})`;

// A `CheckFailed` where today accepts.
export const checkFailedAccepted = (decision, attempt) => {
  if (refusal(attempt) === 'RequirementUnjudged')
    return 'DEFECT: candidate refused, RequirementUnjudged';
  const read = reading(attempt);
  switch (named(read)) {
  case 'Declines': {
    if (refusal(attempt) === 'RequirementOpen'
      && named(read.value0) === 'RequirementAtoms')
      return '(a) RequirementOpen';
    const kind = kinds[named(read.value0)];
    return kind === undefined ? `DEFECT: a decline read as ${named(
      read.value0)}` : `${declinedBy(attempt, kind)}: ${verdictOf(decision)}`;
  }
  case 'RefusedHeuristic': return g0Refusals.includes(refusal(attempt))
    ? ambiguousClass : `DEFECT: Heuristic candidate refused, ${refusal(
      attempt)}`;
  case 'RefusedComplete':
    return `DEFECT: candidate refused, ${refusal(attempt)}`;
  }
  // `RanOut`, `Searching`, `RefuterRanOut`, `NotAStrategy`: never a
  // refused candidate's reading, so a defect, not a class.
  return `DEFECT: a refused candidate read as ${named(read)}`;
};

// A `CheckFailed` where today refuses: only a decline is expected.
export const checkFailedRefused = attempt => {
  const read = reading(attempt);
  if (named(read) !== 'Declines' || refusal(attempt) === 'RequirementUnjudged')
    return 'DEFECT: CheckFailed where today refuses';
  const kind = refusal(attempt) === 'RequirementOpen'
    && named(read.value0) === 'RequirementAtoms' ? 'an open requirement'
    : kinds[named(read.value0)];
  return kind === undefined ? `DEFECT: a decline read as ${named(
    read.value0)}` : `${declinedBy(attempt, kind)}, today refuses`;
};
