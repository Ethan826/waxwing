import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { shape } from './regression-r0-amin-support.mjs';

// R0 amin tranche 1, Task 10: the obligations that have no atom beside
// them. `defer` records `Defer` and its consumption into the enclosing
// row (E6, E2 at the `defer` site); `fail` and each fail clause record
// `FailConcrete` for their payload (E9); `main` alone records `Entry`
// (E8); a perform form of an operation that writes a `with` row records
// `Unsupported (OperationWithRow …)` (FX032, statements §9, §12.2). Each
// has `AtSite` provenance (statements §10; plan Task 7's rules).
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const key = JSON.stringify;
const effectsOf = (source, name) => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects;
};
const pairs = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map);
const nodeAt = (effects, path) => pairs(effects.nodes).find(pair =>
  key(shape(pair.value0)) === key(shape(path)))?.value1;
const childOf = (path, ...names) => ({ ...path, steps: [...path.steps,
  ...names.map(name => ({ Named: [name] }))] });
const kindsOf = (effects, kind) => effects.obligations.filter(item =>
  item.value.constructor.name === kind);
const roleOf = item => item.provenance.value0.role.constructor.name;
// Task 8 records a stage's own consumption (a perform inside the
// deferred expression too), so only the `defer`'s are counted here.
const deferInto = effects => kindsOf(effects, 'Consume').filter(item =>
  item.value.value0.site.constructor.name === 'AtDefer');

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const work = `${log}fn work(): Unit with Log = { defer Log.log(1); () }; `
  + 'fn main(): Unit = ();';

test('defer records Defer and its consumption', () => {
  const effects = effectsOf(work, 'work');
  const [item, extra] = kindsOf(effects, 'Defer');
  assert.ok(item, 'no Defer obligation');
  assert.equal(extra, undefined, 'a second Defer');
  assert.equal(roleOf(item), 'DeferRegistration');
  const { path } = item.provenance.value0;
  const { row, enclosing } = item.value.value0;
  assert.deepEqual(shape(row),
    { EffFresh: [shape(path), { EffectOf: [] }] });
  assert.deepEqual(shape(enclosing), shape(effects.signature.row));
  const consumed = deferInto(effects);
  assert.equal(consumed.length, 1, 'one consumption of the deferred row');
  const [taken] = consumed;
  assert.equal(roleOf(taken), 'DeferInto');
  assert.deepEqual(shape(taken.provenance.value0.path), shape(path));
  const spec = taken.value.value0;
  assert.equal(spec.site.constructor.name, 'AtDefer');
  assert.deepEqual(shape(spec.source), { labels: [],
    tail: { Just: [shape(row)] } });
  assert.deepEqual(shape(spec.target), shape(enclosing));
  assert.deepEqual([spec.marks, spec.bare], [true, false]);
  assert.ok(effects.flexEff.some(variable => key(shape(variable))
    === key(shape(row))), 'd is not registered as a flexible variable');
});

test('a block with no defer records none; each defer its own', () => {
  assert.equal(kindsOf(effectsOf(work, 'main'), 'Defer').length, 0);
  const twice = `${log}fn two(): Unit with Log = `
    + '{ defer Log.log(1); defer Log.log(2); () }; fn main(): Unit = ();';
  const effects = effectsOf(twice, 'two');
  const found = kindsOf(effects, 'Defer');
  assert.equal(found.length, 2);
  assert.equal(new Set(found.map(item =>
    key(shape(item.provenance)))).size, 2, 'two Defer share a provenance');
  assert.equal(deferInto(effects).length, 2);
});

test('a defer inside a defer is consumed into the outer d (E11)', () => {
  const inner = `${log}fn work(): Unit with Log = `
    + '{ defer { defer Log.log(1); () }; () }; fn main(): Unit = ();';
  const effects = effectsOf(inner, 'work');
  const [outer, deeper] = kindsOf(effects, 'Defer');
  assert.ok(deeper, 'two Defer expected');
  assert.deepEqual(shape(outer.value.value0.enclosing),
    shape(effects.signature.row));
  assert.deepEqual(shape(deeper.value.value0.enclosing),
    { labels: [], tail: { Just: [shape(outer.value.value0.row)] } });
});

