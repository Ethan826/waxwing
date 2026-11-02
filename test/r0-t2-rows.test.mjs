import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { rowsCases, sources, spanOf } from './r0-t2-rows-cases.mjs';

// Tranche 2 Task 8 (design §C.1-§C.2, §D, §E; dossier §18.155 (3),
// (8)): every recorded effect-row variable read back from the checked
// declaration and its trace, one test per role and site. Rows print as
// `[labels|tail]`, `User` a user effect, `@M`/`@N` the term, `rigid:0`
// the declaration's implicit row variable. Fixture-level.
const cases = await rowsCases(load);
const { live, read, varsOf, valueOf, rowText, named, Maps, keyOrd } = cases;
const Convert = await load('Features.Check.Strategy.ReadBack.Convert');

const rows = (source, name, terms) => {
  const item = live(source, name);
  const found = read(item, item.trace, terms);
  assert.equal(named(found), 'Right', `${name}: ${named(found.value0)}`);
  return { item, map: found.value0 };
};
// The one variable of `role` at the node starting with `text`, as text.
const one = (source, name, role, text, stage, terms) => {
  const { item, map } = rows(source, name, terms);
  const found = varsOf(item, role, text, stage);
  assert.equal(found.length, 1, `${name}: one ${role} at ${text}`);
  const value = valueOf(map, found[0]);
  assert.ok(value !== undefined, `${name}: ${role} read`);
  return rowText(value);
};

test('call: an instance row reads the use slot', () => {
  assert.equal(one(sources.uses, 'call', 'EffInst', 'run('),
    '[User@M|rigid:0]');
});

test('construct: the opened row of a closed constructor', () => {
  assert.equal(one(sources.uses, 'made', 'OpenedRow', 'Some'),
    '[|rigid:0]');
});

test("reference: a reference's instance row", () => {
  assert.equal(one(sources.uses, 'call', 'EffInst', 'one'), '[|rigid:0]');
});

test('partial: a dropped stage reads empty and open', () => {
  assert.equal(one(sources.uses, 'part', 'Stage', 'add(1)'), '[|hole]');
});

test('operation: a perform opens the operation row', () => {
  assert.equal(one(sources.uses, 'inc', 'OpenedRow', 'Log.log'),
    '[|rigid:0]');
});

test('apply: the consumed row of each applied stage', () => {
  assert.equal(one(sources.uses, 'applied', 'Stage', 'f(1, 2)', 1),
    '[|rigid:0]');
  assert.equal(one(sources.uses, 'logged', 'Stage', 'f(1)', 0),
    '[User@M|rigid:0]');
});

test('pipe: the consumed row of a piped stage', () => {
  assert.equal(one(sources.uses, 'piped', 'Stage', '1 |> inc'),
    '[User@M|rigid:0]');
});

test('over-application: the extra stage under its argument', () => {
  assert.equal(one(sources.over, 'overTwo', 'Stage', 'two('), '[|rigid:0]');
  assert.equal(one(sources.over, 'inFirst', 'Stage', 'two('),
    '[User@M|rigid:0]');
  assert.equal(one(sources.over, 'inExtra', 'Stage', 'two('),
    '[User@M|rigid:0]');
});

test('lambda stage: read from the lambda type', () => {
  assert.equal(one(sources.uses, 'lam', 'Stage', 'fn(x'), '[|rigid:0]');
});

test('show and crash: the synthesized lambda after unification', () => {
  assert.equal(one(sources.builtins, 'shown', 'Stage', 'show'),
    '[User@M|rigid:0]');
  assert.equal(one(sources.builtins, 'crashed', 'Stage', 'crash'),
    '[User@M|rigid:0]');
});

test('pattern instance: read from the pattern type', () => {
  assert.equal(one(sources.handlers, 'job', 'EffInst', 'Job(f)'),
    '[|rigid:0]');
});

test('literal R and C: read from the handler type and clause entry', () => {
  assert.equal(one(sources.handlers, 'handled', 'HandlerInference',
    'handler'), '[User@M|rigid:0]');
  assert.equal(one(sources.handlers, 'handled', 'HandlerClauses',
    'handler'), '[User@M|closed]');
});

test("clause row: read from the clause entry's own row", () => {
  assert.equal(one(sources.handlers, 'handled', 'Clauses', 'handler'),
    '[User@M|hole]');
});

