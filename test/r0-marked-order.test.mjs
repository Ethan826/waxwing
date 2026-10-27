import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 2's review carried into Task 4: the pre-order
// in which Generate.Marked numbers an annotation's unwritten marks
// (an arrow's parameter, row, then result; data's arguments, then rows;
// a handler type's label, then its inference row), and an `AtUse`
// record's tail variable. Each mark sits at a place the test names, so
// a swapped order shows as a swapped index.
const Marked = await load('Features.Check.Generate.Marked');
const Inputs = await load('Features.Check.Generate.Inputs');
const Origin = await load('Domain.Recorded.Origin');

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};

const rest = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; effect Ask { fn ask(): Unit; }; '
  + 'type Job(a, ...effects) = Job(Int -> a with ...effects); ';
const path = { root: Origin.InParameters.value, steps: [] };

// `f`'s first parameter type, marked under the naming.
const markedOf = (parameter, naming) => {
  const program = resolved(`${rest}fn f(x: ${parameter}): Unit = (); `
    + 'fn main(): Unit = ();');
  const { tables } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === 'f');
  const result = Marked.marked(tables)(naming)(decl.parameters[0].ty);
  assert.equal(result.constructor.name, 'Right');
  return shape(result.value0);
};
const annotated = parameter =>
  markedOf(parameter, Marked.InAnnotation.create(path)(0));
const indexOf = row => row.labels[0].mark.At[0].Annotation[2];

test('an arrow in a parameter numbers parameter, row, then result', () => {
  const [parameter, row, result] = annotated(
    '(Unit -> Unit with Log) -> (Unit -> Unit with Ask) with Tick').MArrow;
  assert.deepEqual([parameter.MArrow[1], row, result.MArrow[1]].map(indexOf),
    [0, 1, 2]);
});

test('a data type numbers its arguments, then its rows', () => {
  const [, [argument], [row]] = annotated('Job(Unit -> Unit with Log, Tick)')
    .MData;
  assert.deepEqual([argument.MArrow[1], row].map(indexOf), [0, 1]);
});

test('a handler type numbers its label, then its inference row', () => {
  const [label, rows] = annotated('Handler(Ask with Log)').MHandler;
  assert.deepEqual([label.mark.At[0].Annotation[2], indexOf(rows.inference)],
    [0, 1]);
});

test('AtUse names a record\'s tail variable as instances does', () => {
  const mty = markedOf('{ a: Int, ...r }', Marked.AtUse.create(path));
  const [fields, tails] = mty.MRecord;
  assert.deepEqual(fields, [{ Tuple: ['a', { MBase: [{ IntBase: [] }] }] }]);
  assert.equal(tails.length, 1);
  assert.deepEqual(tails[0].FreshVar[0], shape(path));
  assert.ok(tails[0].FreshVar[1].Inst, JSON.stringify(tails[0]));
});
