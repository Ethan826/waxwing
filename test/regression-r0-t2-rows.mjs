// Tranche 2 Task 8 regression probes (the effect-row read-back); the
// rows are in scripts/regression-r0-t2-rows.mjs. Each loads modules from
// the compiler under test only, through `context.compilerPath`, and
// fails naming every case of test/r0-t2-rows-checks.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the cases read corpus and research
// sources a test-tree row's clone does not hold, and the registry loads
// this module there too (test/regression-r0-amin-effects-pin.mjs).
const checksOf = async context =>
  (await import('./r0-t2-rows-checks.mjs')).rowsChecks(loader(context));

const probe = check => async context => {
  const wrong = await (await checksOf(context))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2RowsProbes = {
  'r0-t2-rows-clash': probe('clashWrong'),
  'r0-t2-rows-applied-key': probe('appliedWrong'),
  'r0-t2-rows-fail-n': probe('failWrong'),
  'r0-t2-rows-apart': probe('apartWrong'),
  'r0-t2-rows-entry-root': probe('entryWrong'),
  'r0-t2-rows-entry-finish': probe('entryWrong'),
  'r0-t2-rows-unread': probe('unreadWrong'),
  'r0-t2-rows-piped-key': probe('pipedWrong'),
  'r0-t2-rows-console-n': probe('consoleWrong'),
  'r0-t2-rows-fail-payload': probe('payloadWrong'),
  'r0-t2-rows-unmarked': probe('unmarkedWrong')
};
