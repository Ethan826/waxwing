import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { byH, finishWith, finishWithoutH, run } from './row-merge-entry.mjs';
import { everyOrder, problems } from './row-merge-domains.mjs';
import { allOrders, fiveOrders, mulberry, permProblem, rawProblem,
  shapedProblem } from './row-merge-gen.mjs';
import { defects, judge, newTally } from './row-merge-judge.mjs';

// R005 Tranche B B4, H (plan §4.2, rules §7): a classification rule at
// the end of a body only. With H off (the entry's `finishWithoutH`) the
// same run is accepted exactly when it is with H, with the same state;
// the only difference H may make is Unresolved -> Contradiction (the
// judge's `hOff`, defect `hDiff`). Every refusal of H is checked by the
// brute-force oracle (the judge's H: no solution). H is consulted only
// when a predicate waits. The fixtures whose class H decides keep
// showing it.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const { Nothing } = await import(`${output.href}/Data.Maybe/index.js`);

const SAMPLE = { A: 400, B: 10 };

for (const name of ['A', 'B']) {
  test(`H classifies only: domain ${name}, one in ${SAMPLE[name]}`, t => {
    const tally = newTally();
    for (const p of problems(name, { stride: SAMPLE[name] })) {
      judge(p, everyOrder(p.cs), tally, { hOff: true });
    }
    const { examples, ...counts } = tally;
    t.diagnostic(JSON.stringify(counts));
    assert.deepEqual(defects(tally), []);
    assert.ok(tally.hRefuse > 0 && tally.hOffChecked === tally.runs);
  });
}

const GENERATORS = [
  ['raw', rnd => permProblem(rnd, false), 21],
  ['dense', rnd => permProblem(rnd, true), 22],
  ['raw programs', rnd => rawProblem(rnd), 23],
  ['program-shaped', rnd => shapedProblem(rnd, false), 24],
  ['program-shaped, shared', rnd => shapedProblem(rnd, true), 25],
];
const PROBLEMS = 200;

test('H classifies only: the generated families, five orders', t => {
  const tally = newTally();
  for (const [, generate, seed] of GENERATORS) {
    const rnd = mulberry(seed);
    for (let i = 0; i < PROBLEMS; i++) {
      const p = generate(rnd);
      judge(p, fiveOrders(rnd, p.cs), tally, { hOff: true });
    }
  }
  const { examples, ...counts } = tally;
  t.diagnostic(JSON.stringify(counts));
  assert.deepEqual(defects(tally), []);
  assert.ok(tally.hRefuse > 0);
});

// A judge that counts its calls and finds no constant without a home:
// the end of a body asks it only when a predicate waits, once per
// waiting predicate.
test('H is consulted only when a predicate waits', () => {
  let asked = 0;
  const counting = () => () => {
    asked++;
    return Nothing.value;
  };
  const rnd = mulberry(26);
  let solved = 0;
  let waited = 0;
  for (let i = 0; i < PROBLEMS; i++) {
    const p = permProblem(rnd, false);
    for (const order of fiveOrders(rnd, p.cs)) {
      const before = asked;
      const found = run(p.hyp, order, finishWith(counting));
      if (found.v === 'accept') {
        solved++;
        assert.equal(asked, before, JSON.stringify(order));
      }
      if (found.v === 'unresolved') {
        waited++;
        assert.equal(asked - before, found.merges.length);
      }
    }
  }
  assert.ok(solved > 0 && waited > 0);
});

// The fixtures whose class H decides (plan §4.2): `diag-14` is a
// Contradiction only by H, Unresolved without it; `diag-03` and `diag-05`
// are Contradictions before the end (Sym's cases), with or without H.
const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`,
    'utf8')));
const rowsOf = name => fixtures.find(f => f.name === name).rows;

test('fixtures: diag-14 by H alone; diag-03, diag-05 before the end', () => {
  for (const [name, withoutH, withH] of [
    ['diag-14', 'unresolved', true], ['diag-03', 'refuse', false],
    ['diag-05', 'refuse', false]]) {
    const rows = rowsOf(name);
    for (const order of allOrders(rows.steps)) {
      const found = run(rows.hyp, order);
      assert.equal(found.v, 'refuse', `${name} ${JSON.stringify(order)}`);
      assert.equal(Boolean(found.atEnd && byH(found.failure)), withH, name);
      assert.equal(run(rows.hyp, order, finishWithoutH).v, withoutH, name);
    }
  }
});
