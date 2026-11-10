// Probes for scripts/regression-r0-t2-batch.mjs (dossier §18.163). Each
// loads modules from the compiler under test only.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';
import { wrongWalkCases, wrongWidthCases } from './r0-t2-walk-cases.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { exportsWrong, notOnlyFinish, scanWrong, staleSlots, strayUses,
  wrongUnnumberedCases } from './r0-t2-unnumbered-cases.mjs';
import { verdictsWrong, wrongShadowCases }
  from './r0-t2-shadow-gate-cases.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = wrongOf => async context => {
  const wrong = await wrongOf(loader(context));
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

// The caller scan over the compiled output of the row's own clone.
const cloneUses = context => {
  const output = resolve(dirname(context.compilerPath), '..');
  const compiled = Object.fromEntries(readdirSync(output)
    .filter(name => existsSync(`${output}/${name}/index.js`))
    .map(name => [name, readFileSync(`${output}/${name}/index.js`, 'utf8')]));
  return [...strayUses(compiled), ...staleSlots(compiled),
    ...notOnlyFinish(compiled)];
};

export const t2BatchProbes = {
  'r0-minting-boundary': async context => {
    const output = resolve(dirname(context.compilerPath), '..');
    const compiled = Object.fromEntries(readdirSync(output)
      .filter(name => existsSync(`${output}/${name}/index.js`))
      .map(name => [name,
        readFileSync(`${output}/${name}/index.js`, 'utf8')]));
    const { mintingWrong } = await import('./r0-minting-boundary-cases.mjs');
    const wrong = mintingWrong(compiled);
    if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
    passed(context);
  },
  'r0-t2-shadow-gate': probe(async () => [...wrongShadowCases(),
    ...verdictsWrong()]),
  'r0-t2-unnumbered-gate': async context => {
    const wrong = [...cloneUses(context),
      ...await exportsWrong(loader(context))];
    if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
    passed(context);
  },
  'r0-t2-walk-width': probe(wrongWidthCases),
  'r0-t2-walk-paths': probe(wrongWalkCases),
  'r0-t2-unnumbered': probe(wrongUnnumberedCases),
  'r0-t2-unnumbered-scan': probe(scanWrong)
};
