// Probes for the forged-package rows in scripts/regression-r0-t2-batch.mjs
// (dossier §18.172). Each loads the compiler under test only and fails with
// what the restored defect changes in its own forged-witness case.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';
import { forgedFrom, id2Source, unusedShow }
  from './r0-forged-witness-support.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = wrongOf => async context => {
  const kit = await forgedFrom(loader(context));
  const wrong = wrongOf(kit);
  if (wrong !== null) fail(`${context.probe}: ${wrong}`);
  passed(context);
};

const refused = (kit, source, name, forge) => {
  const found = kit.outcomeOf(source, name, forge);
  return found.verdict === 'Solved' ? 'Solved' : null;
};

export const forgedProbes = {
  'r0-forged-bool': probe(kit => refused(kit, id2Source, 'id2', kit.toBool)),
  'r0-forged-function': probe(kit =>
    refused(kit, unusedShow, 'f', kit.toFunction)),
  'r0-forged-valid': probe(kit => {
    const found = kit.outcomeOf(unusedShow, 'f', kit.toBool);
    const binding = [...kit.bindings(found.compilation)][0];
    return kit.named(binding) === 'Inline' ? null
      : `witness ${kit.named(binding)}`;
  }),
  'r0-forged-hole': probe(kit => {
    const found = kit.outcomeOf(id2Source, 'id2', kit.toHole);
    return kit.named(found.compilation) === 'NoWitness' ? null
      : `compilation ${kit.named(found.compilation)}`;
  })
};

export const realUnreadProbes = {
  'r0-effects-unread-real': async context => {
    const { wrongUnreadCases } = await import(
      './r0-t2-effects-unread-cases.mjs');
    const wrong = wrongUnreadCases();
    if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
    passed(context);
  }
};
