import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { firingSources, inferredRow } from './r0-erased-criterion.mjs';
import { erasedSources, inferredRows } from './r0-census-erased.mjs';
import { censusFile, classifiedCorpus, corpusCensus, pinCommand,
  pinnedCensus } from './r0-census-run.mjs';
import { chain, curried, generic } from './fn-scale-programs.mjs';
import { scalePrograms } from './text-scale-programs.mjs';
import { shapeChain } from './r001-scale-programs.mjs';
import { forwardingChain, manyDefers, manyInstallations }
  from './fx008-scale-programs.mjs';

// Task 3.5: the census of what the switch would block (G-switch
// evidence), over the pinned corpus. It decides nothing and changes no
// acceptance: each count says which declarations that compile today a
// detector would hold Unresolved if R0's verdict were live. The counts
// are pinned in test/fixtures/r0/census.json, so drift fails; their
// reading is docs/plans/r0-census.md. Corpus-wide and timed, so serial.
const classified = await classifiedCorpus();

test('the census equals its pinned counts', async () => {
  assert.deepEqual(await corpusCensus(classified), pinnedCensus(),
    `${censusFile} is stale; re-pin with \`${pinCommand}\` and review`);
});

test('second spreads and LocalGeneralization block nothing that compiles',
  () => {
    const census = pinnedCensus();
    for (const name of ['SecondSpread', 'LocalGeneralization'])
      assert.equal(census.categories[name].declarations, 0, name);
    assert.ok(census.secondSpreadAtResolve > 0);
  });

// The erased-row detector agrees with Task 0.7's reference reading on
// every declaration of every resolving corpus program, compiling or not.
test('the erased-row detector agrees with the reference reading', () => {
  const disagreements = [];
  let read = 0;
  for (const { origin, program } of classified) {
    if (program === null) continue;
    for (const decl of program.functions) {
      read += 1;
      const same = JSON.stringify(erasedSources(program, decl))
        === JSON.stringify(firingSources(program, decl))
        && inferredRows(program, decl) === inferredRow(program, decl);
      if (!same) disagreements.push(`${origin} ${decl.name}`);
    }
  }
  assert.ok(read > 2500, `${read} declarations`);
  assert.deepEqual(disagreements.slice(0, 10), []);
});

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
