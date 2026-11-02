// Tranche 2 Task 9 regression probes (mark terms); the rows are in
// scripts/regression-r0-t2-marks.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and fails
// naming every case of test/r0-t2-marks-checks.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { marksChecks } from './r0-t2-marks-checks.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = check => async context => {
  const wrong = await (await marksChecks(loader(context)))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2MarksProbes = {
  'r0-t2-marks-equalities': probe('sharedWrong'),
  'r0-t2-marks-absent-n': probe('absentWrong'),
  'r0-t2-marks-rigid': probe('rigidWrong'),
  'r0-t2-marks-apart': probe('apartWrong'),
  'r0-t2-marks-unmarked': probe('unmarkedWrong'),
  'r0-t2-marks-console-n': probe('consoleWrong')
};
