// Tranche 2 Task 10 regression probes (type images); the rows are in
// scripts/regression-r0-t2-images.mjs. Each loads modules from the
// compiler under test only, through `context.compilerPath`, and fails
// naming every case of test/r0-t2-images-cases.mjs that differs.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { imagesChecks } from './r0-t2-images-cases.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = check => async context => {
  const wrong = (await imagesChecks(loader(context)))[check]();
  if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
  passed(context);
};

export const t2ImagesProbes = {
  'r0-t2-images-auxiliary': probe('auxiliaryWrong'),
  'r0-t2-images-guard': probe('guardWrong'),
  'r0-t2-images-field-order': probe('orderWrong'),
  'r0-t2-images-live': probe('liveWrong')
};
