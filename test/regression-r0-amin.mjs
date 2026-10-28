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
import { signatureProbes } from './regression-r0-amin-signature.mjs';
import { toolkit } from './regression-r0-amin-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// The cohort's shape (editors/vscode/fixtures/effect-namespaces.wxw
// `failing`): `fail` alone, with a written, translating family.
const failOnly = 'type Error = Missing; '
  + 'fn failing(id: Int): Int with Fail(Error) { fail } = fail(Missing); '
  + 'fn main(): Unit = ();';

export const r0AminProbes = {
  ...markedProbes,
  ...ownedProbes,
  ...nodeProbes,
  ...openedProbes,
  ...signatureProbes,
  // Task 20 (I2, dossier 18.102): a `fail`-only declaration keeps the
  // marking that lets the pinned cohort stay Solved: E23 emits no
  // Outside for a written family that translates. Checked on a program
  // in the cohort's shape, not the corpus cohort (test/fixtures/r0/
  // effects-fail-only.json; 75 s).
  'r0-amin-fail-only-unmarked': async context => {
    const { fieldsOf } = await toolkit(context);
    const kinds = fieldsOf(failOnly, 'failing').outside
      .map(entry => entry.value.constructor.name);
    if (kinds.length > 0)
      fail(`a fail-only declaration gained Outside: ${kinds.join(', ')}`);
    passed(context);
  },
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
