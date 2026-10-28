// R0 a-min tranche 1 regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-amin.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { markedProbes } from './regression-r0-amin-marked.mjs';
import { nodeProbes } from './regression-r0-amin-nodes.mjs';
import { openedProbes } from './regression-r0-amin-opened.mjs';
import { ownedProbes } from './regression-r0-amin-owned.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

export const r0AminProbes = {
  ...markedProbes,
  ...ownedProbes,
  ...nodeProbes,
  ...openedProbes,
  // Task 15: two NodeAt at one path are a DuplicateEffect, not an overwrite.
  'r0-amin-duplicate-effect': async context => {
    const load = loader(context);
    const Assemble = await load('Features.Check.Generate.Assemble');
    const Out = await load('Features.Check.Generate.Out');
    const Effect = await load('Domain.Recorded.Effect');
    const Origin = await load('Domain.Recorded.Origin');
    const Atom = await load('Domain.Recorded.Atom');
    const Set = await load('Data.Set');
    const path = Origin.Path({ root: Origin.InBody.value, steps: [] });
    const int = new Effect.MBase(Atom.IntBase.value);
    const effects = [new Out.NodeAt(path, int), new Out.NodeAt(path, int)];
    const holders = { declared: Set.empty, holding: Set.empty };
    const result = Assemble.assemble({ decl: 0, holders })(
      { ...Out.noOut, effects });
    if (result.constructor.name !== 'Left')
      fail('a duplicate NodeAt write went undetected');
    passed(context);
  }
};
