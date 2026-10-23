// RT8's accounting (T-R0b §9 item 8; plan Task 4.3 Step 1; acceptance
// criterion 4): each declaration's class, from today's checker result
// and the shadow run's decision (Features.Check.Decide.Shadow, `online`
// alone, no refuter or rule). A class is expected, labelled §3.2(a) or
// §3.2(b) where the plan labels it, or a defect. An inability to solve
// is never a refutation: today's refusal against the online search's
// `NoCandidate` is agreement, and no class reads a decline or an
// Unresolved as a contradiction. A `RequirementUnjudged` refusal is a
// defect of the strategy (guard and check disagree), counted, not hidden.
import { describe } from './r0-decide-support.mjs';

// Review I-1: a Solved whose candidate bound a hole (ReadBack step 4).
export const boundHoleClass =
  'Solved with a bound hole (pending the author\'s ambiguity ruling)';

const named = value => value.constructor.name;

// The online attempt is the first: `shadowChecking` has one strategy.
const onlineAttempt = decision => decision.attempts[0];

const refusal = attempt => named(attempt.value2);

const accepted = (decision, attempt, holes) => {
  const verdict = describe({ constructor: { name: 'Right' },
    value0: decision }).verdict;
  switch (named(attempt)) {
  case 'Accepted':
    if (verdict !== 'Solved') return `(a) blocked: ${verdict}`;
    return holes.length > 0 ? boundHoleClass : 'agree: Solved';
  case 'Declined': return '(b) declined by g0Guard';
  case 'CheckFailed':
    // The backstop first: a defect whatever the claim (review I-2).
    if (refusal(attempt) === 'RequirementUnjudged')
      return 'DEFECT: candidate refused, RequirementUnjudged';
    if (named(attempt.value1) === 'Heuristic')
      return 'ambiguous several-tail read-back (Heuristic)';
    if (refusal(attempt) === 'RequirementOpen')
      return '(a) RequirementOpen';
    return `DEFECT: candidate refused, ${refusal(attempt)}`;
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
