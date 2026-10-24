import assert from 'node:assert/strict';
import test from 'node:test';
import { jobsVariable, regressionJobs, runPool }
  from '../scripts/regression-pool.mjs';
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
test('the pool never exceeds its bound and reaches it', async () => {
  let active = 0, peak = 0;
  const task = async () => {
    peak = Math.max(peak, ++active);
    await pause();
    active--;
  };
  await runPool(Array.from({ length: 20 }, (_, n) => n), 4, task);
  assert.equal(peak, 4);
});
test('a failing task does not stop the rest, and is named in order',
  async () => {
    const ran = [];
    const task = async item => {
      await pause();
      ran.push(item);
      if (item === 3 || item === 7) throw new Error(`bad ${item}`);
    };
    const results = await runPool([1, 2, 3, 4, 5, 6, 7, 8], 3, task);
    assert.equal(ran.length, 8);
    const failed = results.filter(r => r.error !== undefined)
      .map(r => r.item);
    assert.deepEqual(failed, [3, 7]);
    assert.deepEqual(results.map(r => r.item), [1, 2, 3, 4, 5, 6, 7, 8]);
  });
test('jobs come from the environment, 1 is sequential', () => {
  assert.equal(regressionJobs({ [jobsVariable]: '1' }), 1);
  assert.equal(regressionJobs({ [jobsVariable]: '5' }), 5);
  assert.ok(regressionJobs({}) >= 1 && regressionJobs({}) <= 6);
  assert.throws(() => regressionJobs({ [jobsVariable]: '0' }));
  assert.throws(() => regressionJobs({ [jobsVariable]: 'x' }));
});