const err = 'type Err = Oops; ';
const fails = `${err}fn a(): Int with Fail(Err) { fail } = fail(Oops); `
  + 'fn b(): Int = handle Fail.fail(Oops) { fail(error: Err) => 2 }; '
  + 'fn c(): Int = 3; fn main(): Unit = ();';

test('FailConcrete at each payload', () => {
  const inA = kindsOf(effectsOf(fails, 'a'), 'FailConcrete');
  assert.equal(inA.length, 1, 'one fail, one payload');
  assert.equal(roleOf(inA[0]), 'PayloadHead');
  const effectsA = effectsOf(fails, 'a');
  const { path } = kindsOf(effectsA, 'FailConcrete')[0].provenance.value0;
  assert.deepEqual(shape(kindsOf(effectsA, 'FailConcrete')[0].value.value0),
    shape(nodeAt(effectsA, childOf(path, 'Fail', 'payload'))));
  const inB = kindsOf(effectsOf(fails, 'b'), 'FailConcrete');
  assert.equal(inB.length, 2, 'the inner fail and the one clause');
  assert.equal(new Set(inB.map(item => key(shape(item.provenance)))).size,
    2, 'two payloads share a provenance');
  for (const item of inB)
    assert.match(key(shape(item.value.value0)), /"MData"/);
  assert.equal(kindsOf(effectsOf(fails, 'c'), 'FailConcrete').length, 0);
});

test('Entry only in main', () => {
  const effects = effectsOf(fails, 'main');
  const [item, extra] = kindsOf(effects, 'Entry');
  assert.ok(item, 'main records no Entry');
  assert.equal(extra, undefined, 'a second Entry');
  assert.equal(roleOf(item), 'EntryRow');
  assert.deepEqual(shape(item.value.value0), shape(effects.signature.row));
  for (const name of ['a', 'b', 'c'])
    assert.equal(kindsOf(effectsOf(fails, name), 'Entry').length, 0, name);
  const console = 'fn main(): Unit with Console = Console.print(1);';
  const printing = effectsOf(console, 'main');
  assert.equal(kindsOf(printing, 'Entry').length, 1);
  assert.equal(shape(kindsOf(printing, 'Entry')[0].value.value0)
    .labels.length, 1, 'the declared Console label');
});

const state = 'effect State(s) { fn get(): s; fn put(value: s): Unit; }; ';
const op = `${state}effect Op { fn op(n: Int): Int with State({ x: Int }); `
  + 'fn two(a: Int, b: Int): Int with State({ x: Int }); '
  + 'fn plain(n: Int): Int; }; ';
const forms = {
  call: 'fn call(): Int with Op = Op.op(1);',
  pipe: 'fn pipe(): Int with Op = 1 |> Op.op;',
  partial: 'fn partial(): Int -> Int with Op = Op.two(1);',
  value: 'fn value(): Int = { let f = Op.op; 0 };',
  nested: 'fn nested(): Int = { let f = fn(u: Unit) => Op.op(1); 0 };',
  clause: 'fn clause(): Int = { let h = handler Log '
    + '{ log(n) => Op.op(n) }; 0 };',
  plain: 'fn plain(): Int with Op = Op.plain(1);',
  none: 'fn none(): Int = 1;'
};
const fx032 = `${log}${op}${Object.values(forms).join(' ')}`
  + ' fn main(): Int = 0;';

test('FX032\'s operation records Unsupported in each perform form', () => {
  for (const name of ['call', 'pipe', 'partial', 'value', 'nested',
    'clause']) {
    const found = kindsOf(effectsOf(fx032, name), 'Unsupported');
    assert.equal(found.length, 1, `${name}: one Unsupported`);
    assert.equal(roleOf(found[0]), 'UnsupportedOperation', name);
    const kind = found[0].value.value0;
    assert.equal(kind.constructor.name, 'OperationWithRow', name);
    assert.equal(kind.value1, name === 'partial' ? 1 : 0, name);
  }
});

test('an operation with no written row, and a plain body, record none',
  () => {
    for (const name of ['plain', 'none', 'main'])
      assert.equal(kindsOf(effectsOf(fx032, name), 'Unsupported').length, 0,
        name);
  });

test('the operation\'s row is recorded, data only', () => {
  const program = resolved(fx032);
  const withRow = program.effects.find(item => item.name === 'Op');
  const rows = withRow.operations.map(item =>
    item.effects.constructor.name);
  assert.deepEqual(rows, ['Just', 'Just', 'Nothing']);
});
