import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf } from './r0-a2-package.mjs';
import { validateCases, sources, c2c }
  from './regression-r0-a2-validate.mjs';
import { classify, obligationsOnly, holeSettledPayloads, render,
  summarize, categories } from './r0-a2-differential.mjs';

// A2 Task 14 (docs/plans/2026-10-31-a2-validator-plan.md): the
// differential reporter and C6. Fixture evidence only: corpus reporting
// waits for Task 16 and tranche 2. Every validator acceptance here is
// fixture-level, so it is labeled "predicted".
const Verdict = await load('Domain.Verdict');
const cases = await validateCases(load);
const { problemOf, honest, validate, describe, Effect, Maps } = cases;
const accepts = { accepts: true };
const refuses = refusal => ({ accepts: false, refusal });
const fixture = (name, today, problem, input, more = {}) => classify({
  name, evidence: 'fixture', today, problem, input, ...more });

// The audit fixture fail-needs-concrete-check's `k` (C6). Flexible types:
// Param (the lambda's record), Res, Field (r.e's payload), Rest (a tail).
const kSource = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;';
const k = problemOf(kSource, 'k');
const [param, res, field, rest] = cases.flexTypes(k);
const hole = { var: { hole: 7 } };
const failOf = payload => ({ labels: [{ effect: 'Fail', args: [payload],
  mark: 'N' }], tail: null });
// The lambda's row is `Fail(payload)`, so the consumption lines up; the
// field variable is bound to `image`, or left out when that is null.
const kInput = (image, payload = hole) => {
  const given = packageOf({
    types: [[res, 'Unit'], [param, { record: { fields: [['e', payload]],
      tails: [] } }], ...(image === null ? [] : [[field, image]])],
    rows: [[rest, { fields: [], tails: [] }]],
    effects: [[k.effects.flexEff[0], failOf(payload)]] });
  return { ...honest(k), types: given.types, rows: given.rows,
    effects: given.effects };
};

test('an unrelated widening is not C6', () => {
  // The validator accepts `id`; today refuses it for another reason.
  const id = problemOf(sources.id, 'id');
  const row = fixture('id', refuses('NofailOnFail'), id, honest(id));
  assert.equal(row.category, 'ValidatorWider');
  // FailNeedsConcrete, but the payload is concrete: no hole to settle.
  const concrete = kInput('Int', 'Int');
  assert.equal(describe(validate(k, concrete)), 'Right');
  assert.deepEqual(holeSettledPayloads(k, concrete), []);
  const named = fixture('k-concrete', refuses('FailNeedsConcrete'), k,
    concrete);
  assert.equal(named.category, 'ValidatorWider');
  // A hole payload, but today's refusal is another one.
  const settled = kInput(hole);
  const other = fixture('k-other', refuses('NofailOnFail'), k, settled);
  assert.equal(other.category, 'ValidatorWider');
  // And today accepting it is Agree, never C6.
  assert.equal(fixture('k-ok', accepts, k, settled).category, 'Agree');
});

test('fixture and corpus kept apart', () => {
  const id = problemOf(sources.id, 'id');
  const base = { today: accepts, problem: id, input: honest(id) };
  const rows = [classify({ name: 'a', evidence: 'fixture', ...base }),
    classify({ name: 'b', evidence: 'corpus', ...base })];
  assert.deepEqual(rows.map(row => row.evidence), ['fixture', 'corpus']);
  assert.deepEqual(rows.map(row => row.basis), ['predicted', 'observed']);
  assert.throws(() => classify({ name: 'c', ...base }), /fixture or corpus/);
  const [fixtureLines, corpusLines] = render(rows).split('corpus evidence:');
  assert.match(fixtureLines, /\ba: Agree/);
  assert.doesNotMatch(fixtureLines, /\bb:/);
  assert.match(corpusLines, /\bb: Agree/);
  const counts = summarize(rows);
  assert.equal(counts.fixture.Agree, 1);
  assert.equal(counts.corpus.Agree, 1);
});

const withEffect = (input, variable) => ({ ...input,
  effects: Maps.insert(Effect.ordEVar)(variable)(cases.closed)(
    input.effects) });
