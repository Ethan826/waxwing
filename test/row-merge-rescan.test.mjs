import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fiveOrders, fixtureOrders, mulberry, permProblem, rawProblem,
  shapedProblem } from './row-merge-gen.mjs';
import { everyOrder, problems } from './row-merge-domains.mjs';
import { compare, newComparison, NEVER } from './row-merge-rescan.mjs';

// R005 Tranche B Task 5, ledger L32: the indexed wake-up against the
// reference that rescans every pending equation to a fixpoint
// (test/row-merge-rescan.mjs), on the fixtures in every order named, the
// five generators in five orders and samples of the exhaustive domains in
// every order; the whole domains by `node scripts/row-merge-exhaustive.mjs
// A rescan` (and B), outside verify. Any difference fails.
const fixtures = readdirSync('test/fixtures/r005b').sort()
  .map(name => JSON.parse(readFileSync(`test/fixtures/r005b/${name}`, 'utf8')))
  .filter(fixture => fixture.rows);

const report = (t, tally) => {
  const { examples, ...counts } = tally;
  t.diagnostic(JSON.stringify(counts));
  assert.equal(tally.different, 0, JSON.stringify(examples));
};

test('fixtures: indexed and rescanned drains agree in every order', t => {
  const tally = newComparison();
  for (const fixture of fixtures) {
    compare({ hyp: fixture.rows.hyp }, fixtureOrders(fixture.rows), tally);
  }
  report(t, tally);
  assert.ok(tally.verdicts.D4 > 0 && tally.verdicts.accept > 0);
});

const GENERATORS = [
  [rnd => permProblem(rnd, false), 21], [rnd => permProblem(rnd, true), 22],
  [rnd => rawProblem(rnd), 23], [rnd => shapedProblem(rnd, false), 24],
  [rnd => shapedProblem(rnd, true), 25]];

test('generators, five orders: indexed and rescanned drains agree', t => {
  const tally = newComparison();
  for (const [generate, seed] of GENERATORS) {
    const rnd = mulberry(seed);
    for (let i = 0; i < 400; i++) {
      const p = generate(rnd);
      compare(p, fiveOrders(rnd, p.cs), tally);
    }
  }
  report(t, tally);
});

const SAMPLE = { A: 200, B: 5 };

for (const name of ['A', 'B']) {
  test(`domain ${name}, one candidate in ${SAMPLE[name]}: drains agree`, t => {
    const tally = newComparison();
    for (const p of problems(name, { stride: SAMPLE[name] })) {
      compare(p, everyOrder(p.cs), tally);
    }
    report(t, tally);
    assert.ok(tally.verdicts.D4 > 0);
  });
}

// Sensitivity: a drain that never re-examines differs from the reference.
test('the comparison catches a drain that misses its wake-ups', t => {
  const tally = newComparison();
  const rnd = mulberry(22);
  for (let i = 0; i < 200; i++) {
    const p = permProblem(rnd, true);
    compare(p, fiveOrders(rnd, p.cs), tally, NEVER);
  }
  t.diagnostic(`${tally.different} of ${tally.runs} runs differ`);
  assert.ok(tally.different > 0);
});
