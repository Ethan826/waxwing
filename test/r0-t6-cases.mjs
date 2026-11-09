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
import { accountFor, isDefect } from './r0-rt8-account.mjs';
import { windowClassOf, windowClasses } from './r0-shadow-classes.mjs';
import { compilingDecline, refusedDecline, rt8DefectClass, t6Classes }
  from './r0-shadow-table.mjs';
import { summaryOf } from './r0-shadow-summary.mjs';

const Search = await load('Domain.Verdict.Search');
const Verdict = await load('Domain.Verdict');
const Effect = await load('Domain.Recorded.Effect');
const { Left, Right } = await load('Data.Either');

const name = Verdict.OnlineSolver.value;
const atom = { decl: 0, path: { root: null, steps: [] }, index: 0 };
const provenance = new Effect.InRecord({ decl: 0, table: null,
  path: null });
const at = { provenance, check: 0 };
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
const declines = (kind, refusal) =>
  `declined by the check, ${kind} (${refusal})`;
const accepts = (refusal, kind = 'a limitation', text = verdictText) =>
  `${declines(kind, refusal)}: ${text}`;
const refusesDeclined = (refusal, kind = 'a limitation') =>
  `${declines(kind, refusal)}, today refuses`;
const refusesDefect = 'DEFECT: CheckFailed where today refuses';
const generation = 'DEFECT: generation defect, RecordDefect';
const blocked = 'DEFECT: generation defect, RecordDefective block in the'
  + ' verdict';
// G0's refusals: ambiguous when the candidate is Heuristic.
const g0 = refusal => [refused(refusal), ambiguous, refusesDefect];
// The validator's: a defect under either claim (fix round 1, I2).
const validator = refusal => [refused(refusal),
  `DEFECT: Heuristic candidate refused, ${refusal}`, refusesDefect];

export const refusalClasses = {
  RequirementOpen: [open, open,
    refusesDeclined('RequirementOpen', 'an open requirement')],
  Unsatisfied: g0('Unsatisfied'),
  Undefined: g0('Undefined'),
  NotEntailed: g0('NotEntailed'),
  RequirementFails: g0('RequirementFails'),
  // The backstop: a defect whatever the claim (review I-2).
  RequirementUnjudged: [refused('RequirementUnjudged'),
    refused('RequirementUnjudged'), refusesDefect],
  NotGeneric: g0('NotGeneric'),
  // Fix round 1, C1: a generation defect, never a decline.
  RecordDefect: [generation, generation, generation],
  Malformed: validator('Malformed'),
  NotCertifiable: [accepts('NotCertifiable'), accepts('NotCertifiable'),
    refusesDeclined('NotCertifiable')],
  ObligationFailed: validator('ObligationFailed')
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

const decided = (verdict, attempt) => new Right({ verdict,
  attempts: [attempt], searchFaults: [] });
const recordBlock = new Verdict.Unresolved({ reason: new Verdict
  .Unsupported([new Verdict.RecordDefective(provenance)]), hints: [] });
const certifying = limitation => decided(forced, new Verdict.CheckFailed(
  name, Verdict.ClaimsComplete.value, new Search.NotCertifiable(limitation,
    at)));

// Fix round 1, M2: each limitation; a record defect with its block, in
// every attempt and both of today's results (I1).
const moreRt8Cases = () => [
  ['NotCertifiable RigidExact', accountFor(today.accepts,
    certifying(Search.RigidExact.value)), accepts('NotCertifiable')],
  ['NotCertifiable UnsupportedRecorded', accountFor(today.accepts,
    certifying(new Search.UnsupportedRecorded({}))), accepts(
    'NotCertifiable')],
  ['RecordDefect with its block, Heuristic', accountFor(today.accepts,
    decided(recordBlock, new Verdict.CheckFailed(name,
      Verdict.Heuristic.value, refusals.RecordDefect()))), generation],
  ['RecordDefective block, Accepted', accountFor(today.accepts,
    decided(recordBlock, new Verdict.Accepted(name, null, null))), blocked],
  ['RecordDefective block, today refuses', accountFor(today.refuses,
    decided(recordBlock, new Verdict.Searched(name,
      Verdict.Exhausted.value))), blocked],
  ['RecordDefective block, declined', accountFor(today.refuses,
    decided(recordBlock, new Verdict.Declined(name,
      Verdict.RequirementAtoms.value))), blocked]];

const facts = (rt8, more = {}) => ({ at: 'p.wxw#f', rt8, today: null,
  r0: { verdict: verdictText, attempt: 'CheckFailed' }, staticRefusals: [],
  erased: [], guard: [], ...more });
const todayRefuses = { code: 'E_TYPE', text: 'Expected Int, found Bool' };
const compilesDecline = 'the check declines the candidate (a limitation):'
  + ' compiles today';
const refusesDecline = 'today refuses, the check declines the candidate'
  + ' (a limitation)';
// The minting comparison's own reading (§18.160): a read fault declines
// as `PackageUnread`, a constructor only the scratch change has.
const unread = accepts('PackageUnread', 'a read fault', 'Unresolved'
  + ' Unsupported EffectsUnread');

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
  ['decline, minting reading', classOf(facts(unread)),
    'the check declines the candidate (a read fault): compiles today'],
  ['decline, refuses', classOf(facts(refusesDeclined('NotCertifiable'),
    { today: todayRefuses })), refusesDecline],
  ['open requirement, refuses', classOf(facts(refusesDeclined(
    'RequirementOpen', 'an open requirement'), { today: todayRefuses })),
  'today refuses, the check declines the candidate (an open requirement)'],
  ['generation defect', classOf(facts(generation)), rt8DefectClass]];

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
  // M4: a known defect with an RT8 defect too is listed both ways.
  const both = summaryOf([programOf([{ ...rowOf('p.wxw#k', generation,
    'defect'), defect: { id: 'FX9' } }])]);
  return [
    ['RT8 defect counted', found.classes[rt8DefectClass]?.declarations, 1],
    ['decline counted', found.classes[compilesDecline]?.declarations, 1],
    ['RT8 defect listed', found.defects.join('\n'),
      `p.wxw#d: ${refused('NotCertifiable')}`],
    ['no T6 class unless present', Object.keys(plain.classes).join('\n'),
      Object.keys(windowClasses).join('\n')],
    ['known and RT8 defect both listed', both.defects.join('\n'),
      `p.wxw#k: FX9\np.wxw#k: ${generation}`],
    ['T6 classes apart', Object.keys(t6Classes).filter(key =>
      key in windowClasses).length, 0]];
};

