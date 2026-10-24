import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';
import { subProblem } from './r0-cx-support.mjs';

// Task 5.2, CX question 3 (refute/statements.md §8): the check's cost.
// Deciding the body false enumerates every presence pattern, 2^pairs
// (pairs: the sub-body's row variables times its labels, after `ρ`), so
// that is the bound; each probe certificate's check is timed (median of
// `runs`; 5 for the widest) beside it, and the corpus's widest
// certificate too. Timing,
// so serial; `timeBound` is generous, the times themselves are recorded
// in docs/findings.md.
const online = await onlineFrom(load);
const Search = await load('Features.Check.Refute.Counter.Search');
const Check = await load('Features.Check.Refute.Counter.Check');
const Instance = await load('Features.Check.Refute.Counter.Instance');
const Decide = await load('Features.Check.Refute.Counter.Decide');
const Project = await load('Features.Check.Refute.Project');
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');

const runs = 21;
const timeBound = 500;

const median = values => [...values].sort((a, b) => a - b)[
  Math.floor(values.length / 2)];

const costOf = (problem, cx, times = runs) => {
  const sub = subProblem(Project.toSig(problem).value0, cx.body);
  const pairs = Decide.pairCount(Instance.instantiate(cx.rho)(sub.b));
  const elapsed = [];
  let checked;
  for (let at = 0; at < times; at += 1) {
    const start = performance.now();
    checked = Check.checkCX(problem)(cx);
    elapsed.push(performance.now() - start);
  }
  assert.equal(checked.constructor.name, 'Right');
  return { pairs, bound: 2 ** pairs, patterns: checked.value0.patterns,
    ms: median(elapsed) };
};

const programOf = source => {
  const resolved = resolve(parse(source).value0);
  return resolved.constructor.name === 'Right' ? resolved.value0 : null;
};

const probeDir = 'research/division-campaign/r0/probes';
const certificates = readdirSync(join(repoRoot, probeDir)).sort()
  .flatMap(file => {
    const program = programOf(readFileSync(join(repoRoot, probeDir, file),
      'utf8'));
    return program === null ? [] : program.functions.flatMap(decl => {
      const problem = online.problemOf(program, decl.name);
      const found = Search.searchCX(budget)([])(problem);
      return found.constructor.name === 'Just' ? [{ at: `${file}#${
        decl.name}`, problem, cx: found.value0 }] : [];
    });
  });

test('CX question 3: each probe check enumerates its bound', () => {
  assert.equal(certificates.length, 12);
  const table = certificates.map(({ at, problem, cx }) =>
    ({ at, ...costOf(problem, cx) }));
  for (const row of table) {
    assert.equal(row.patterns, row.bound, row.at);
    assert.ok(row.ms < timeBound, `${row.at}: ${row.ms} ms`);
  }
  console.log(table.map(row => `${row.at}: pairs ${row.pairs}, `
    + `patterns ${row.patterns}, ${row.ms.toFixed(3)} ms`).join('\n'));
});

// The corpus's widest certificate (13 pairs; test/r0-cx-corpus).
test('CX question 3: the widest corpus certificate', () => {
  const source = readFileSync(join(repoRoot,
    'research/division-campaign/finite-base-followup/generic.wxw'), 'utf8');
  const program = programOf(source);
  const problem = online.problemOf(program, 'route');
  const found = Search.searchCX(budget)([])(problem);
  const cost = costOf(problem, found.value0, 5);
  assert.deepEqual([cost.pairs, cost.patterns], [13, 8192]);
  assert.ok(cost.ms < timeBound * 4, `${cost.ms} ms`);
  console.log(`generic.wxw#route: pairs 13, patterns 8192, `
    + `${cost.ms.toFixed(1)} ms`);
});
