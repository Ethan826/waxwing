// Tranche 2 Task 11 regression probes (the package assembly); the rows
// are in scripts/regression-r0-t2-package.mjs. Each loads modules from
// the compiler under test only, through `context.compilerPath`, and
// fails naming every case of test/r0-t2-package-checks.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageChecks } from './r0-t2-package-checks.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = check => async context => {
  const wrong = (await packageChecks(loader(context)))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2PackageProbes = {
  'r0-t2-package-declined': probe('declinedWrong'),
  'r0-t2-package-mark-clash': probe('clashWrong'),
  'r0-t2-package-forced': probe('forcedWrong'),
  'r0-t2-package-sorts': probe('sortsWrong'),
  'r0-t2-package-shared': probe('sharedWrong'),
  'r0-t2-package-distinct': probe('distinctWrong'),
  'r0-t2-package-extension': probe('extensionWrong'),
  'r0-t2-package-theta-effects': probe('thetaWrong'),
  'r0-t2-package-theta-images': probe('thetaWrong'),
  'r0-t2-package-theta-unread': probe('thetaFaultWrong'),
  'r0-t2-package-theta-tail': probe('thetaFaultWrong'),
  'r0-t2-package-unread-mark': probe('unmarkedWrong')
};
