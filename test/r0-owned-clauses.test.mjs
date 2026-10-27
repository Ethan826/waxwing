import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 4: the clause rows C generation records
// (statements §2 "What generation records for handler types", E4′ and
// §12.2's F3 and F6 rows). A function use whose result is a top-level
// handler type records its instance with a ResultC (rule H′); a lambda's
// annotated parameter records its annotation with a C per handler type
// not inside another's rows.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value instanceof Maps.Leaf || value instanceof Maps.Node)
    return Maps.toUnfoldable(Unfoldable.unfoldableArray)(value)
      .map(pair => [shape(pair.value0), shape(pair.value1)]);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};

const effectsOf = (source, name = 'use') => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right');
  return shape(Recorded.fields(Elaborating.problem(result.value0)).effects);
};

const rest = 'type E = E; type Job(a) = Job(a); '
  + 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; effect Ask { fn ask(): Unit; }; '
  + 'effect Box(a) { fn put(x: a): Unit; }; effect Get(a) { fn get(): a; }; ';
const using = call => `fn use(): Unit = { let h = ${call}; () }; `
  + 'fn main(): Unit = ();';
const letPath = { root: { InBody: [] }, steps: [{ Named: ['Block'] },
  { Named: ['items'] }, { Index: [0] }, { Named: ['Let'] },
  { Named: ['value'] }] };
const just = value => ({ Just: [value] });
const nothing = { Nothing: [] };

// The one use's instance and its result handler's rows.
const ownedAt = (mk, call) => {
  const effects = effectsOf(rest + mk + using(call));
  const [[path, sig]] = effects.instances;
  assert.deepEqual(path, letPath);
  const [, rows] = sig.result.MHandler;
  return { effects, sig, rows, c: rows.clauses.Just[0] };
};

const tailCases = [
  ['a parameter', 'fn mk(x: Unit -> Unit with ...e): Handler(Log with ...e) '
    + 'with pure = handler Log { log(n) => () }; ',
  'mk(fn(u: Unit) => ())', 'R'],
  ['the callee row', 'fn mk(u: Unit): Handler(Log with ...e) '
    + 'with Tick + ...e = handler Log { log(n) => () }; ', 'mk(())', 'R'],
  ['the result outside R\'s tail (FX033 x1)',
    'fn mk(): Handler(Box(Unit -> Unit with ...s) with ...s) with pure = '
    + 'handler Box(Unit -> Unit with ...s) { put(x) => x(()) }; ', 'mk()',
    'R'],
  ['only R\'s tail (fx008 r1)', 'fn mk(): Handler(Log with ...e) with pure '
    + '= handler Log { log(n) => () }; ', 'mk()', 'fresh'],
  ['nowhere: R closed', 'fn mk(): Handler(Log with pure) with pure = '
    + 'handler Log { log(n) => () }; ', 'mk()', 'closed'],
  ['the callee row of a zero-parameter callee (fx008 ownRow)',
    'fn mk(): Handler(nofail Log with ...e) with '
    + 'Get(Handler(nofail Log with ...e)) + ...e = Get.get(); ', 'mk()', 'R'],
];

test('ResultC tail, five cases (and fx008 ownRow)', () => {
  const found = tailCases.map(([, mk, call]) => ownedAt(mk, call));
  const expected = tailCases.map(([, , , kind], i) => {
    const r = found[i].rows.inference.tail;
    if (kind === 'R') {
      assert.ok(r.Just[0].EffFresh[1].EffInst, tailCases[i][0]);
      return r;
    }
    if (kind === 'fresh') return just({ EffFresh: [letPath,
      { ResultClauses: [] }] });
    assert.deepEqual(r, nothing, tailCases[i][0]);
    return nothing;
  });
  assert.deepEqual(found.map(item => item.c.tail), expected);
});