const flagged = problem => ({ ...problem, effects: { ...problem.effects,
  obligations: problem.effects.obligations.map(placed =>
    placed.value instanceof Effect.Consume
      ? { ...placed, value: new Effect.Consume({ ...placed.value.value0,
        bare: !placed.value.value0.bare }) } : placed) } });
const kindOf = (name, problem, input) => {
  const row = fixture(name, accepts, problem, input);
  return [row.category, row.kind];
};

test('categories', () => {
  const id = problemOf(sources.id, 'id');
  assert.equal(fixture('both', accepts, id, honest(id)).category, 'Agree');
  const g = problemOf(sources.c3, 'g');
  assert.equal(fixture('both-refuse', refuses('Other'), g, honest(g))
    .category, 'Agree');
  const use = problemOf(sources.c1, 'use');
  const [forced] = cases.forcedOf(use);
  assert.deepEqual(kindOf('m', use, withEffect(honest(use), forced)),
    ['ValidatorStricter', 'Malformed']);
  const { problem, input } = c2c(cases);
  assert.deepEqual(kindOf('o', problem, input),
    ['ValidatorStricter', 'ObligationFailed']);
  assert.deepEqual(kindOf('n', g, honest(g)),
    ['ValidatorStricter', 'NotCertifiable']);
  const wrong = honest(use, { types: () => new cases.P.PBase(
    cases.Atom.BoolBase.value) });
  assert.deepEqual(kindOf('p', use, wrong),
    ['ValidatorStricter', 'Prerequisite']);
  assert.equal(fixture('w', refuses('X'), id, honest(id)).category,
    'ValidatorWider');
  const heldBack = fixture('c', refuses('FailNeedsConcrete'), k,
    kInput(hole));
  assert.equal(heldBack.category, 'C6-expected-divergence');
  assert.deepEqual(categories, ['Agree', 'ValidatorStricter',
    'ValidatorWider', 'C6-expected-divergence', 'GenerationDefect']);
});

test('a record defect is a generation defect under any verdict', () => {
  const g = problemOf(sources.c3, 'g');
  const bad = flagged(g);
  const input = honest(g);
  assert.equal(describe(validate(bad, input)), 'RecordDefect');
  for (const today of [accepts, refuses('FailNeedsConcrete')])
    assert.equal(fixture('d', today, bad, input).category,
      'GenerationDefect');
  // A RecordDefective block does the same beside any validator result.
  const id = problemOf(sources.id, 'id');
  const block = new Verdict.RecordDefective(
    id.effects.obligations[0]?.provenance);
  for (const today of [accepts, refuses('Other')])
    assert.equal(fixture('b', today, id, honest(id),
      { blocks: [block] }).category, 'GenerationDefect');
});

test('C6 fixture', () => {
  // Field absent: the prerequisites and the recorded obligations accept
  // the package that judges only `k`'s obligations (fixture-level).
  const absent = kInput(null);
  assert.equal(describe(obligationsOnly(k, absent)), 'Right');
  const named = holeSettledPayloads(k, absent);
  assert.deepEqual(named.map(index => k.effects.obligations[index].value
    .constructor.name), ['FailConcrete']);
  const row = fixture('k', refuses('FailNeedsConcrete'), k, absent,
    { result: obligationsOnly(k, absent) });
  assert.equal(row.category, 'C6-expected-divergence');
  assert.notEqual(row.category, 'Agree');
  assert.match(render([row]), /predicted validator accepts/);
  assert.doesNotMatch(render([row]), /observed/);
  // The full runner refuses the absent field at G0 (it reads P_in; Owed
  // Task 15), so the row above is not the full validator's.
  assert.equal(describe(validate(k, absent)), 'Unsatisfied');
  // The field bound to a hole in the package: the full validator accepts.
  const bound = kInput(hole);
  assert.equal(describe(validate(k, bound)), 'Right');
  assert.equal(fixture('k-bound', refuses('FailNeedsConcrete'), k, bound)
    .category, 'C6-expected-divergence');
});
