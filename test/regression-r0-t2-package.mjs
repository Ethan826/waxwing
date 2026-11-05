// Tranche 2 Task 11 regression probes (the package assembly); the rows
// are in scripts/regression-r0-t2-package.mjs. Each loads modules from
// the compiler under test only, through `context.compilerPath`, and
// fails naming every case of test/r0-t2-package-checks.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the cases read corpus and research
// sources a test-tree row's clone does not hold, and the registry loads
// this module there too (test/regression-r0-amin-effects-pin.mjs).
const checksOf = async context =>
  (await import('./r0-t2-package-checks.mjs')).packageChecks(loader(context));

const probe = check => async context => {
  const wrong = (await checksOf(context))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2PackageProbes = {
  'r0-t2-package-declined': probe('declinedWrong'),
  'r0-t2-package-mark-clash': probe('clashWrong'),
  'r0-t2-package-forced': probe('forcedWrong'),
  'r0-t2-package-sorts': probe('sortsWrong'),
  'r0-t2-package-distinct': probe('distinctWrong'),
  'r0-t2-package-extension': probe('extensionWrong'),
  'r0-t2-package-theta-effects': probe('thetaWrong'),
  'r0-t2-package-theta-images': probe('thetaWrong'),
  'r0-t2-package-theta-unread': probe('thetaFaultWrong'),
  'r0-t2-package-theta-tail': probe('thetaFaultWrong'),
  'r0-t2-package-unread-mark': probe('unmarkedWrong'),
  'r0-t2-package-declined-order': probe('declinedOrderWrong'),
  'r0-t2-package-record-tail': probe('recordTailWrong'),
  'r0-t2-package-arrow-result': probe('arrowResultWrong')
};
