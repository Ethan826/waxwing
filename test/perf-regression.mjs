// Usage: node test/perf-regression.mjs <compiler index.js> <output dir>
// <probe>. The perf-side regression proofs (scripts/regression-perf.mjs),
// run by `npm run perf` through the regression runner, never by verify. A
// probe uses only the compiler it is given.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [compilerPath, outputDir, probe] = process.argv.slice(2);
const { compile } = await import(pathToFileURL(resolve(compilerPath)));
const load = name =>
  import(pathToFileURL(resolve(outputDir, name, 'index.js')));
const { Left } = await load('Data.Either');
const { wire } = await load('Format.Diagnostic');

// Duplicate-name checks must not rescan every type per type (A003 final
// review I3: 20,000 types took 25.7 s). Three 20,000-type compiles must
// finish within 5 s. This is an absolute budget, so it lives on the perf
// side; a growth check on it is a later candidate (docs/engineering.md).
const duplicateScanTiming = () => {
  const main = ' fn main(): Int = 0;';
  const manyTypes = Array.from({ length: 20000 }, (_, index) =>
    `type T${index} = C${index};`).join(' ');
  const sources = [
    `${manyTypes} type T7 = X;${main}`,
    `${manyTypes} type X = C7;${main}`,
    `fn C7(): Int = 0; ${manyTypes}${main}`
  ];
  const started = performance.now();
  sources.forEach(source => {
    const result = compile(source);
    assert.ok(result instanceof Left, 'duplicate source was accepted');
    assert.equal(wire(result.value0).code, 'E_DUPLICATE');
  });
  const seconds = (performance.now() - started) / 1000;
  assert.ok(seconds < 5, `large-source duplicate regression took ${seconds}s`);
  console.log(`large-source duplicate timing: ${seconds}s`);
};

const probes = { 'duplicate-scan-timing': duplicateScanTiming };
assert.ok(probe in probes, `unknown perf probe: ${probe}`);
probes[probe]();
