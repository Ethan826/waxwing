// Task 4.5: the window table's classes (plan Task 4.5 Step 2; §3.1,
// §3.2; Review Focus 1). A declaration's window class is read from
// RT8's class (test/r0-rt8-account.mjs, reused, not rewritten), R0's
// verdict as `describe` names it, the static rules (Task 2.3/3.2), the
// census's erased-row detector (test-only, C-erased) and `g0Guard`'s
// reason. Every assignment is an explicit case; anything else throws,
// so no failure becomes a semantic claim. An inability to solve is
// never read as a refutation. T6 (dossier §18.161 (4)): an RT8 defect
// is kept as a row of its own defect class, reported, never thrown at
// load and never relabelled as a harmless class; a check's decline
// (RT8's, read as Decide reads it) has its own class.
import { boundHoleClass, checkDeclined, checkDeclinedRefused }
  from './r0-rt8-account.mjs';
import { defects, falseContradictions, knownValid }
  from './r0-shadow-known.mjs';
import { rt8DefectClass } from './r0-shadow-table.mjs';

export { classEntry, defectClasses, t6Classes, windowClasses }
  from './r0-shadow-table.mjs';

// Today's code for each static code the corpus reaches (Task 2.3).
const staticCodes = { 'StaticRule StaticArity': 'E_ARITY' };

const fail = (facts, why) => {
  throw new Error(`r0-shadow-classes: ${why}: ${facts.at} (${facts.rt8};`
    + ` ${facts.r0.verdict})`);
};

const valid = 'known-valid program; current solver cannot decide';

const declined = (facts, refused) => {
  if (facts.guard.length !== 1) fail(facts, 'a decline with no one reason');
  if (refused && facts.at in knownValid) return valid;
  const prefix = refused ? 'today refuses, ' : '';
  return `${prefix}${facts.guard[0] === 'rigid'
    ? 'BQ at a rigid variable' : 'outside the unitary fragment'}:`
    + ' online declines';
};

const compiles = facts => {
  const { rt8, erased } = facts;
  if (rt8 === 'agree: Solved')
    return erased.length > 0
      ? 'erased row: compiles today, census detector fires' : null;
  if (rt8 === boundHoleClass) return erased.length > 0
    ? 'erased row: compiles today, census detector fires' : boundHoleClass;
  if (rt8 === '(b) declined by g0Guard') return declined(facts, false);
  if (rt8 === '(a) RequirementOpen') return 'RequirementOpen: compiles today';
  if (rt8 === 'ambiguous several-tail read-back (Heuristic)') return rt8;
  if (rt8 === '(a) blocked: Unresolved Unsupported RequirementAtoms')
    return 'BQ pending G-ValidR: compiles today';
  if (checkDeclined.test(rt8))
    return 'the check declines the candidate: compiles today';
  // A trailing `EffectsUnchecked [UnframedInstall]` (§18.124, §18.126)
  // keeps the class: the row was already blocked by its markers.
  const outside = '^\\(a\\) blocked: Unresolved Unsupported Outside \\w+'
    + '(, Outside \\w+)*(, EffectsUnchecked \\[UnframedInstall\\])?$';
  if (new RegExp(outside).test(rt8))
    return 'markers: compiles today, R0 Unsupported Outside';
  return fail(facts, 'no window class where today compiles');
};

const noCandidate = facts => {
  const { verdict } = facts.r0;
  if (/^Unresolved Unsupported Outside /.test(verdict))
    return 'today refuses, R0 Unsupported Outside';
  if (verdict === 'Unresolved Unsupported RequirementAtoms')
    return 'today refuses, BQ pending G-ValidR';
  if (verdict !== 'Unresolved Inference NoCandidate')
    return fail(facts, 'an unexpected verdict with no candidate');
  if (facts.at in falseContradictions)
    return 'false contradiction (D6) becomes Unresolved';
  return facts.at in knownValid ? valid
    : 'today\'s refusal becomes Unresolved (no candidate)';
};

const refused = facts => {
  const { rt8, staticRefusals, today } = facts;
  if (staticRefusals.length > 0) {
    if (!staticRefusals.every(name => staticCodes[name] === today.code))
      fail(facts, 'a static refusal with another code');
    return null;
  }
  if (/^agree: no candidate \((Exhausted|OutOfBudget)\)$/.test(rt8))
    return noCandidate(facts);
  if (rt8 === '(b) declined by g0Guard, today refuses')
    return declined(facts, true);
  if (checkDeclinedRefused.test(rt8))
    return 'today refuses, the check declines the candidate';
  return fail(facts, 'no window class where today refuses');
};

// A declaration's window class, or `null` where today's class and R0's
// agree (no row): Solved with no pending boundary, or a static refusal
// with today's code.
export const windowClassOf = facts => {
  if (facts.at in defects) return 'defect';
  if (facts.rt8.startsWith('DEFECT')) return rt8DefectClass;
  return facts.today === null ? compiles(facts) : refused(facts);
};

// The agreement a `null` class stands for, for the summary.
export const agreementOf = facts => (facts.today === null
  ? 'agree: Solved' : 'agree: static refusal');
