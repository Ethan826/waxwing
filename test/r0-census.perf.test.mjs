import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { chain, curried, generic } from './fn-scale-programs.mjs';
import { scalePrograms } from './text-scale-programs.mjs';
import { shapeChain } from './r001-scale-programs.mjs';
import { forwardingChain, manyDefers, manyInstallations }
  from './fx008-scale-programs.mjs';

// The generation scale bounds of test/r0-census.serial.test.mjs (Task 3.5),
// run under `npm run perf`; the routine file keeps the census tests and the
// generation outcome assertions.
// Generation on the scale programs, against each one's serial suite's
// bound for its whole compile (or, for FX008's, its check): generation
// must fit inside the budget that phase already has. The bounds are
// those suites' constants (3 × a measured median), cited, not re-measured.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const text = name => scalePrograms.find(found => found.name === name).source;
const scale = [
  ['fn-scale: 1,000 partial applications', chain(1000).source, 3 * 75],
  ['fn-scale: a 1,000-long arrow type', curried(1000).source, 3 * 75],
  ['fn-scale: 5,000 parameters through generics', generic(5000).source,
    3 * 550],
  ['text-scale: a 1 MB literal', text('a 1 MB literal'), 3 * 141],
  ['text-scale: 10,000 interpolation parts',
    text('10,000 interpolation parts'), 3 * 521],
  ['text-scale: 100,000 escapes', text('a literal of 100,000 escapes'),
    3 * 142],
  ['r001-scale: 200 shapes, depth 20', shapeChain(200, 20).source, 3 * 243],
  ['fx008-scale: 8,000 defers', manyDefers(8000), 3 * 1001],
  ['fx008-scale: 1,000 installations', manyInstallations(1000), 3 * 486],
  ['fx008-scale: 1,000 forwarding installations', forwardingChain(1000),
    3 * 311]
];
const generateAll = program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.map(decl =>
    Generate.generate(tables)(signatures)(decl));
};

for (const [name, source, boundMs] of scale) {
  test(`generation within the bound: ${name}`, t => {
    const program = resolved(source);
    generateAll(resolved('fn main(): Int = 0;'));
    const started = performance.now();
    const results = generateAll(program);
    const elapsedMs = performance.now() - started;
    t.diagnostic(`${Math.round(elapsedMs)} ms, bound ${boundMs}`);
    assert.ok(results.every(result => result.constructor.name === 'Right'));
    assert.ok(elapsedMs <= boundMs, `took ${elapsedMs} ms`);
  });
}
