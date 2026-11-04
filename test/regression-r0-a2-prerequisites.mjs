// The activation prerequisites' regression probes for R034 (2) and (10)
// (docs/plans/2026-11-04-activation-prerequisites-proposal.md; dossier
// §18.161), spread into r0A2Probes (test/regression-r0-a2.mjs); the rows
// are in scripts/regression-r0-a2-prerequisites.mjs and the fixtures in
// test/r0-a2-prerequisites-cases.mjs, loaded from the clone's build.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fail, passed } from './regression-r0-amin-support.mjs';
import { mergeCases } from './r0-a2-prerequisites-cases.mjs';

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// One `EffectsUnchecked` with the union of the kinds, from blocks and
// declines (`withDeclines`) or from declines alone (`unlimited`).
const mergeProbe = (what, blocksOf, declinesOf) => async context => {
  const cases = await mergeCases(loader(context));
  const [k1, k2] = cases.kinds;
  const found = cases.entries(blocksOf(cases, k1, k2),
    declinesOf(cases, k1, k2));
  if (cases.count(found) !== 1)
    fail(`${what}: ${cases.count(found)} EffectsUnchecked entries`);
  passed(context);
};

export const a2PrerequisiteProbes = {
  'r0-a2-r034-2-unmerged': mergeProbe('blocks and declines unmerged',
    (cases, k1, k2) => [cases.unchecked([k1, k2])],
    (cases, k1) => [cases.unchecked([k1])]),
  'r0-a2-r034-2-unlimited-unmerged': mergeProbe('declines unmerged',
    () => [],
    (cases, k1, k2) => [cases.unchecked([k1]), cases.unchecked([k2])])
};
