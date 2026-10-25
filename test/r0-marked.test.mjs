import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 2: a written type's marked translation.
// Pure; no rule calls it yet.
const Marked = await load('Features.Check.Generate.Marked');
const Inputs = await load('Features.Check.Generate.Inputs');
const Effect = await load('Domain.Recorded.Effect');
const Origin = await load('Domain.Recorded.Origin');
const Type = await load('Domain.Type');
const Row = await load('Domain.Row');
const Ids = await load('Domain.Ids');
const Maybe = await load('Data.Maybe');

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  const fields = Object.keys(value).map(name => shape(value[name]));
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: fields };
};

const path = { root: Origin.InParameters.value, steps: [] };
const p = path;
const rightOf = result => {
  assert.equal(result.constructor.name, 'Right');
  return result.value0;
};

const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn f(g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log '
  + '= g(()); fn main(): Unit = ();';
const program = resolved(source);
const { tables } = Inputs.generationInputs(program);
const decl = program.functions.find(item => item.name === 'f');
const signature = Type.TFun.create(decl.parameters[0].ty)(decl.row)(
  decl.result);
const run = (naming, ty) => Marked.marked(tables)(naming)(ty);
const labelsOf = mty => {
  const rows = [];
  const walk = t => {
    if (t.constructor.name !== 'MArrow') return;
    rows.push(t.value1);
    walk(t.value0); walk(t.value2);
  };
  walk(mty);
  return rows.flatMap(row => row.labels.map(l => shape(l.mark)));
};
const tailsOf = mty => {
  const rows = [];
  const walk = t => {
    if (t.constructor.name !== 'MArrow') return;
    rows.push(shape(t.value1.tail));
    walk(t.value0); walk(t.value2);
  };
  walk(mty);
  return rows;
};

test('Declared keeps rigid rows and written marks', () => {
  const mty = rightOf(run(Marked.Declared.value, signature));
  assert.deepEqual(labelsOf(mty), [{ FixedRigid: ['k'] }, { FixedRigid: ['k'] }]
    .map(f => ({ Written: [f] })));
  for (const tail of tailsOf(mty))
    assert.ok(tail.Just && tail.Just[0].EffRigid, JSON.stringify(tail));
});

test('AtUse shares one position per k', () => {
  const mty = rightOf(run(Marked.AtUse.create(p), signature));
  const position = { At: [{ Instantiated: [shape(p), 'k'] }] };
  assert.deepEqual(labelsOf(mty), [position, position]);
  const tails = tailsOf(mty);
  assert.equal(tails.length, 2);
  for (const tail of tails) {
    const evar = tail.Just[0].EffFresh;
    assert.ok(evar, JSON.stringify(tail));
    assert.deepEqual(evar[0], shape(p));
    assert.ok(evar[1].EffInst);
  }
});

const rowOf = (...labels) => new Row.Row(labels, Maybe.Nothing.value);
const label = (effect, mark) => new Row.Label(effect, [], mark);
test('Console is N', () => {
  const console = Row.ConsoleEffect.value;
  const ty = Type.TFun.create(Type.TUnit.value)(rowOf(
    label(console, new Row.MarkVariable('k'))))(Type.TUnit.value);
  for (const naming of [Marked.Declared.value, Marked.AtUse.create(p)])
    assert.deepEqual(labelsOf(rightOf(run(naming, ty))),
      [{ Written: [{ FixedN: [] }] }]);
});

test('AtUse names type variables as instances does', () => {
  const mty = rightOf(run(Marked.AtUse.create(p), Type.TVar.create(
    3)));
  assert.deepEqual(shape(mty), { MVar: [{ FreshVar: [shape(p),
    { Inst: [3] }] }] });
  const rigid = rightOf(run(Marked.Declared.value, Type.TVar.create(
    3)));
  assert.deepEqual(shape(rigid), { MVar: [{ RigidVar: [3] }] });
});

const fail = mark => label(Row.FailEffect.value, mark);
const unit = Type.TUnit.value;
const annotated = Marked.InAnnotation.create(p)(2);
const at = n => ({ At: [{ Annotation: [shape(p), 2, n] }] });
const written = fixed => ({ Written: [{ [fixed]: [] }] });

test('an unwritten annotation mark is numbered in pre-order', () => {
  const ty = Type.TFun.create(unit)(rowOf(fail(Row.Unmarked.value),
    fail(Row.NoFail.value), fail(Row.Unmarked.value)))(
    Type.TFun.create(unit)(rowOf(fail(Row.Unmarked.value)))(unit));
  assert.deepEqual(labelsOf(rightOf(run(annotated, ty))),
    [at(0), written('FixedN'), at(1), at(2)]);
});

test('a 5,000-parameter annotation numbers without recursion', () => {
  const count = 5000;
  let ty = unit;
  for (let i = 0; i < count; i += 1)
    ty = Type.TFun.create(unit)(rowOf(fail(Row.Unmarked.value)))(ty);
  const marks = [];
  for (let t = rightOf(run(annotated, ty)); t.constructor.name === 'MArrow';
    t = t.value2) marks.push(shape(t.value1.labels[0].mark));
  assert.equal(marks.length, count);
  assert.deepEqual(marks[0], at(0));
  assert.deepEqual(marks[count - 1], at(count - 1));
});

test('Unmarked outside an annotation and MarkMeta are MarkShape', () => {
  for (const mark of [Row.Unmarked.value, new Row.MarkMeta(1)])
    for (const naming of [Marked.Declared.value, Marked.AtUse.create(p)]) {
      const ty = Type.TFun.create(unit)(rowOf(fail(mark)))(unit);
      const result = run(naming, ty);
      assert.equal(result.constructor.name, 'Left');
      assert.equal(result.value0.constructor.name, 'MarkShape');
    }
  const meta = Type.TFun.create(unit)(rowOf(fail(new Row.MarkMeta(1))))(unit);
  assert.equal(run(annotated, meta).value0.constructor.name, 'MarkShape');
});

test('an unknown declared type is UnknownType', () => {
  const ty = new Type.TData(99999, [], []);
  const result = run(Marked.Declared.value, ty);
  assert.equal(result.value0.constructor.name, 'UnknownType');
});

test('a handler type keeps its marks and has no own C', () => {
  const log = decl.row.value0[0].value0;
  const ty = new Type.THandler(new Row.Label(log, [], Row.NoFail.value),
    { inference: rowOf(label(log, Row.Plain.value)),
      clauses: Maybe.Nothing.value });
  const mty = rightOf(run(Marked.Declared.value, ty));
  assert.equal(mty.constructor.name, 'MHandler');
  assert.deepEqual(shape(mty.value0.mark), written('FixedN'));
  assert.deepEqual(shape(mty.value1.inference.labels[0].mark),
    written('FixedM'));
  assert.deepEqual(shape(mty.value1.clauses), shape(Maybe.Nothing.value));
});
