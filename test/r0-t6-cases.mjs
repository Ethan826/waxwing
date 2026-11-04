// T6 (dossier §18.161 (4)): the cases for RT8's accounting
// (test/r0-rt8-account.mjs) and the window reporter
// (test/r0-shadow-classes.mjs, test/r0-shadow-summary.mjs), shared by
// test/r0-t6-tooling.test.mjs and the regression probe
// (test/regression-r0-t6.mjs). RT8 must read an intended decline as a
// decline under either claim and keep every defect a defect; the window
// must report an RT8 defect as a row of its own defect class, never
// throw at load and never relabel it as a harmless class.
// `refusalClasses` names, per committed `CheckRefusal` constructor, its
// class where today accepts (ClaimsComplete, then Heuristic) and where
// today refuses; the test checks the names against the compiler's own.
import { load } from './r0-generate-support.mjs';
import { accountFor } from './r0-rt8-account.mjs';
import { windowClassOf, windowClasses } from './r0-shadow-classes.mjs';
import { rt8DefectClass, t6Classes } from './r0-shadow-table.mjs';
import { summaryOf } from './r0-shadow-summary.mjs';

const Search = await load('Domain.Verdict.Search');
const Verdict = await load('Domain.Verdict');
const { Left, Right } = await load('Data.Either');

const name = Verdict.OnlineSolver.value;
const atom = { decl: 0, path: { root: null, steps: [] }, index: 0 };
const at = { provenance: null, check: 0 };
const forced = new Verdict.Unresolved({ reason: new Verdict.Unsupported([
  new Verdict.EffectLimit(Search.ForcedTail.value)]), hints: [] });
const verdictText = 'Unresolved Unsupported EffectLimit ForcedTail';

// One value of each committed constructor.
const refusals = {
  RequirementOpen: () => new Search.RequirementOpen(atom),
  Unsatisfied: () => new Search.Unsatisfied(atom),
  Undefined: () => new Search.Undefined(atom),
  NotEntailed: () => new Search.NotEntailed(atom),
  RequirementFails: () => new Search.RequirementFails(atom),
  RequirementUnjudged: () => new Search.RequirementUnjudged(atom),
  NotGeneric: () => Search.NotGeneric.value,
  RecordDefect: () => new Search.RecordDefect(at),
  Malformed: () => new Search.Malformed(null),
  NotCertifiable: () => new Search.NotCertifiable(Search.ForcedTail.value,
    at),
  ObligationFailed: () => new Search.ObligationFailed(at)
};

const open = '(a) RequirementOpen';
const ambiguous = 'ambiguous several-tail read-back (Heuristic)';
const refused = refusal => `DEFECT: candidate refused, ${refusal}`;
const declines = refusal => `declined by the check (${refusal})`;
const accepts = refusal => `${declines(refusal)}: ${verdictText}`;
const refusesDeclined = refusal => `${declines(refusal)}, today refuses`;
const refusesDefect = 'DEFECT: CheckFailed where today refuses';
const substantive = refusal => [refused(refusal), ambiguous, refusesDefect];
const declined = refusal => [accepts(refusal), accepts(refusal),
  refusesDeclined(refusal)];

export const refusalClasses = {
  RequirementOpen: [open, open, refusesDeclined('RequirementOpen')],
  Unsatisfied: substantive('Unsatisfied'),
  Undefined: substantive('Undefined'),
  NotEntailed: substantive('NotEntailed'),
  RequirementFails: substantive('RequirementFails'),
  // The backstop: a defect whatever the claim (review I-2).
  RequirementUnjudged: [refused('RequirementUnjudged'),
    refused('RequirementUnjudged'), refusesDefect],
  NotGeneric: substantive('NotGeneric'),
  RecordDefect: declined('RecordDefect'),
  Malformed: substantive('Malformed'),
  NotCertifiable: declined('NotCertifiable'),
  ObligationFailed: substantive('ObligationFailed')
};

