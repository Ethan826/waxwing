// Activation prerequisites regression probes (R036 (1)-(3)); the rows
// are in scripts/regression-r0-t2-prerequisites.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`, and
// fails naming every case of its checks that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// Imported when a probe runs: the cases read research sources a
// test-tree row's clone does not hold.
const rowsOf = async context =>
  (await import('./r0-t2-rows-checks.mjs')).rowsChecks(loader(context));
const imagesOf = async context => (await import('./r0-t2-images-cases.mjs'))
  .imagesChecks(loader(context));

const probe = (of, check) => async context => {
  const wrong = await (await of(context))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2PrerequisitesProbes = {
  'r0-t2-r036-3-row-coarse': probe(rowsOf, 'unconvertedWrong'),
  'r0-t2-r036-3-image-coarse': probe(imagesOf, 'unconvertedWrong')
};