test('a ResultC is R\'s labels bare with R\'s marks', () => {
  const { rows, c } = ownedAt('fn mk(u: Unit): Handler(Ask with '
    + 'Box(Int) + Fail(Job(Int)) + ...e) with pure = handler Ask '
    + '{ ask() => () }; ', 'mk(())');
  const bare = rows.inference.labels.map(label => ({ ...label,
    args: label.effect.FailEffect
      ? [{ MData: [label.args[0].MData[0], [], []] }] : [] }));
  assert.equal(bare.length, 2);
  assert.deepEqual(c.labels, bare);
});

test('the use\'s node carries the ResultC result', () => {
  const { effects, sig } = ownedAt(tailCases[3][1], 'mk()');
  const node = effects.nodes.find(([path]) =>
    JSON.stringify(path) === JSON.stringify(letPath));
  assert.deepEqual(node[1], sig.result);
});

// A lambda's annotation at `Lambda/params/j`, and its handler types'
// rows in pre-order.
const lambdaPath = letPath;
const annotationOf = annotation => {
  const effects = effectsOf(rest + using(`fn(f: ${annotation}) => ()`));
  const [[key, mty]] = effects.annotations;
  assert.deepEqual(key.steps.slice(-3), [{ Named: ['Lambda'] },
    { Named: ['params'] }, { Index: [0] }]);
  const handlers = [];
  const walk = t => {
    if (t.MHandler) handlers.push(t.MHandler[1]);
    if (t.MArrow) { walk(t.MArrow[0]); walk(t.MArrow[2]); }
  };
  walk(mty);
  return { effects, handlers };
};
const clausesTail = (j, k) => just({ EffFresh: [lambdaPath,
  { AnnotationClauses: [j, k] }] });

test('annotation C below the top', () => {
  const { handlers } = annotationOf('Unit -> Handler(nofail Ask with Log)');
  assert.equal(handlers.length, 1);
  const [{ inference, clauses }] = handlers;
  const c = clauses.Just[0];
  const log = { UserEffect: [0] };
  assert.deepEqual(c.labels.map(label => [label.effect, label.args]),
    [[log, []]]);
  assert.notDeepEqual(c.labels[0].mark, inference.labels[0].mark);
  assert.ok(c.labels[0].mark.At[0].Annotation);
  assert.deepEqual(c.tail, clausesTail(0, 0));
});

test('annotation C tail fresh with closed R', () => {
  const { handlers } = annotationOf('Handler(nofail Ask with pure)');
  const [{ inference, clauses }] = handlers;
  assert.deepEqual(inference.tail, nothing);
  assert.deepEqual(clauses.Just[0].tail, clausesTail(0, 0));
});

test('sibling handler types get distinct C tails', () => {
  const { handlers } = annotationOf('Handler(nofail Ask with Log) -> '
    + 'Handler(nofail Tick with Log)');
  const tails = handlers.map(rows => rows.clauses.Just[0].tail);
  assert.deepEqual(tails, [clausesTail(0, 0), clausesTail(0, 1)]);
});

test('a handler type inside another\'s rows keeps C = R', () => {
  const { handlers } = annotationOf('Handler(nofail Ask with '
    + 'Box(Handler(nofail Tick with Log)) + Log)');
  assert.equal(handlers.length, 1);
  const [inner] = handlers[0].inference.labels[0].args;
  assert.deepEqual(inner.MHandler[1].clauses, nothing);
  assert.deepEqual(handlers[0].clauses.Just[0].tail, clausesTail(0, 0));
});

test('annotation positions are numbered label, R, then C, and minted', () => {
  const { effects, handlers } = annotationOf('Handler(Ask with Log)');
  const [{ inference, clauses }] = handlers;
  const marks = [inference.labels[0].mark, clauses.Just[0].labels[0].mark];
  assert.deepEqual(marks.map(mark => mark.At[0].Annotation.slice(1)),
    [[0, 1], [0, 2]]);
  assert.deepEqual(effects.positions.filter(p => p.Annotation)
    .map(p => p.Annotation.slice(1)), [[0, 0], [0, 1], [0, 2]]);
});
