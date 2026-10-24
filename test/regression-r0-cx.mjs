// Task 5.2's regression probes (the CX check), imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-cx.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fail = message => {
  console.error(message);
  process.exit(1);
};

export const r0CxProbes = {
  // `D` holds `r lacks a`; the body `Bool = Int` is refuted under every
  // `ρ`, but `r ↦ { a: Int }` violates `D`, so no certificate exists.
  'r0-cx-hypothesis-skipped': async context => {
    const load = name => import(pathToFileURL(resolve(
      dirname(context.compilerPath), '..', name, 'index.js')));
    const { parse } = await load('Format.Parse');
    const { resolve: resolveProgram } = await load('Features.Resolve');
    const { generationInputs } = await load('Features.Check.Generate.Inputs');
    const { generate } = await load('Features.Check.Generate');
    const { toSig } = await load('Features.Check.Refute.Project');
    const { checkCX } = await load('Features.Check.Refute.Counter.Check');
    const Counter = await load('Domain.Verdict.Counter');
    const { IntBase } = await load('Domain.Recorded.Atom');
    const { Tuple } = await load('Data.Tuple');
    const program = resolveProgram(parse('fn f(p: { ...r }): Int'
      + ' where r lacks { a } = true; fn main(): Int = 0;').value0).value0;
    const { tables, signatures } = generationInputs(program);
    const { problem: problemOf } = await load('Domain.Elaborating');
    const problem = problemOf(
      generate(tables)(signatures)(program.functions[0]).value0);
    const sig = toSig(problem).value0;
    const field = new Tuple('a', new Counter.GroundBase(IntBase.value));
    const cx = { rho: { ty: [], row: [new Tuple(sig.rigidRow[0], [field])] },
      body: sig.b.map(entry => entry.id) };
    const found = checkCX(problem)(cx);
    if (!(found instanceof context.Left)
      || found.value0.constructor.name !== 'HypothesisFails')
      fail('a counter-instance violating D was accepted: '
        + `${found.constructor.name}`);
    console.log(`${context.probe} regression detects the defect`);
  }
};