const today = { accepts: new Right({}), refuses: new Left({}) };
const checkFailed = (claim, refusal) => new Right({ verdict: forced,
  attempts: [new Verdict.CheckFailed(name, claim, refusals[refusal]())],
  searchFaults: [] });

// Each RT8 case: [name, the class found, the class expected].
const rt8Cases = () => Object.entries(refusalClasses).flatMap(
  ([refusal, [complete, heuristic, refusing]]) => [
    [`${refusal} ClaimsComplete`, accountFor(today.accepts, checkFailed(
      Verdict.ClaimsComplete.value, refusal)), complete],
    [`${refusal} Heuristic`, accountFor(today.accepts, checkFailed(
      Verdict.Heuristic.value, refusal)), heuristic],
    [`${refusal} today refuses`, accountFor(today.refuses, checkFailed(
      Verdict.ClaimsComplete.value, refusal)), refusing]]);

const facts = (rt8, more = {}) => ({ at: 'p.wxw#f', rt8, today: null,
  r0: { verdict: verdictText, attempt: 'CheckFailed' }, staticRefusals: [],
  erased: [], guard: [], ...more });
const todayRefuses = { code: 'E_TYPE', text: 'Expected Int, found Bool' };
const compilesDecline = 'the check declines the candidate: compiles today';
const refusesDecline = 'today refuses, the check declines the candidate';
// The minting comparison's own reading (§18.160): a read fault declines
// as `PackageUnread`, a constructor only the scratch change has.
const unread = 'declined by the check (PackageUnread): Unresolved'
  + ' Unsupported EffectsUnread';

const classOf = input => {
  try { return windowClassOf(input); } catch (error) {
    return `threw: ${error.message}`;
  }
};

const windowCases = () => [
  ['RT8 defect, compiles', classOf(facts(refused('NotCertifiable'))),
    rt8DefectClass],
  ['RT8 defect, refuses', classOf(facts(refusesDefect,
    { today: todayRefuses })), rt8DefectClass],
  ['decline, compiles', classOf(facts(accepts('NotCertifiable'))),
    compilesDecline],
  ['decline, minting reading', classOf(facts(unread)), compilesDecline],
  ['decline, refuses', classOf(facts(refusesDeclined('RecordDefect'),
    { today: todayRefuses })), refusesDecline]];

const rowOf = (at, rt8, className) => ({ at, today: 'compiles',
  r0: { verdict: verdictText }, rt8, class: className, blockers: [],
  programCompiles: true });
const programOf = rows => ({ origin: 'p.wxw', compiles: true,
  secondSpread: false, results: rows.map(row => ({ agreement: null, row })) });

// The summary lists T6's classes only where a row has one, and lists an
// RT8 defect among its defects.
const summaryCases = () => {
  const found = summaryOf([programOf([
    rowOf('p.wxw#d', refused('NotCertifiable'), rt8DefectClass),
    rowOf('p.wxw#e', accepts('NotCertifiable'), compilesDecline)])]);
  const plain = summaryOf([programOf([])]);
  return [
    ['RT8 defect counted', found.classes[rt8DefectClass]?.declarations, 1],
    ['decline counted', found.classes[compilesDecline]?.declarations, 1],
    ['RT8 defect listed', found.defects.join('\n'),
      `p.wxw#d: ${refused('NotCertifiable')}`],
    ['no T6 class unless present', Object.keys(plain.classes).join('\n'),
      Object.keys(windowClasses).join('\n')],
    ['T6 classes apart', Object.keys(t6Classes).filter(key =>
      key in windowClasses).length, 0]];
};

export const t6Cases = () => [...rt8Cases(), ...windowCases(),
  ...summaryCases()];

// The cases whose found value differs from the expected one, by name.
export const wrongT6Cases = () => t6Cases()
  .filter(([, found, expected]) => found !== expected)
  .map(([caseName, found]) => `${caseName}: ${found}`);
