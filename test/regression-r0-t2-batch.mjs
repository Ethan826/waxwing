// Probes for scripts/regression-r0-t2-batch.mjs (dossier §18.163). Each
// loads modules from the compiler under test only.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';
import { wrongWalkCases, wrongWidthCases } from './r0-t2-walk-cases.mjs';
import { scanWrong, wrongUnnumberedCases }
  from './r0-t2-unnumbered-cases.mjs';
import { wrongPathOrder } from './r0-path-order-cases.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = wrongOf => async context => {
  const wrong = await wrongOf(loader(context));
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2BatchProbes = {
  'r0-t2-walk-width': probe(wrongWidthCases),
  'r0-t2-walk-paths': probe(wrongWalkCases),
  'r0-t2-unnumbered': probe(wrongUnnumberedCases),
  'r0-t2-unnumbered-scan': probe(scanWrong),
  'r0-path-order': probe(async load => (await wrongPathOrder(load)).wrong)
};
