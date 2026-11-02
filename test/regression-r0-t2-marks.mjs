// Tranche 2 Task 9 regression probes (mark terms); the rows are in
// scripts/regression-r0-t2-marks.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and fails
// naming every case of test/r0-t2-marks-checks.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the cases read corpus and research
// sources a test-tree row's clone does not hold, and the registry loads
// this module there too (test/regression-r0-amin-effects-pin.mjs).
const checksOf = async context =>
  (await import('./r0-t2-marks-checks.mjs')).marksChecks(loader(context));

const probe = check => async context => {
  const wrong = await (await checksOf(context))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2MarksProbes = {
  'r0-t2-marks-equalities': probe('sharedWrong'),
  'r0-t2-marks-absent-n': probe('absentWrong'),
  'r0-t2-marks-rigid': probe('rigidWrong'),
  'r0-t2-marks-apart': probe('apartWrong'),
  'r0-t2-marks-unmarked': probe('unmarkedWrong'),
  'r0-t2-marks-console-n': probe('consoleWrong'),
  'r0-t2-marks-direction': probe('directionWrong'),
  'r0-t2-marks-constant': probe('constantWrong'),
  'r0-t2-marks-precedence': probe('precedenceWrong'),
  'r0-t2-marks-clash': probe('clashWrong'),
  'r0-t2-marks-take-first': probe('takeFirstWrong')
};
