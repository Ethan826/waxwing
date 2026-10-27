// Shared by the a-min tranche 1 regression probes
// (test/regression-r0-amin*.mjs). Loads modules from the compiler under
// test only, through `context.compilerPath`, never the healthy build.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const fail = message => {
  console.error(message);
  process.exit(1);
};
export const passed = context =>
  console.log(`${context.probe} regression detects the defect`);

// A value as plain data: a constructor as `{ Name: [fields] }`.
export const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(name =>
      [name, shape(value[name])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(name => shape(value[name])) };
};

const rightOf = (result, phase) => {
  if (result.constructor.name !== 'Right')
    fail(`${phase} refused: ${JSON.stringify(shape(result.value0))}`);
  return result.value0;
};

// The compiler under test's loader, generation, and a Data.Map reader.
export const toolkit = async context => {
  const load = name => import(pathToFileURL(
    resolve(dirname(context.compilerPath), '..', name, 'index.js')));
  const Parse = await load('Format.Parse');
  const Resolve = await load('Features.Resolve');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Recorded = await load('Domain.Recorded');
  const Elaborating = await load('Domain.Elaborating');
  const Maps = await load('Data.Map.Internal');
  const Unfoldable = await load('Data.Unfoldable');
  const program = source =>
    rightOf(Resolve.resolve(rightOf(Parse.parse(source), 'parse')),
      'resolve');
  // Data.Map entries as [shaped key, shaped value].
  const entries = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
    .map(pair => [shape(pair.value0), shape(pair.value1)]);
  // The named declaration's recorded fields (not shaped).
  const fieldsOf = (source, name) => {
    const resolved = program(source);
    const { tables, signatures } = Inputs.generationInputs(resolved);
    const decl = resolved.functions.find(item => item.name === name);
    const generated = rightOf(Generate.generate(tables)(signatures)(decl),
      'generation');
    return Recorded.fields(Elaborating.problem(generated));
  };
  const tablesOf = source => Inputs.generationInputs(program(source)).tables;
  return { load, entries, fieldsOf, tablesOf };
};
