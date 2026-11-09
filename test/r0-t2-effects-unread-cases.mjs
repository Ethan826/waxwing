// The real `EffectsUnread` from each read fault to RT8 and the window
// (dossier §18.170; the shadow-minting packet's section 4). Shared with
// the regression probe.
import { accountFor, isDefect } from './r0-rt8-account.mjs';
import { windowClassOf } from './r0-shadow-classes.mjs';
import { compilingDecline, refusedDecline, t6Classes }
  from './r0-shadow-table.mjs';
import { load } from './r0-generate-support.mjs';

const Search = await load('Domain.Verdict.Search');
const Verdict = await load('Domain.Verdict');
const Fault = await load('Features.Check.Strategy.ReadBack.Fault');
const { Left, Right } = await load('Data.Either');

const named = value => value.constructor.name;
const faults = Object.keys(Fault).filter(key => /^[A-Z]/.test(key)).sort();
const today = { accepts: new Right({}), refuses: new Left({}) };
const claim = Verdict.ClaimsComplete.value;

const decided = fault => {
  const reason = new Verdict.Unsupported([new Verdict.EffectsUnread(fault)]);
  return new Right({
    verdict: new Verdict.Unresolved({ reason, hints: [] }),
    attempts: [new Verdict.CheckFailed(Verdict.OnlineSolver.value, claim,
      new Search.PackageUnread(fault))],
    searchFaults: [] });
};
const accepted = fault => 'declined by the check, a read fault '
  + `(PackageUnread): Unresolved Unsupported EffectsUnread ${fault}`;
const refused = 'declined by the check, a read fault (PackageUnread), '
  + 'today refuses';

const factsOf = (rt8, todayFact) => ({ at: 'p.wxw#f', rt8, today: todayFact,
  r0: { verdict: 'v', attempt: 'CheckFailed' }, staticRefusals: [],
  erased: [], guard: [] });
const todayRefused = { code: 'E_TYPE', text: 'Expected Int, found Bool' };

export const faultNames = faults;

// One fault's checks: [name, found, expected].
const oneFault = fault => {
  const atAccepts = accountFor(today.accepts, decided(fault));
  const atRefuses = accountFor(today.refuses, decided(fault));
  const compiling = windowClassOf(factsOf(atAccepts, null));
  const refusing = windowClassOf(factsOf(atRefuses, todayRefused));
  const compilingName = compilingDecline('a read fault');
  const refusingName = refusedDecline('a read fault');
  return [
    [`${fault}: RT8 where today accepts`, atAccepts, accepted(fault)],
    [`${fault}: RT8 where today refuses`, atRefuses, refused],
    [`${fault}: not a defect`, isDefect(atAccepts), false],
    [`${fault}: window where today compiles`, compiling, compilingName],
    [`${fault}: window where today refuses`, refusing, refusingName],
    [`${fault}: §3.2(b) compiling`, t6Classes[compiling]?.section, '§3.2(b)'],
    [`${fault}: §3.2(b) refusing`, t6Classes[refusing]?.section, '§3.2(b)'],
    [`${fault}: the loss stays unresolved`,
      t6Classes[compiling]?.target.includes('unresolved'), true]];
};

// A genuine defect beside it stays a defect.
const defectBeside = name => {
  const refusal = name === 'Malformed' ? new Search.Malformed(null)
    : new Search.RecordDefect({ provenance: null, check: 0 });
  const result = new Right({
    verdict: new Verdict.Unresolved({ reason: new Verdict.Unsupported([]),
      hints: [] }),
    attempts: [new Verdict.CheckFailed(Verdict.OnlineSolver.value, claim,
      refusal)],
    searchFaults: [] });
  return [`${name} stays a defect`, isDefect(accountFor(today.accepts, result)),
    true];
};

export const unreadCases = () => [...faults.flatMap(oneFault),
  defectBeside('Malformed'), defectBeside('RecordDefect')];

export const wrongUnreadCases = () => unreadCases()
  .filter(([, found, expected]) => found !== expected)
  .map(([name, found]) => `${name}: ${found}`);

export const readingOf = fault => {
  const attempt = new Verdict.CheckFailed(Verdict.OnlineSolver.value, claim,
    new Search.PackageUnread(fault));
  return attempt;
};
export { named };
