import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { shape } from './regression-r0-amin-support.mjs';

// R0 amin tranche 1, Task 8: consumptions and ambient rows (statements
// §4 E2, E10, E11; §12.2 `sites`). Every stage consumes its row into the
// ambient row, recorded as `Consume { site, source, target, marks: true,
// bare: false }` under an `AtSite` provenance whose role is `Consumed
// site ordinal`; `ambient` holds each body's ambient row at the body's
// path, and `arities` each use's callee arity.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const effectsOf = (source, name = 'main') => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects;
};
const pairs = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => [shape(pair.value0), shape(pair.value1)]);
// A path in shaped form: a name is a `Named` step, a number an `Index`.
const stepOf = step => (typeof step === 'number'
  ? { Index: [step] } : { Named: [step] });
const at = (root, ...steps) => ({ root: { [root]: [] },
  steps: steps.map(stepOf) });
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const lookup = (map, path) => pairs(map).find(([key]) =>
  same(key, path))?.[1];

// The declaration's consumptions, as { site, ordinal, path, value }.
const consumes = effects => effects.obligations.filter(item =>
  item.value.constructor.name === 'Consume').map(item => {
  const placed = shape(item.provenance).AtSite[0];
  const [site, ordinal] = placed.role.Consumed;
  return { site, ordinal, path: placed.path,
    value: shape(item.value).Consume[0] };
});
const stage = (path, k) => ({ labels: [],
  tail: { Just: [{ EffFresh: [path, { Stage: [k] }] }] } });

const log = 'effect Log { fn log(n: Int): Unit; }; type E = E; ';
const add = 'fn add(a: Int, b: Int): Int = a + b; ';
const items = (k, ...more) => at('InBody', 'Block', 'items', k, ...more);

const sources = {
  lambda: 'fn main(): Int = { let k = fn(a: Int, b: Int) => a; '
    + 'let m = k(1); 0 };',
  apply: 'fn main(): Int = { let k = fn(a: Int) => a; k(2) };',
  pipe: 'fn main(): Int = { let k = fn(a: Int) => a; 2 |> k };',
  partial: `${add}fn main(): Int = { let f = add(1); 0 };`,
  call: `${add}fn main(): Int = add(1, 2);`,
  over: 'fn mk(a: Int): Int -> Int = fn(b: Int) => b; '
    + 'fn main(): Int = mk(1, 2);',
  perform: `${log}fn main(): Unit with Log = Log.log(1);`,
  print: 'fn main(): Unit with Console = Console.print(1);',
  callback: `${log}fn g(h: Int -> Int with Log): Int with Log = h(1); `
    + 'fn main(): Unit = ();'
};

test('every stage consumes into its ambient row', () => {
  const stageOf = (name, fn) => consumes(effectsOf(sources[name], fn));
  // A two-parameter lambda's inner stage, applied once: stage 0 of 2.
  const inner = stageOf('lambda');
  assert.equal(inner.length, 1);
  assert.deepEqual(Object.keys(inner[0].site), ['AtApply']);
  assert.deepEqual(inner[0].path, items(1, 'Let', 'value'));
  assert.deepEqual(inner[0].value.source,
    stage(inner[0].path, 0));
  const apply = stageOf('apply');
  assert.equal(apply.length, 1);
  assert.deepEqual(Object.keys(apply[0].site), ['AtApply']);
  assert.deepEqual(apply[0].path, at('InBody', 'Block', 'result'));
  const pipe = stageOf('pipe');
  assert.deepEqual(pipe.map(item => Object.keys(item.site)[0]),
    ['AtPipe']);
  assert.deepEqual(pipe[0].value.source, stage(pipe[0].path, 0));
  const partial = stageOf('partial');
  assert.equal(partial.length, 1);
  assert.deepEqual(partial[0].site, { AtStage: [0] });
  assert.deepEqual(partial[0].value.source, stage(partial[0].path, 0));
  for (const item of [...inner, ...apply, ...pipe, ...partial]) {
    assert.equal(item.value.marks, true);
    assert.equal(item.value.bare, false);
  }
});

test('calls, over-application, performs and callbacks are sites', () => {
  const call = consumes(effectsOf(sources.call));
  assert.deepEqual(call.map(item => item.site), [{ AtCall: [] }]);
  const over = consumes(effectsOf(sources.over));
  assert.deepEqual(over.map(item => item.site),
    [{ AtCall: [] }, { AtStage: [0] }]);
  assert.deepEqual(over[1].value.source, stage(over[1].path, 0));
  const performed = consumes(effectsOf(sources.perform));
  assert.deepEqual(performed.map(item => item.site), [{ AtPerform: [] }]);
  assert.equal(performed[0].value.source.labels.length, 1);
  const printed = consumes(effectsOf(sources.print));
  assert.deepEqual(printed.map(item => item.site), [{ AtPerform: [] }]);
  assert.equal(shape(printed[0].value.source.labels[0].effect)
    .ConsoleEffect.length, 0);
  const callback = consumes(effectsOf(sources.callback, 'g'));
  assert.deepEqual(callback.map(item => item.site), [{ AtCallback: [] }]);
});

