// Scope A's restored-defect probes (dossier §18.198-§18.200); the rows
// are in scripts/regression-r0-scope-a.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and fails
// naming the cases of test/r0-scope-a-checks.mjs that differ.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = check => async context => {
  const checks = await (await import('./r0-scope-a-checks.mjs'))
    .scopeAChecks(loader(context));
  const wrong = await checks[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(
    wrong.slice(0, 3))}`);
  passed(context);
};

export const scopeAProbes = {
  'r0-scope-a-canonical': probe('canonicalWrong'),
  'r0-scope-a-tables': probe('tablesWrong'),
  'r0-scope-a-boundary': probe('boundaryWrong'),
  'r0-scope-a-definedness': probe('definednessWrong'),
  'r0-scope-a-ground-kind': probe('groundKindWrong')
};
