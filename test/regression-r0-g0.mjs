// Task 4.2's regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { d02From, g0From } from './r0-g0-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const loaded = async context => {
  const load = name => import(pathToFileURL(resolve(
    dirname(context.compilerPath), '..', name, 'index.js')));
  const stubs = await stubsFrom(load);
  return { stubs, g0: await g0From(load, stubs) };
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);

export const r0G0Probes = {
  // Definedness: d02's lambda annotation is refused under the problem's
  // own candidate, since `D` does not entail `r lacks a` (Task 6.5).
  'r0-definedness-dropped': async context => {
    const { stubs, g0 } = await loaded(context);
    const { problem } = d02From(stubs);
    const found = g0.check(problem,
      g0.candidateOf(problem));
    if (found.constructor.name !== 'Left'
      || found.value0.constructor.name !== 'Undefined')
      fail(`d02's annotation accepted: ${found.constructor.name}`);
    passed(context);
  },
  // §3.2(b): `pr a` at a rigid `a`, with G0 and an accepting stub.
  'r0-g0-limit-global': async context => {
    const { stubs, g0 } = await loaded(context);
    const source = 'fn p(item: a): Text = show(item);\nfn main(): Int = 0;\n';
    const found = describe(stubs.decide(stubs.checking({
      open: g0.open,
      strategies: [g0.g0(), stubs.behaviours.accepting()] }),
    stubs.recorded.problem(source, 'p')));
    if (found.verdict !== 'Solved')
      fail(`G0's limit blocked every strategy: ${found.verdict}`);
    passed(context);
  }
};
