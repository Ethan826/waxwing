// Tranche 2 Task 15 regression probes (the differential, marks only);
// the rows are in scripts/regression-r0-t2-diff.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`, and
// runs the differential (test/r0-t2-diff-run.mjs) over A2 Task 11's case
// packages (`validateList`), fixture-level: cheap, unlike the serial
// corpus test.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';
import { validateList } from './regression-r0-a2-mb.mjs';
import { diffRunner } from './r0-t2-diff-run.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// The fixture differential: every case package and its mark forgeries.
export const fixtureRun = async load => {
  const runner = await diffRunner(load);
  for (const [where, problem, pkg] of validateList(runner.cases))
    runner.add({ where, problem, pkg });
  return runner.total();
};

// Non-vacuity: forgeries ran, and each changed exactly one term.
export const vacuityWrong = out => [
  ...out.forgeries.position === 0 ? ['no position forgery'] : [],
  ...out.forgeries.binding === 0 ? ['no binding forgery'] : [],
  ...out.agreements.markRefused === 0 ? ['no mark refusal'] : [],
  ...out.vacuous];

const nonVacuous = async context => {
  const wrong = vacuityWrong(await fixtureRun(loader(context)));
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

const agreeing = async context => {
  const out = await fixtureRun(loader(context));
  if (out.disagreements.length > 0)
    fail(`${context.probe}: ${JSON.stringify(out.disagreements)}`);
  passed(context);
};

export const t2DiffProbes = {
  'r0-t2-diff-nonvacuous': nonVacuous,
  'r0-t2-diff-marks-only': nonVacuous,
  'r0-t2-diff-detects': agreeing
};
