import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { validateCases } from './regression-r0-a2-validate.mjs';
import { acceptedButFailing, differential, scope, validateList }
  from './regression-r0-a2-mb.mjs';
import { criterion, everyValuation, pinned } from './r0-a2-mb-graph.mjs';
import { laneList } from './r0-a2-mb-lanes.mjs';

// A2 Task 13 (docs/plans/2026-10-31-a2-validator-plan.md): the M-B
// differential (spec §8, M-C: test only; §18.145 (c)). The independent
// collector's graph, with each candidate term pinned as its position's
// value, is judged under every valuation of the declaration's rigid
// marks and compared with `judgeObligations` on the same package.
// bounded agreement on exercised inputs only; not E12 exhaustiveness,
// not soundness (the author's D6 ruling). The exercised inputs: Task
// 11's case packages, Tasks 7-9's packages over honest defaults
// (test/r0-a2-mb-lanes.mjs), rigid-mark cases, and one single-term
// forgery per position of each. A disagreement is a stop for the
// author: neither side is presumed correct.
const cases = await validateCases(load);
const mb = differential(cases);
const list = [...validateList(cases), ...laneList(cases)];
const families = list.map(([name, problem, input]) =>
  mb.variants(name, problem, input));
const runs = families.flat();
const accepts = run => run.validator === 'Right';

test('accepted packages pass the pinned graph on exercised inputs', t => {
  const valuations = runs.map(run => `${run.valuations.n}:${
    run.valuations.count}`);
  t.diagnostic(`${runs.length} packages (${list.length} cases); ${
    runs.filter(accepts).length} accepted; n:valuations run ${
    [...new Set(valuations)].join(' ')}`);
  for (const run of runs)
    assert.equal(run.valuations.count, 2 ** run.valuations.n, run.name);
  assert.ok(runs.filter(accepts).length >= 9);
  assert.ok(runs.some(run => accepts(run) && run.valuations.n >= 2));
  assert.deepEqual(acceptedButFailing(runs), []);
});

// A mark refusal: a refused package one term away from an accepted one
// (a forgery of an accepted case package, or a refused case package one
// of whose forgeries is accepted). Terms reach only mark checks.
const markRefusals = families.flatMap(([base, ...forged]) =>
  accepts(base) ? forged.filter(run => !accepts(run))
    : forged.some(accepts) ? [base] : []);

test('refused mark packages fail the pinned graph on exercised inputs',
  t => {
    t.diagnostic(`${markRefusals.length} mark refusals`);
    assert.ok(markRefusals.length >= 8);
    const passing = markRefusals.filter(run => run.mb).map(run =>
      `${run.name}: judgeObligations refuses (${run.validator}); `
      + 'the pinned M-B graph holds');
    assert.deepEqual(passing, []);
  });

test('a satisfiable graph with a wrong assignment is refused', () => {
  // `call`'s g, its obligations replaced by one call-site consumption
  // whose only edge is mark(ρ Log) ⊑ mark(s Log): p ⊑ N, p the use's
  // instantiated position.
  const [, problem] = list.find(([name]) => name === 'rigid call J 0');
  const [position] = problem.effects.positions;
  const { Effect, Row, Nothing } = cases;
  const log = mark => ({ effect: new Row.UserEffect(0), args: [], mark });
  const row = mark => ({ labels: [log(mark)], tail: Nothing.value });
  const consume = new Effect.Consume({ site: Effect.AtCall.value,
    source: row(new Effect.Written(Effect.FixedN.value)),
    target: row(new Effect.At(position)), marks: true, bare: false });
  const only = { ...problem, effects: { ...problem.effects,
    obligations: [{ ...problem.effects.obligations[1], value: consume }] } };
  const judged = term => mb.judgeBoth(only, mb.withTerm(
    cases.honest(only), position, term));
  const wrong = judged('M');
  assert.equal(wrong.graph.edges.length, 1);
  assert.equal(wrong.graph.edges[0][1], 'c:N');
  assert.equal(wrong.graph.equal.length, 0);
  assert.deepEqual(criterion(wrong.graph), { ok: true });
  assert.equal(wrong.valuations.failing.length, wrong.valuations.count);
  assert.equal(wrong.mb, false);
  assert.equal(wrong.validator, 'ObligationFailed');
  // The least term, N, passes both.
  assert.equal(judged('N').validator, 'Right');
  assert.equal(judged('N').mb, true);
});

test('least terms pass on exercised inputs', t => {
  // Cases with a structurally passing variant (some variant accepted):
  // when their unpinned graph is satisfiable, the least-term package.
  const eligible = families.filter(family => family.some(accepts))
    .map(([base]) => base)
    .filter(base => criterion(base.graph).ok);
  t.diagnostic(`${eligible.length} satisfiable cases`);
  assert.ok(eligible.length >= 9);
  const refused = eligible.flatMap(base => {
    const least = mb.leastOf(base.problem, base.input, base.graph,
      base.terms);
    const run = mb.judgeBoth(base.problem, least);
    return run.validator === 'Right' && run.mb ? []
      : [`${base.name}: least terms ${run.validator}, M-B ${run.mb}`];
  });
  assert.deepEqual(refused, []);
});

test('agreement scope', t => {
  t.diagnostic(scope);
  assert.equal(scope, 'bounded agreement on exercised inputs only; '
    + 'not E12 exhaustiveness, not soundness');
  const header = readFileSync('test/r0-a2-mb.test.mjs', 'utf8')
    .replace(/\n\/\/ /g, ' ');
  assert.ok(header.includes('bounded agreement on exercised inputs only; '
    + 'not E12 exhaustiveness, not soundness'));
});

test('the pinned check runs every valuation of the rigid marks', () => {
  // Two rigid marks, four valuations: `J {a} ⊑ J {a, b}` holds in all,
  // `J {a, b} ⊑ J {a}` fails exactly where b is M.
  const graph = pin => pinned({ edges: [['p', 'q']], equal: [] }, ['p', 'q'],
    pin);
  const up = everyValuation(graph(node => node === 'p' ? ['a']
    : ['a', 'b']), ['a', 'b']);
  assert.deepEqual([up.n, up.count, up.failing.length], [2, 4, 0]);
  const down = everyValuation(graph(node => node === 'p' ? ['a', 'b']
    : ['a']), ['a', 'b']);
  assert.deepEqual(down.failing, [{ a: 'N', b: 'M' }]);
});
