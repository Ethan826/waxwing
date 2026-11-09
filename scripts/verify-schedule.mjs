import { hostFacts, unavailable } from './verify-conditions.mjs';
import { regressionJobs } from './regression-pool.mjs';

// How many test files verify's parallel phase runs at once, and the
// schedule and memory line printed before each phase. Scheduling only:
// the setting never changes which files run or what they assert. Unset
// keeps Node's default, one less than the available cores.
export const concurrencyVariable = 'WAXWING_VERIFY_TEST_CONCURRENCY';

const positiveInteger = /^[1-9][0-9]*$/;

export const testConcurrency = (env = process.env) => {
  const given = env[concurrencyVariable];
  if (given === undefined || given === '') return undefined;
  if (!positiveInteger.test(given))
    throw new Error(
      `${concurrencyVariable} must be a positive integer: ${given}`);
  return Number(given);
};

export const parallelTestArgs = (files, concurrency) => [
  '--test',
  ...(concurrency === undefined
    ? [] : [`--test-concurrency=${concurrency}`]),
  ...files
];

const freePercentage = /System-wide memory free percentage: (\d+)%/;

export const memoryFreeOf = host => {
  if (host.platform !== 'darwin')
    return unavailable(`no memory reader for ${host.platform}`);
  const result = host.run('memory_pressure', ['-Q']);
  if (result.error !== undefined) return unavailable(result.error);
  const found = freePercentage.exec(result.stdout ?? '');
  return result.status === 0 && found !== null
    ? `${found[1]}%`
    : unavailable('memory_pressure output not recognized');
};

export const scheduleLine = (label, env = process.env, host = hostFacts) =>
  `schedule [${label}] test-files ${testConcurrency(env) ?? 'node-default'}`
  + ` regression-jobs ${regressionJobs(env)}`
  + ` memory-free ${memoryFreeOf(host)}`;
