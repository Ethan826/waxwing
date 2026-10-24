import { availableParallelism } from 'node:os';
// A bounded pool for the regression rows. Concurrency is capped at six and
// leaves two cores free, so the machine stays usable; each row is an
// independent clone, so rows share no writable state.
export const defaultJobCap = 6;
export const reservedCores = 2;
export const jobsVariable = 'WAXWING_REGRESSION_JOBS';
export const defaultJobs = () => Math.max(1,
  Math.min(defaultJobCap, availableParallelism() - reservedCores));
// WAXWING_REGRESSION_JOBS=1 restores sequential proving.
export const regressionJobs = (env = process.env) => {
  const given = env[jobsVariable];
  if (given === undefined || given === '') return defaultJobs();
  const jobs = Number(given);
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new Error(`${jobsVariable} must be a positive integer: ${given}`);
  }
  return jobs;
};
// Runs `task(item)` for every item with at most `jobs` in flight. Never
// stops early: resolves, in item order, with { item, ok: true } for a task
// that resolved and { item, ok: false, error } for one that rejected. The
// flag, not the error, marks failure: a rejection's reason may be
// undefined (`Promise.reject()`, `throw undefined`).
export const runPool = async (items, jobs, task) => {
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new Error(`jobs must be a positive integer: ${jobs}`);
  }
  const results = new Array(items.length);
  let next = 0;
  const attempt = async item => {
    try {
      await task(item);
      return { item, ok: true };
    } catch (error) {
      return { item, ok: false, error };
    }
  };
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await attempt(items[index]);
    }
  };
  const workers = Array.from({ length: Math.min(jobs, items.length) },
    worker);
  await Promise.all(workers);
  return results;
};
