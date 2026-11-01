import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf, problemOf } from './r0-a2-package.mjs';

// A2 Task 1 (docs/plans/2026-10-31-a2-validator-plan.md): the package
// types (spec §2.2), the forced tails F (spec §2.3, §2.4 (ii)) and the
// four refusals (spec §6) that later tasks build on.
const Forced = await load('Features.Check.Strategy.Effects.Forced');
const Search = await load('Domain.Verdict.Search');
const Effect = await load('Domain.Recorded.Effect');
const Maps = await load('Data.Map.Internal');
const Recorded = await load('Domain.Recorded');
const Package = await load('Domain.Verdict.EffectPackage');
const Atom = await load('Domain.Recorded.Atom');
const Hole = await load('Domain.Recorded.Hole');
const Sets = await load('Data.Set');
const { ordString } = await load('Data.Ord');
const Unfoldable = await load('Data.Unfoldable');

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
// Spec §12 C1: at `use`'s call of `mk()` the ResultC tail is forced.
const c1 = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
// Review Focus 5: a closed R gives a closed ResultC, so nothing is forced.
const closed = `${log}fn mk3(): Handler(nofail Ask with pure) with pure`
  + ' = handler Ask { ask() => () }; '
  + 'fn use4(): Unit = with mk3() { () }; fn main(): Unit = ();';

const role = variable => variable.value1;
const instancesOf = problem => Maps.toUnfoldable(Unfoldable.unfoldableArray)(
  Recorded.fields(problem).effects.instances).map(pair => pair.value1);
const imageOf = (map, key) => Maps.lookup(Atom.ordVar)(key)(map).value0;
const fromJust = maybe => maybe.value0;
const isClosedResultC = sig => sig.result instanceof Effect.MHandler
  && sig.result.value1.clauses.constructor.name === 'Just'
  && fromJust(sig.result.value1.clauses).tail.constructor.name === 'Nothing';

test('an empty package round-trips', () => {
  const empty = packageOf({});
  assert.deepEqual(Object.keys(empty).sort(),
    ['effects', 'marks', 'rows', 'types']);
  for (const name of Object.keys(empty))
    assert.equal(Maps.isEmpty(empty[name]), true, name);
});

test('forcedTails finds C1\'s tail', () => {
  const found = Forced.forcedTails(problemOf(c1, 'use'));
  assert.equal(found.length, 1);
  const [{ forced, source }] = found;
  assert.ok(forced instanceof Effect.EffFresh);
  assert.ok(role(forced) instanceof Effect.ResultClauses);
  assert.ok(source instanceof Effect.EffFresh);
  assert.ok(role(source) instanceof Effect.EffInst);
});

test('a closed ResultC forces nothing', () => {
  const problem = problemOf(closed, 'use4');
  // The premise: generation records the case, one closed ResultC.
  assert.equal(instancesOf(problem).filter(isClosedResultC).length, 1);
  assert.deepEqual(Forced.forcedTails(problem), []);
});

const row = (labels, tail) => ({ labels, tail });
const spec = positions => ({
  types: [
    [{ hole: 1 }, { arrow: ['Int',
      row([{ effect: 'Fail', args: [{ data: [3, [], []] }],
        mark: ['J', 'k', 'j'] }], { hole: 2 }),
      { record: { fields: [['a', { var: { rigid: 0 } }]],
        tails: [{ hole: 4 }] } }] }],
    [{ rigid: 5 }, { handler: [{ effect: 7, args: [], mark: 'M' },
      { inference: row([], { rigid: 3 }), clauses: null }] }],
    [{ rigid: 6 }, { handler: [{ effect: 'Console', args: [], mark: 'N' },
      { inference: row([], null), clauses: row([], { hole: 8 }) }] }],
    [{ hole: 10 }, { dataBase: 3 }],
    [{ rigid: 11 }, raw]],
  rows: [[{ hole: 9 }, { fields: [['b', 'Bool']], tails: [{ rigid: 2 }] }]],
  effects: [[{ effRigid: 2 }, row([], { rigid: 1 })]],
  marks: [[positions[0], 'M']]
});
const raw = new Package.PVar(Hole.holeVar(3));

test('a non-empty package round-trips', () => {
  const { positions } = Recorded.fields(problemOf(c1, 'use')).effects;
  const built = packageOf(spec(positions));
  assert.deepEqual(['types', 'rows', 'effects', 'marks'].map(name =>
    Maps.size(built[name])), [5, 1, 1, 1]);
  const arrow = imageOf(built.types, Hole.holeVar(1));
  assert.ok(arrow instanceof Package.PArrow);
  const [fail] = arrow.value1.labels;
  assert.ok(fail.mark instanceof Package.TermJ);
  assert.deepEqual(['j', 'k', 'z'].map(name =>
    Sets.member(ordString)(name)(fail.mark.value0)), [true, true, false]);
  assert.ok(fromJust(arrow.value1.tail) instanceof Package.PTailHole);
  assert.ok(arrow.value2 instanceof Package.PRecord);
  const closedC = imageOf(built.types, new Atom.RigidVar(5));
  assert.equal(closedC.value1.clauses.constructor.name, 'Nothing');
  const ownedC = imageOf(built.types, new Atom.RigidVar(6));
  assert.equal(fromJust(fromJust(ownedC.value1.clauses).tail).value0, 8);
  const nullary = imageOf(built.types, Hole.holeVar(10));
  assert.ok(nullary.value0 instanceof Atom.DataBase);
  assert.equal(imageOf(built.types, new Atom.RigidVar(11)), raw);
  assert.ok(imageOf(built.rows, Hole.holeVar(9)).tails[0]
    instanceof Atom.RigidVar);
});

test('a key of the wrong sort throws', () => {
  const effectRow = row([], null);
  for (const wrong of [{ effects: [[{ hole: 9 }, effectRow]] },
    { effects: [[{ rigid: 9 }, effectRow]] },
    { types: [[{ effRigid: 1 }, 'Int']] },
    { types: [[new Effect.EffRigid(1), 'Int']] },
    { rows: [[{ effRigid: 1 }, { fields: [], tails: [] }]] },
    { marks: [[{ rigid: 0 }, 'N']] }])
    assert.throws(() => packageOf(wrong), /key/, JSON.stringify(wrong));
});

test('the refusals construct', () => {
  const { obligations } = Recorded.fields(problemOf(c1, 'use')).effects;
  const at = check => ({ provenance: obligations[0].provenance, check });
  const key = new Search.KeyEffect(new Effect.EffRigid(0));
  const refusals = [new Search.RecordDefect(at(0)),
    new Search.Malformed(new Search.MissingKey(key)),
    new Search.NotCertifiable(Search.ForcedTail.value, at(1)),
    new Search.ObligationFailed(at(2))];
  const same = Search.eqCheckRefusal.eq;
  refusals.forEach((refusal, index) => refusals.forEach((other, otherIndex) =>
    assert.equal(same(refusal)(other), index === otherIndex,
      `${index} ${otherIndex}`)));
  assert.equal(same(new Search.ObligationFailed(at(2)))(refusals[3]), true);
  assert.equal(same(new Search.ObligationFailed(at(3)))(refusals[3]), false);
});
