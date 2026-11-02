// Tranche 2 Task 8 regression probes (the effect-row read-back); the
// rows are in scripts/regression-r0-t2-rows.mjs. Each loads modules from
// the compiler under test only, through `context.compilerPath`, and
// fails naming every case of test/r0-t2-rows-cases.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rowsChecks } from './r0-t2-rows-cases.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = check => async context => {
  const wrong = (await rowsChecks(loader(context)))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2RowsProbes = {
  'r0-t2-rows-clash': probe('clashWrong'),
  'r0-t2-rows-applied-key': probe('appliedWrong'),
  'r0-t2-rows-fail-n': probe('failWrong'),
  'r0-t2-rows-apart': probe('apartWrong')
};
