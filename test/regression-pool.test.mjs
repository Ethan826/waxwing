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
    const failed = results.filter(r => !r.ok).map(r => r.item);
    assert.deepEqual(failed, [3, 7]);
    assert.deepEqual(results.map(r => r.item), [1, 2, 3, 4, 5, 6, 7, 8]);
  });
// A rejection carries no guaranteed reason: `Promise.reject()` and
// `throw undefined` reject with undefined, so failure is the `ok` field,
// never the presence of an error value.
test('every kind of rejection is a failure, and the rest still run',
  async () => {
    const outcomes = {
      fine: async () => {},
      bare: () => Promise.reject(),
      thrownUndefined: async () => { throw undefined; },
      thrownNull: async () => { throw null; },
      ordinary: async () => { throw new Error('ordinary'); },
      after: async () => {},
    };
    const items = Object.keys(outcomes);
    const results = await runPool(items, 1, item => outcomes[item]());
    assert.deepEqual(results.map(r => [r.item, r.ok]), [['fine', true],
      ['bare', false], ['thrownUndefined', false], ['thrownNull', false],
      ['ordinary', false], ['after', true]]);
    assert.equal(results[4].error.message, 'ordinary');
    assert.equal('error' in results[0], false);
  });
test('jobs come from the environment, 1 is sequential', () => {
  assert.equal(regressionJobs({ [jobsVariable]: '1' }), 1);
  assert.equal(regressionJobs({ [jobsVariable]: '5' }), 5);
  assert.ok(regressionJobs({}) >= 1 && regressionJobs({}) <= 6);
  assert.throws(() => regressionJobs({ [jobsVariable]: '0' }));
  assert.throws(() => regressionJobs({ [jobsVariable]: 'x' }));
});
