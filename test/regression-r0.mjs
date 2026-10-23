// R0 shadow tranche regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stubsFrom } from './r0-stubs.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};

export const r0Probes = {
  // Task 1.2 (G-hide): each broken declaration is reported, in order.
  'r0-first-left-hides': async context => {
    const { compileReport } =
      await import(pathToFileURL(resolve(context.compilerPath)));
    const result = compileReport(
      'fn f(): Int = true; fn g(): Bool = 1; fn main(): Int = 0;');
    if (!(result instanceof context.Left)) fail('the program compiled');
    const found = result.value0.map(diagnostic => {
      const wired = context.wire(diagnostic);
      return `${wired.code} ${wired.message}`;
    });
    const wanted = ['E_TYPE Expected Int, found Bool',
      'E_TYPE Expected Bool, found Int'];
    if (JSON.stringify(found) !== JSON.stringify(wanted))
      fail(`second broken declaration hidden: ${found.join('; ')}`);
    console.log(`${context.probe} regression detects the defect`);
  },
  // Task 2.1 (AT16): `Exhausted`, injected directly, is a fault (Task
  // 0.2), never a mismatch.
  'r0-classify-catchall': async context => {
    const load = name => import(pathToFileURL(resolve(
      dirname(context.compilerPath), '..', name, 'index.js')));
    const { classify } = await load('Features.Check.Classify');
    const { Exhausted } = await load('Features.Check.UnifyFailure');
    const found = classify(new Exhausted('bound'));
    const name = found.constructor.name;
    if (name !== 'AsFault'
      || found.value0.constructor.name !== 'BrokenInvariant')
      fail(`Exhausted classed as ${name}, not a fault`);
    console.log(`${context.probe} regression detects the defect`);
  },
  // Task 5.1 (AT6): a `D` atom is never a premise (F1), even for a rule
  // that fires on any body. The problem's `D` holds `lacks r a`.
  'r0-d-premise': async context => {
    const load = name => import(pathToFileURL(resolve(
      dirname(context.compilerPath), '..', name, 'index.js')));
    const { theoremRef, soundRule } = await stubsFrom(load);
    const { Just } = await load('Data.Maybe');
    const { parse } = await load('Format.Parse');
    const { resolve: resolveProgram } = await load('Features.Resolve');
    const { generationInputs } = await load('Features.Check.Generate.Inputs');
    const { generate } = await load('Features.Check.Generate');
    const { fields } = await load('Domain.Recorded');
    const { checkDerivation } = await load('Features.Check.Refute.Rules');
    const program = resolveProgram(parse('fn f(p: { ...r }): Int'
      + ' where r lacks { a } = 1; fn main(): Int = 0;').value0).value0;
    const { tables, signatures } = generationInputs(program);
    const problem = generate(tables)(signatures)(program.functions[0]).value0;
    const premise = fields(problem).d[0].origin.atom;
    const derivation = { rule: 'any', premises: [premise], blame: [] };
    const any = soundRule('any', theoremRef('Test.any'),
      () => new Just(derivation));
    const found = checkDerivation([any])(problem)(derivation);
    if (!(found instanceof context.Left)
      || found.value0.constructor.name !== 'DAtomPremise')
      fail(`D atom accepted as a premise: ${found.constructor.name}`);
    console.log(`${context.probe} regression detects the defect`);
  }
};
