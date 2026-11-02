import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { effectsOf as encode } from './r0-effects-canonical.mjs';

// Tranche 2 read-back design §B.2-§B.4 (Stage B Task 3, §18.155 (1)): a
// local annotation's unwritten row ends in the declaration's implicit
// row variable, which the live checker (Check/Lambda.purs
// `annotationRow`) replaces with the enclosing lambda's own row.
// Generation records that row, `EffFresh p EffectOf`, in the annotation
// (`AnnotationAt`) and in the lambda's node type; written rows and
// closed rows stay; clause rows and marks are untouched. The source is
// the design's examples/annotations.wxw.txt.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const source = [
  'effect Log { fn log(n: Int): Unit; };',
  'effect Tick { fn tick(): Unit; };',
  'effect Tock { fn tock(): Unit; };',
  'fn implicitRow(): Unit with Tick = {',
  '  let inst = fn(h: Handler(Log)) => with h { Log.log(1) };',
  '  inst(handler Log { log(n) => Tick.tick() })',
  '};',
  'fn explicitRow(cb: Unit -> Unit with ...e): Unit with ...e = {',
  '  let inst = fn(h: Handler(Log with ...e)) => with h { Log.log(1) };',
  '  inst(handler Log { log(n) => cb(()) })',
  '};',
  'fn pureRow(): Unit with Tick = {',
  '  let inst = fn(h: Handler(Log with pure)) => with h { Log.log(1) };',
  '  inst(handler Log { log(n) => () })',
  '};',
  'fn nested(): Unit with Tick = {',
  '  let outer = fn(h: Handler(Log)) => {',
  '    let inner = fn(k: Handler(Log)) => with k { Log.log(2) };',
  '    with h { inner(handler Log { log(n) => Log.log(n) }) }',
  '  };',
  '  outer(handler Log { log(n) => Tick.tick() })',
  '};',
  'fn siblings(): Unit with Tick = {',
  '  let both = fn(h: Handler(Log), k: Handler(Tock)) =>',
  '    { with h { Log.log(1) }; with k { Tock.tock() } };',
  '  both(handler Log { log(n) => Tick.tick() },',
  '    handler Tock { tock() => Tick.tick() })',
  '};',
  'fn main(): Unit with Console =',
  '  with handler Tick { tick() => Console.print(5) }',
  '  { implicitRow(); pureRow(); nested(); siblings() };'
].join('\n');

const program = resolved(source);
const { tables, signatures } = Inputs.generationInputs(program);

const effectsOf = name => {
  const decl = program.functions.find(item => item.name === name);
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right', name);
  return encode(Recorded.fields(Elaborating.problem(result.value0)).effects);
};

// Each annotation as its lambda's path (the key less `Lambda/params/k`),
// its parameter index and its handler rows.
const annotationsOf = effects => effects.annotations.map(([key, ty]) => ({
  lambda: { ...key, steps: key.steps.slice(0, -3) },
  index: key.steps.at(-1).Index[0],
  mark: ty.MHandler[0].mark,
  rows: ty.MHandler[1],
  ty
}));

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const effectOf = path => ({ EffFresh: [path, { EffectOf: [] }] });
const just = value => ({ Just: [value] });

const ownRow = (effects, found) => {
  const variable = effectOf(found.lambda);
  assert.ok(effects.flexEff.some(item => same(item, variable)),
    'the lambda mints its own row');
  assert.deepEqual(found.rows.inference.tail, just(variable));
};

test('implicit annotation row is the lambda\'s EffectOf', () => {
  const effects = effectsOf('implicitRow');
  const [found] = annotationsOf(effects);
  ownRow(effects, found);
  const [, node] = effects.nodes.find(([path]) => same(path, found.lambda));
  assert.deepEqual(node.MArrow[0], found.ty, 'the node type carries it');
});

// The parameter's local carries the renamed type: `with h { … }` in the
// lambda's body installs h at its annotation type, implicit row renamed.
test('a use of the annotated parameter carries the renamed row', () => {
  const effects = effectsOf('implicitRow');
  const [found] = annotationsOf(effects);
  const steps = [{ Named: ['Lambda'] }, { Named: ['body'] }];
  const body = { ...found.lambda, steps: [...found.lambda.steps, ...steps] };
  const [install] = effects.obligations.filter(item => item.value.Install
    && same(item.provenance.AtSite?.[0].path, body));
  assert.ok(install !== undefined, 'the body installs h');
  assert.deepEqual(install.value.Install[0].handler, found.ty);
  assert.deepEqual(found.rows.inference.tail, just(effectOf(found.lambda)));
});

test('explicit annotation row stays rigid', () => {
  const [found] = annotationsOf(effectsOf('explicitRow'));
  assert.deepEqual(found.rows.inference.tail, just({ EffRigid: [0] }));
});

test('closed annotation row stays closed', () => {
  const [found] = annotationsOf(effectsOf('pureRow'));
  assert.deepEqual(found.rows.inference.tail, { Nothing: [] });
});

test('nested annotations take their own lambda', () => {
  const effects = effectsOf('nested');
  const found = annotationsOf(effects);
  assert.equal(found.length, 2);
  found.forEach(item => ownRow(effects, item));
  assert.ok(!same(found[0].lambda, found[1].lambda));
});

test('sibling annotations share one EffectOf, keep their own C', () => {
  const effects = effectsOf('siblings');
  const found = annotationsOf(effects);
  assert.deepEqual(found.map(item => item.index), [0, 1]);
  found.forEach(item => ownRow(effects, item));
  assert.deepEqual(found[0].rows.inference.tail,
    found[1].rows.inference.tail);
  assert.ok(!same(found[0].rows.clauses, found[1].rows.clauses));
});

// Clause rows and marks as before the correction: each annotation's one
// C is bare with its own `AnnotationClauses j 0` tail, and its label's
// mark the position `Annotation p j 0`.
test('annotation clauses unchanged', () => {
  const names = ['implicitRow', 'explicitRow', 'pureRow', 'nested',
    'siblings'];
  for (const found of names.flatMap(name =>
    annotationsOf(effectsOf(name)))) {
    const clauses = { EffFresh: [found.lambda,
      { AnnotationClauses: [found.index, 0] }] };
    assert.deepEqual(found.rows.clauses,
      just({ labels: [], tail: just(clauses) }));
    assert.deepEqual(found.mark,
      { At: [{ Annotation: [found.lambda, found.index, 0] }] });
  }
});
