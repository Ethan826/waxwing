import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { sources, c2c } from './regression-r0-a2-validate.mjs';
import { reportCases, hole } from './regression-r0-a2-report.mjs';
import { classify, holeSettledPayloads, render,
  summarize, categories } from './r0-a2-differential.mjs';

// A2 Task 14 (docs/plans/2026-10-31-a2-validator-plan.md): the
// differential reporter and C6. Fixture evidence only: corpus reporting
// waits for Task 16 and tranche 2. Every validator result here is
// fixture-level, so it is labeled "observed on the fixture".
const Verdict = await load('Domain.Verdict');
const { cases, k, kInput, two, twoInput } = await reportCases(load);
const { problemOf, honest, validate, describe, Effect, Maps } = cases;
const accepts = { accepts: true };
const refuses = (refusal, at) => ({ accepts: false, refusal, at });
const fixture = (name, today, problem, input, more = {}) => classify({
  name, evidence: 'fixture', today, problem, input, ...more });

test('an unrelated widening is not C6', () => {
  // The validator accepts `id`; today refuses it for another reason.
  const id = problemOf(sources.id, 'id');
  const row = fixture('id', refuses('NofailOnFail'), id, honest(id));
  assert.equal(row.category, 'ValidatorWider');
  // FailNeedsConcrete, but the payload is concrete: no hole to settle.
  const concrete = kInput('Int', 'Int');
  assert.equal(describe(validate(k, concrete)), 'Right');
  assert.deepEqual(holeSettledPayloads(k, concrete), []);
  const named = fixture('k-concrete', refuses('FailNeedsConcrete', 1), k,
    concrete);
  assert.equal(named.category, 'ValidatorWider');
  // A hole payload, but today's refusal is another one.
  const settled = kInput(hole);
  const other = fixture('k-other', refuses('NofailOnFail', 1), k, settled);
  assert.equal(other.category, 'ValidatorWider');
  // And today accepting it is Agree, never C6.
  assert.equal(fixture('k-ok', accepts, k, settled).category, 'Agree');
});

test('C6 is tied to the obligation today refuses at', () => {
  // Obligations 1 and 4 are k's two FailConcretes: 1 is bound to Int, 4
  // is a hole. The validator accepts the package.
  assert.equal(describe(validate(two, twoInput)), 'Right');
  assert.deepEqual(holeSettledPayloads(two, twoInput), [4]);
  const at = index => fixture('two', refuses('FailNeedsConcrete', index),
    two, twoInput).category;
  assert.equal(at(1), 'ValidatorWider');
  assert.equal(at(4), 'C6-expected-divergence');
  // No named site: not C6.
  assert.equal(fixture('two', refuses('FailNeedsConcrete'), two, twoInput)
    .category, 'ValidatorWider');
});

test('fixture and corpus kept apart', () => {
  const id = problemOf(sources.id, 'id');
  const base = { today: accepts, problem: id, input: honest(id) };
  const rows = [classify({ name: 'a', evidence: 'fixture', ...base }),
    classify({ name: 'b', evidence: 'corpus', ...base })];
  assert.deepEqual(rows.map(row => row.evidence), ['fixture', 'corpus']);
  assert.deepEqual(rows.map(row => row.basis),
    ['observed on the fixture', 'observed']);
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
  const both = fixture('both-refuse', refuses('Other'), g, honest(g));
  assert.deepEqual([both.category, both.kind], ['Agree',
    'NotCertifiable']);
  assert.equal(summarize([both]).fixture['Agree/NotCertifiable'], 1);
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
  assert.deepEqual(kindOf('p', use, wrong), ['ValidatorStricter', 'G0']);
  assert.equal(fixture('w', refuses('X'), id, honest(id)).category,
    'ValidatorWider');
  const heldBack = fixture('c', refuses('FailNeedsConcrete', 1), k,
    kInput(hole));
  assert.equal(heldBack.category, 'C6-expected-divergence');
  assert.deepEqual(categories, ['Agree', 'ValidatorStricter',
    'ValidatorWider', 'C6-expected-divergence', 'GenerationDefect']);
});

test('a record defect is a generation defect under any verdict', () => {
  const g = problemOf(sources.c3, 'g');
  const bad = flagged(g);
  const input = honest(g);
  const refusal = validate(bad, input);
  assert.equal(describe(refusal), 'RecordDefect');
  const known = refusal.value0.value0.provenance;
  for (const today of [accepts, refuses('FailNeedsConcrete', 1)]) {
    const row = fixture('d', today, bad, input);
    assert.equal(row.category, 'GenerationDefect');
    assert.match(render([row]), /defect at \{"AtSite"/);
  }
  // A RecordDefective block does the same beside any validator result,
  // and the output names the block's provenance.
  const id = problemOf(sources.id, 'id');
  const block = new Verdict.RecordDefective(known);
  for (const today of [accepts, refuses('Other')]) {
    const row = fixture('b', today, id, honest(id), { blocks: [block] });
    assert.equal(row.category, 'GenerationDefect');
    assert.match(render([row]), /defect at \{"AtSite"/);
  }
});

// Spec §12 C6, as ruled (dossier §18.148 (4)): two cases, two tests.
// Field binding absent: the pipeline refuses `k` at G0 (Unsatisfied: G0
// reads erase (settle P_in), where the field stays flexible), observed.
// No end-to-end acceptance is claimed, and it is not the divergence;
// the obligations-only note is a separately labeled stage reading.
test('C6 field absent: refused at G0, no divergence', () => {
  const absent = kInput(null);
  assert.equal(describe(validate(k, absent)), 'Unsatisfied');
  const row = fixture('k-absent', refuses('FailNeedsConcrete', 1), k,
    absent);
  assert.deepEqual([row.category, row.kind], ['Agree', 'Unsatisfied']);
  assert.notEqual(row.category, 'C6-expected-divergence');
  assert.equal(row.obligationsOnly, 'accepts');
  assert.match(render([row]),
    /refuses Unsatisfied; obligations-only: accepts/);
  assert.doesNotMatch(render([row]), /validator accepts/);
});

// Field explicitly bound to a hole: settling gives Int, E9 holds and the
// full validator accepts (observed on the fixture): the demonstrated shadow
// divergence, the only C6 row in the expected-divergence category. The
// replacement-compatibility decision stays open.
test('C6 field bound to a hole: the expected divergence', () => {
  const bound = kInput(hole);
  assert.equal(describe(validate(k, bound)), 'Right');
  assert.deepEqual(holeSettledPayloads(k, bound), [1]);
  const c6 = fixture('k-bound', refuses('FailNeedsConcrete', 1), k, bound);
  assert.equal(c6.category, 'C6-expected-divergence');
  assert.match(render([c6]), /observed on the fixture: validator accepts/);
  assert.doesNotMatch(render([c6]), /predicted/);
});
