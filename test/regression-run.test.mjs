import assert from 'node:assert/strict';
import test from 'node:test';
import { exitCodeFor, runRegression } from '../scripts/regression-run.mjs';
import { runPool } from '../scripts/regression-pool.mjs';
const names = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
const rows = names.map(name => ({ name }));
const pause = () => new Promise(resolve => setTimeout(resolve, 3));
const noBaseline = () => {};
// Mimics the real prover's assertion: the restored defect must fail the
// probe; a defect that does not fail is an assertion error.
const proverWhereDefectSurvives = survivor => async row => {
  await pause();
  assert.equal(row.name === survivor, false,
    `${row.name}: restored defect did not fail`);
};
const passingProver = async () => pause();
// Collects console output for the duration of `run`.
const captured = async (t, run) => {
  const lines = [];
  t.mock.method(console, 'log', line => lines.push(line));
  t.mock.method(console, 'error', line => lines.push(line));
  const result = await run();
  return { result, lines };
};
const options = prove => ({ prove, buildBase: noBaseline });
test('one row whose defect does not fail is the only failure', async t => {
  const { result, lines } = await captured(t, () => runRegression(rows, [],
    4, options(proverWhereDefectSurvives('charlie'))));
  assert.deepEqual(result, ['charlie']);
  assert.ok(lines.includes(
    'Regression proofs: 4 of 5 passed (jobs 4).'), lines.join('\n'));
  assert.ok(lines.some(line => line.includes('FAILED: charlie')),
    lines.join('\n'));
  assert.equal(exitCodeFor(result), 1);
});
test('a row rejecting without a reason is counted as failed',
  async t => {
    const prove = async row => {
      await pause();
      if (row.name === 'delta') return Promise.reject();
    };
    const { result, lines } = await captured(t, () => runRegression(rows,
      [], 4, options(prove)));
    assert.deepEqual(result, ['delta']);
    assert.ok(lines.includes('Regression proofs: 4 of 5 passed (jobs 4).'),
      lines.join('\n'));
    assert.equal(exitCodeFor(result), 1);
  });
test('all rows passing gives no failures and exit code 0', async t => {
  const { result, lines } = await captured(t, () => runRegression(rows, [],
    4, options(passingProver)));
  assert.deepEqual(result, []);
  assert.ok(lines.includes('Regression proofs: 5 of 5 passed (jobs 4).'));
  assert.ok(!lines.some(line => line.includes('FAILED')));
  assert.equal(exitCodeFor(result), 0);
});
test('an unknown row name fails and names the unknown name', async t => {
  let proved = 0;
  const prove = async () => { proved++; };
  await captured(t, async () => {
    await assert.rejects(() => runRegression(rows, ['bravo', 'no-such-row'],
      4, options(prove)), /no-such-row/);
  });
  assert.equal(proved, 0);
});
test('fewer than one job is refused', async () => {
  await assert.rejects(() => runRegression(rows, [], 0, options(passingProver)),
    /jobs/);
  await assert.rejects(() => runPool([1], 0, async () => {}), /jobs/);
});
