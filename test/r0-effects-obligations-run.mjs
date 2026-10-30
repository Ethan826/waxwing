import { load, resolved } from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';

// Recorded obligations per declaration, for the effects boundary test
// (Task 12) and the coverage test (Task 13). Generation only: no
// decision is run, so this is cheap beside the boundary survey, which
// supplies each declaration's verdict under the same `at` key.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const named = value => value.constructor.name;

// The recorded effect fields of one declaration, or null when
// generation refuses it (the boundary survey reports those).
export const effectsOf = (program, decl) => {
  const { tables, signatures } = Inputs.generationInputs(program);
  const generated = Generate.generate(tables)(signatures)(decl);
  return named(generated) === 'Right'
    ? Recorded.fields(Elaborating.problem(generated.value0)).effects
    : null;
};

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

// A map from the survey's `at` key to the constructor names of the
// declaration's recorded obligations, in order.
export const obligationKinds = async () => {
  const kinds = new Map();
  for (const { origin, source } of await rt8Sources()) {
    const program = programOf(source);
    if (program === null) continue;
    for (const decl of program.functions) {
      const effects = effectsOf(program, decl);
      if (effects !== null) kinds.set(`${origin}#${decl.name}`,
        effects.obligations.map(item => named(item.value)));
    }
  }
  return kinds;
};
