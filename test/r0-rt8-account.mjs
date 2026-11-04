// RT8's accounting (T-R0b §9 item 8; plan Task 4.3 Step 1; acceptance
// criterion 4): each declaration's class, from today's checker result
// and the shadow run's decision (Features.Check.Decide.Shadow, `online`
// alone, no refuter or rule). A class is expected, labelled §3.2(a) or
// §3.2(b) where the plan labels it, or a defect. An inability to solve
// is never a refutation: today's refusal against the online search's
// `NoCandidate` is agreement, and no class reads a decline or an
// Unresolved as a contradiction. A `RequirementUnjudged` refusal is a
// defect of the strategy (guard and check disagree), counted, not hidden.
// T6 (dossier §18.161 (4)): a refused candidate is read as Decide reads
// it (Features.Check.Decide.Reading's `reading`, which names every
// `CheckRefusal` constructor with no wildcard; A2 spec §6), so an
// intended decline (`RequirementOpen`, `RecordDefect`, `NotCertifiable`)
// is a decline under either claim, and a defect stays a defect.
import { describe } from './r0-decide-support.mjs';
import { load } from './r0-generate-support.mjs';

const { reading } = await load('Features.Check.Decide.Reading');

// Review I-1: a Solved whose candidate bound a hole (ReadBack step 4).
export const boundHoleClass =
  'Solved with a bound hole (pending the author\'s ambiguity ruling)';
// Task 4.4: a Solved whose witness W §1.5's syntactic check refuses, so
// it has no compilation (a reason of Cov's own, never missing coverage).
export const holeContractClass =
  'Solved, no witness: HoleContract (W §1.5\'s check refuses a default)';

const named = value => value.constructor.name;

// The online attempt is the first: `shadowChecking` has one strategy.
const onlineAttempt = decision => decision.attempts[0];

const refusal = attempt => named(attempt.value2);

// A check's decline, by its refusal and R0's verdict where today
// accepts; by its refusal alone where today refuses (T6).
export const checkDeclined = /^declined by the check \(\w+\): /;
export const checkDeclinedRefused =
  /^declined by the check \(\w+\), today refuses$/;
const declinedBy = attempt => `declined by the check (${refusal(attempt)})`;
const verdictOf = decision => describe({ constructor: { name: 'Right' },
  value0: decision }).verdict;

// A Solved's compilation (Task 4.4): `null` when witnessed. The online
// adapter binds every flexible variable, so `Uncovered` is its defect,
// and so is the placeholder it replaced.
const unwitnessed = compilation => {
  if (named(compilation) === 'Witnessed') return null;
  const reason = named(compilation.value0);
  if (reason === 'HoleContract') return holeContractClass;
  return `DEFECT: Solved, no witness: ${reason}`;
};

// Every accepted candidate's compilation, blocked or not, for RT8's
// `witnesses` tally (Task 4.4): its class, and the variable a missing
// witness names; `null` where no candidate was accepted.
export const witnessFor = result => {
  if (named(result) === 'Left') return null;
  const attempt = onlineAttempt(result.value0);
  if (attempt === undefined || named(attempt) !== 'Accepted') return null;
  const compilation = attempt.value2;
  if (named(compilation) === 'Witnessed') return { class: 'Witnessed' };
  const reason = compilation.value0;
  // NonConstructive names a strategy, the others a variable.
  return { class: `NoWitness ${named(reason)}`,
    variable: named(reason) === 'NonConstructive' ? null : reason.value0 };
};

// A `CheckFailed` where today accepts. The backstop first: a defect
// whatever the claim (review I-2). Then Decide's reading: a decline is
// expected (a `RequirementOpen` keeps its §3.2(a) label); a refused
// Heuristic candidate is the ambiguous several-tail read-back; a refused
// ClaimsComplete candidate, or any other reading, is a defect.
const checkFailed = (decision, attempt) => {
  if (refusal(attempt) === 'RequirementUnjudged')
    return 'DEFECT: candidate refused, RequirementUnjudged';
  const read = named(reading(attempt));
  switch (read) {
  case 'Declines': return refusal(attempt) === 'RequirementOpen'
    ? '(a) RequirementOpen'
    : `${declinedBy(attempt)}: ${verdictOf(decision)}`;
  case 'RefusedHeuristic':
    return 'ambiguous several-tail read-back (Heuristic)';
  case 'RefusedComplete':
    return `DEFECT: candidate refused, ${refusal(attempt)}`;
  }
  // `RanOut`, `Searching`, `RefuterRanOut`, `NotAStrategy`: never a
  // refused candidate's reading, so a defect, not a class.
  return `DEFECT: a refused candidate read as ${read}`;
};

const accepted = (decision, attempt, holes) => {
  switch (named(attempt)) {
  case 'Accepted': {
    const verdict = verdictOf(decision);
    if (verdict !== 'Solved') return `(a) blocked: ${verdict}`;
    return unwitnessed(attempt.value2)
      ?? (holes.length > 0 ? boundHoleClass : 'agree: Solved');
  }
  case 'Declined': return '(b) declined by g0Guard';
  case 'CheckFailed': return checkFailed(decision, attempt);
  case 'Searched':
    return `DEFECT: no candidate where today accepts,`
      + ` ${named(attempt.value1)}`;
  }
  return `DEFECT: attempt ${named(attempt)}`;
};

const rejected = attempt => {
  switch (named(attempt)) {
  case 'Searched': {
    const end = named(attempt.value1);
    return end === 'Broke' ? "today's own internal failure (SearchBroke)"
      : `agree: no candidate (${end})`;
  }
  case 'Declined': return '(b) declined by g0Guard, today refuses';
  // T6: Decide's decline is expected here too; any other refusal is not.
  case 'CheckFailed': return named(reading(attempt)) === 'Declines'
    ? `${declinedBy(attempt)}, today refuses`
    : 'DEFECT: CheckFailed where today refuses';
  }
  return `DEFECT: ${named(attempt)} where today refuses`;
};

// One declaration's class. `holes`: the holes the online candidate
// bound (its certificate's `holes`; ReadBack step 4, a provisional
// reading pending the author's ambiguity ruling), so a Solved resting on
// one is its own class.
export const accountFor = (today, result, holes = []) => {
  if (named(result) === 'Left')
    return `DEFECT: Faulted ${named(result.value0)}`;
  const decision = result.value0;
  if (named(decision.verdict) === 'Contradiction')
    return 'DEFECT: a contradiction with no refuter or rule';
  const attempt = onlineAttempt(decision);
  return named(today) === 'Right' ? accepted(decision, attempt, holes)
    : rejected(attempt);
};

export const isDefect = name => name.startsWith('DEFECT');