test('E10 targets the declared row', () => {
  const source = `${log}fn f(): Int with Log = 1; `
    + 'fn g(): Int with Log = f(); fn main(): Unit = ();';
  const effects = effectsOf(source, 'g');
  const [found, ...rest] = consumes(effects);
  assert.equal(rest.length, 0);
  assert.deepEqual(found.site, { AtCall: [] });
  assert.deepEqual(found.value.target, shape(effects.signature).row);
  assert.equal(found.value.target.labels.length, 1);
  // The same body's ambient row is that declared row.
  assert.deepEqual(lookup(effects.ambient, at('InBody')),
    shape(effects.signature).row);
});

test('ambient rows recorded', () => {
  const body = effectsOf('fn main(): Unit with Console = ();');
  assert.deepEqual(lookup(body.ambient, at('InBody')),
    shape(body.signature).row);
  const lambdaAt = items(0, 'Let', 'value');
  const lambda = effectsOf(sources.lambda);
  assert.deepEqual(lookup(lambda.ambient,
    { ...lambdaAt, steps: [...lambdaAt.steps, ...['Lambda', 'body']
      .map(stepOf)] }),
  { labels: [], tail: { Just: [{ EffFresh: [lambdaAt, { EffectOf: [] }] }] } });
  const withSource = `${log}fn main(): Unit with Console = `
    + 'with handler Log { log(n) => () } { Log.log(1) };';
  const withed = effectsOf(withSource);
  const row = lookup(withed.ambient, at('InBody', 'With', 'body'));
  assert.equal(row.labels.length, 2);
  assert.deepEqual(row.labels[0].mark,
    { At: [{ Frame: [at('InBody')] }] });
  assert.deepEqual(row.labels.slice(1),
    shape(withed.signature).row.labels);
  const handled = effectsOf('type E = E; fn main(): Unit with Console = '
    + 'handle { Fail.fail(E) } { fail(error: E) => () };');
  const failing = lookup(handled.ambient, at('InBody', 'Handle', 'body'));
  assert.deepEqual(shape(failing.labels[0].effect), { FailEffect: [] });
  assert.deepEqual(failing.labels[0].mark, { Written: [{ FixedN: [] }] });
  assert.deepEqual(failing.labels.slice(1),
    shape(handled.signature).row.labels);
  const handler = at('InBody', 'With', 'handler');
  const clause = lookup(withed.ambient,
    { ...handler, steps: [...handler.steps, ...['Handler', 'clauses', 0,
      'body'].map(stepOf)] });
  assert.deepEqual(clause, { labels: [],
    tail: { Just: [{ EffFresh: [handler, { Clauses: [0] }] }] } });
  const deferred = effectsOf('fn main(): Unit with Console = '
    + '{ defer Console.print(1); () };');
  const itemAt = items(0);
  const inside = lookup(deferred.ambient,
    { ...itemAt, steps: [...itemAt.steps, ...['Defer', 'value']
      .map(stepOf)] });
  assert.deepEqual(inside, { labels: [],
    tail: { Just: [{ EffFresh: [itemAt, { EffectOf: [] }] }] } });
});

test('arities record each use\'s callee arity at its path', () => {
  const partial = effectsOf(sources.partial);
  assert.equal(lookup(partial.arities, items(0, 'Let', 'value')), 2);
  const performed = effectsOf(sources.perform);
  assert.equal(lookup(performed.arities, at('InBody')), 1);
  const reference = effectsOf(`${add}fn main(): Int = { let f = add; 0 };`);
  assert.equal(lookup(reference.arities, items(0, 'Let', 'value')), 2);
});

// §18.124 ruling 1: `fail` consumes its closed `Fail(payload)` row into
// the ambient row (E2), beside E9. The separating example: live refuses
// it (a pure callback may not raise Fail(Err)), so the lambda's ambient
// row must receive the consumption.
test('fail consumes Fail(payload) into the lambda\'s ambient row', () => {
  const source = 'type Err = Oops; fn run(f: Unit -> Int with pure): Int '
    + 'with pure = f(()); fn a(): Int with Fail(Err) { fail } = '
    + 'run(fn(u: Unit) => fail(Oops)); fn main(): Unit = ();';
  const effects = effectsOf(source, 'a');
  const failed = consumes(effects).filter(item =>
    Object.keys(item.site)[0] === 'AtFail');
  assert.equal(failed.length, 1);
  const [found] = failed;
  assert.equal(found.ordinal, 0);
  assert.equal(found.value.marks, true);
  assert.equal(found.value.bare, false);
  // A closed row: no tail.
  assert.equal(found.value.source.tail.Just, undefined);
  const [label] = found.value.source.labels;
  assert.equal(found.value.source.labels.length, 1);
  assert.deepEqual(shape(label.effect), { FailEffect: [] });
  assert.deepEqual(label.mark, { Written: [{ FixedN: [] }] });
  assert.equal(label.args.length, 1);
  // The target is the lambda's own `⟨p, effect⟩`, recorded at its body.
  assert.deepEqual(found.value.target, lookup(effects.ambient, found.path));
  assert.deepEqual(Object.keys(found.value.target.tail.Just[0])[0],
    'EffFresh');
  assert.deepEqual(found.value.target.tail.Just[0].EffFresh[1],
    { EffectOf: [] });
});