test('deferred: the deferred expression row', () => {
  assert.equal(one(sources.handlers, 'deferred', 'EffectOf', null),
    '[Console@N|hole]');
});

test('annotation C: read from the parameter type', () => {
  assert.equal(one(sources.handlers, 'annotated', 'AnnotationClauses',
    'fn(h'), '[|hole]');
});

test("main's entry tail: read from the checked row", () => {
  assert.equal(one(sources.uses, 'main', 'EntryTail', null), '[|hole]');
});

test("bare C keeps Fail's payload", () => {
  const { item, map } = rows(sources.handlers, 'failing');
  const [clauses] = varsOf(item, 'HandlerClauses', 'handler');
  const value = valueOf(map, clauses);
  assert.equal(rowText(value), '[Fail(PBase)@N|closed]');
  assert.equal(named(value.labels[0].effect), 'FailEffect');
  assert.equal(named(value.labels[0].args[0].value0), 'TextBase');
});

test('Fail and Console read as N', () => {
  // Terms that answer M for every mark: Fail and Console stay N.
  const everyM = () => new cases.Just(cases.Package.TermM.value);
  assert.equal(one(sources.handlers, 'deferred', 'EffectOf', null,
    undefined, everyM), '[Console@N|hole]');
  assert.equal(one(sources.handlers, 'failing', 'HandlerClauses',
    'handler', undefined, everyM), '[Fail(PBase)@N|closed]');
  assert.equal(one(sources.handlers, 'handled', 'Clauses', 'handler',
    undefined, everyM), '[User@M|hole]');
});

test('applied and piped rows read as the consumed row', () => {
  for (const [name, text] of [['logged', 'f(1)'], ['piped', '1 |> inc'],
    ['applied', 'f(1, 2)']]) {
    const { item, map } = rows(sources.uses, name);
    for (const stage of varsOf(item, 'Stage', text)) {
      const entries = cases.consumedOf(item, stage);
      assert.equal(named(entries), 'Just', `${name}: a trace entry`);
      assert.equal(entries.value0.length, 1);
      const consumed = Convert.convertRow(cases.stub)(entries.value0[0]);
      assert.equal(rowText(valueOf(map, stage)), rowText(consumed.value0));
    }
  }
});

const spanKey = text => {
  const [start, end] = text.split('-').map(Number);
  return cases.Tuple.Tuple.create(start)(end);
};

test('unread role is a read fault', () => {
  const item = live(sources.uses, 'call');
  const found = read(item, { ...item.trace, uses: Maps.empty });
  assert.equal(named(found), 'Left');
  assert.equal(named(found.value0), 'Unread');
  assert.equal(named(found.value0.value0.value1), 'EffInst');
});

test('two trace entries under one key are a Clash', () => {
  const item = live(sources.uses, 'call');
  const key = spanKey(spanOf(item.source, 'run(one)'));
  const entry = Maps.lookup(keyOrd)(key)(item.trace.uses).value0;
  const twice = { ...item.trace, uses: Maps.insert(keyOrd)(key)(
    [...entry, ...entry])(item.trace.uses) };
  const found = read(item, twice);
  assert.equal(named(found), 'Left');
  assert.equal(named(found.value0), 'Clash');
  assert.equal(named(found.value0.value0), 'UseKey');
});

test('located and traced disagree is Apart', () => {
  // `let f = add` reads Stage 0 from the reference's use entry and from
  // its node type; a planted label in the traced one sets them apart.
  const item = live(sources.uses, 'applied');
  const start = Number(spanOf(item.source, 'let f = add').split('-')[0])
    + 'let f = '.length;
  const key = spanKey(`${start}-${start + 'add'.length}`);
  const [use] = Maps.lookup(keyOrd)(key)(item.trace.uses).value0;
  const console = new cases.Row.Label(cases.Row.ConsoleEffect.value, [],
    cases.Row.NoFail.value);
  const planted = { ...use, stages: [new cases.Row.Row([console],
    use.stages[0].value1)] };
  const found = read(item, { ...item.trace, uses: Maps.insert(keyOrd)(key)(
    [planted])(item.trace.uses) });
  assert.equal(named(found), 'Left');
  assert.equal(named(found.value0), 'Apart');
  assert.equal(named(found.value0.value0.value1), 'Stage');
});
