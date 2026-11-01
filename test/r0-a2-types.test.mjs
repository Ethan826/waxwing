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
  assert.deepEqual(Forced.forcedTails(problemOf(closed, 'use4')), []);
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