// §18.163 (4): the two ruled labels, apart from the classes nearest them.
// A read-fault decline and a RequirementOpen are limits or open questions;
// the same outcome from a validator or generation refusal stays a defect.
// Rendering evidence only, in this file: 'a read fault is not a defect'
// and the window's 'decline, minting reading'. The committed `Unsupport` has no
// `EffectsUnread`, so RT8's read-fault branch is unrun until the real
// constructor lands (R038 (3)). The pairs below separate each ruled class
// from its nearest neighbor in the table.
const ruled = name => t6Classes[name];
const sectionOf = name => `section ${ruled(name).section}`;
const readFaultCompiles = compilingDecline('a read fault');
const openRefuses = refusedDecline('an open requirement');
const ruledCases = () => [
  ['read fault, compiles', sectionOf(readFaultCompiles), 'section §3.2(b)'],
  ['read fault, refuses', sectionOf(refusedDecline('a read fault')),
    'section §3.2(b)'],
  ['read fault: ruled, not a reading',
    ruled(readFaultCompiles).sectionReading, false],
  ['read fault: the loss stays unresolved',
    ruled(readFaultCompiles).target.includes('unresolved'), true],
  ['open requirement, refuses', sectionOf(openRefuses), 'section §3.2(a)'],
  ['open requirement: ruled, not a reading',
    ruled(openRefuses).sectionReading, false],
  ['open requirement: pending G-ValidR', ruled(openRefuses).dependency,
    'G-ValidR'],
  ['a read fault is not a defect', isDefect(unread), false],
  ['an open requirement is not a defect', isDefect(accountFor(today.refuses,
    checkFailed(Verdict.ClaimsComplete.value, 'RequirementOpen'))), false],
  ['Malformed where today refuses stays a defect', isDefect(accountFor(
    today.refuses, checkFailed(Verdict.ClaimsComplete.value, 'Malformed'))),
  true],
  ['ObligationFailed where today accepts stays a defect', isDefect(accountFor(
    today.accepts, checkFailed(Verdict.ClaimsComplete.value,
      'ObligationFailed'))), true],
  ['RecordDefect where today refuses stays a defect', isDefect(accountFor(
    today.refuses, checkFailed(Verdict.ClaimsComplete.value, 'RecordDefect'))),
  true],
  ['read fault, refuses: ruled, not a reading', ruled(refusedDecline(
    'a read fault')).sectionReading, false],
  ['limitation, refuses: a reading', ruled(refusedDecline('a limitation'))
    .sectionReading, true],
  ['read fault apart from a limitation: target', ruled(readFaultCompiles)
    .target === ruled(compilingDecline('a limitation')).target, false],
  ['read fault apart from a limitation: ruled', ruled(compilingDecline(
    'a limitation')).sectionReading, true],
  ['open requirement apart from a limitation: section',
    ruled(openRefuses).section === ruled(refusedDecline('a limitation'))
      .section, false]];

export const t6Cases = () => [...rt8Cases(), ...moreRt8Cases(),
  ...windowCases(), ...ruledCases(),
  ...summaryCases()];

// The cases whose found value differs from the expected one, by name.
export const wrongT6Cases = () => t6Cases()
  .filter(([, found, expected]) => found !== expected)
  .map(([caseName, found]) => `${caseName}: ${found}`);
