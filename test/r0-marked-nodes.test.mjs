import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { nodesOf } from './r0-marked-erase.mjs';

// R0 amin tranche 1, Task 3: what erasure drops from a node's marked
// type (`effects.nodes`), which test/r0-marked-corpus.serial.test.mjs
// cannot see: stage rows, builtin rows, a handler literal's mark, a
// callee's instantiated `nofail(k)` and an annotation's positions. A
// use's node type is its instance's (`effects.instances`) after the
// supplied arguments (Task 4, correcting Task 3's rest numbered from
// stage 0; controller ruling: the checker gives the rest the instance's
// own stage rows).
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn two(a: Int, b: Int): Int = a; '
  + 'fn three(a: Int, b: Int, c: Int): Int = a; '
  + 'fn k(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log '
  + '= g(()); '
  + 'fn f(): Unit = { let r = two; let q = two(1); '
  + 'let p = Console.print; let s = show; '
  + 'let h = handler Log { log(n) => () }; let c = k(); '
  + 'let l = fn(x: Unit -> Unit with Log) => (); let t = three(1); () }; '
  + 'fn main(): Unit = ();';

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};

const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');
let instances;
const nodes = (() => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === 'f');
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right');
  const effects = Recorded.fields(Elaborating.problem(result.value0)).effects;
  instances = new Map(Maps.toUnfoldable(Unfoldable.unfoldableArray)(
    effects.instances).map(pair => [JSON.stringify(shape(pair.value0).steps),
    shape(pair.value1)]));
  return new Map(nodesOf(effects.nodes).map(([path, mty]) =>
    [JSON.stringify(path.steps), shape(mty)]));
})();

// Item i's `let` value: its node's marked type and its path, as shaped.
const steps = item => ['Block', 'items', item, 'Let', 'value'];
const nodeAt = item => nodes.get(JSON.stringify(steps(item)));
const instanceAt = item => instances.get(JSON.stringify(pathOf(item).steps));
const pathOf = item => ({ root: { InBody: [] }, steps: steps(item)
  .map(step => (typeof step === 'number' ? { Index: [step] }
    : { Named: [step] })) });

// An arrow spine's [parameter, row] stages and its result.
const stagesOf = mty => {
  const stages = [];
  let rest = mty;
  while (rest.MArrow) {
    stages.push([rest.MArrow[0], rest.MArrow[1]]);
    rest = rest.MArrow[2];
  }
  return { stages, result: rest };
};
const stageTail = (item, k) => ({ Just: [{ EffFresh: [pathOf(item),
  { Stage: [k] }] }] });

test('a function reference has its instance\'s stage rows', () => {
  const rows = stagesOf(nodeAt(0)).stages.map(([, row]) => row);
  const { row } = instanceAt(0);
  assert.ok(row.tail.Just[0].EffFresh[1].EffInst, JSON.stringify(row));
  assert.deepEqual(rows, [{ labels: [], tail: stageTail(0, 0) }, row]);
});

test('a partial application\'s rest is the instance\'s own stages', () => {
  const rows = stagesOf(nodeAt(1)).stages.map(([, row]) => row);
  assert.deepEqual(rows, [instanceAt(1).row]);
  const rest = stagesOf(nodeAt(7)).stages.map(([, row]) => row);
  assert.deepEqual(rest, [{ labels: [], tail: stageTail(7, 1) },
    instanceAt(7).row]);
});

test('print keeps its Console row, N and closed', () => {
  const rows = stagesOf(nodeAt(2)).stages.map(([, row]) => row);
  assert.deepEqual(rows, [{ labels: [{ effect: { ConsoleEffect: [] },
    args: [], mark: { Written: [{ FixedN: [] }] } }],
  tail: { Nothing: [] } }]);
});

test('show has a fresh stage 0 row', () => {
  const rows = stagesOf(nodeAt(3)).stages.map(([, row]) => row);
  assert.deepEqual(rows, [{ labels: [], tail: stageTail(3, 0) }]);
});

test('a handler literal\'s mark is its Literal position', () => {
  assert.deepEqual(nodeAt(4).MHandler[0].mark,
    { At: [{ Literal: [pathOf(4)] }] });
});

test('a callee\'s nofail(k) is Instantiated at the use', () => {
  const [parameter] = stagesOf(nodeAt(5)).stages[0];
  const [, row] = stagesOf(parameter).stages[0];
  assert.deepEqual(row.labels.map(label => label.mark),
    [{ At: [{ Instantiated: [pathOf(5), 'k'] }] }]);
});

test('an annotated lambda parameter\'s unwritten mark is a position', () => {
  const [parameter] = stagesOf(nodeAt(6)).stages[0];
  const [, row] = stagesOf(parameter).stages[0];
  assert.deepEqual(row.labels.map(label => label.mark),
    [{ At: [{ Annotation: [pathOf(6), 0, 0] }] }]);
});
