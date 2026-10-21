// Stream 7b: what a verified signature checker would face on the
// repository's Waxwing corpus. Read-only: it copies the built compiler
// (output/) to a scratch directory, wraps six constraint-making
// functions (in five modules) of the copy with a logger, and runs each
// function's check (Features.Check.Function `recheck`) once with the
// logger on. No compiler source is changed.
//
//   node research/division-campaign/integration/measure/measure.mjs \
//     <scratch-dir> [--json <file>]
//
// SEEDS (default 200): programs taken from each record generator.
//
// The scratch directory receives output/ (about 80 MB); delete it after.
import { writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import assert from 'node:assert/strict';
import { corpus } from './corpus.mjs';
import { expectations, read } from './expect.mjs';
import { instrument } from './instrument.mjs';
import { measureFunction } from './metrics.mjs';
import { report } from './report.mjs';

const [scratch, flag, jsonFile] = process.argv.slice(2);
if (!scratch) throw new Error('usage: measure.mjs <scratch-dir>');
const root = resolvePath('.');
const { resolved, record, keysOf } = await instrument(root, scratch);

// A snippet without `main` is retried with one appended.
const withMain = source => {
  const first = resolved(source);
  if (first.program || /\bfn\s+main\b/.test(source)) return first;
  const second = resolved(`${source}\nfn main(): Int = 0;\n`);
  return second.program ? second : first;
};

// Every function of one source, measured; null when it does not
// resolve (the stage that refused it is kept in `refused`).
const measureSource = (entry, refused) => {
  const found = withMain(entry.source);
  if (!found.program) {
    refused.push({ origin: entry.origin, stage: found.stage });
    return [];
  }
  return found.program.functions
    .filter(definition => definition.name !== 'wxJoin')
    .map(definition => {
      const { verdict, atoms } = record(found.program, definition);
      return {
        origin: entry.origin,
        name: definition.name,
        verdict,
        joined: found.joins > 0,
        ...measureFunction(definition, atoms, keysOf)
      };
    });
};

// The hand-computed expectations first: a wrong recorder stops here.
for (const expected of expectations) {
  const row = measureSource({ origin: 'expect', source: expected.source }, [])
    .find(found => found.name === expected.name);
  const got = Object.fromEntries(
    Object.keys(expected.sizes).map(key => [key, read(row, key)]));
  assert.deepEqual(got, expected.sizes, `${expected.name}: ${expected.why}`);
}
console.log(`Expectations: ${expectations.length} hold.`);

const refused = [];
const seeds = Number(process.env.SEEDS ?? 200);
const results = (await corpus(root, seeds))
  .flatMap(entry => measureSource(entry, refused));
const sources = new Set(results.map(row => row.origin));
console.log(report(results, refused, sources.size));
if (flag === '--json' && jsonFile) {
  writeFileSync(jsonFile, JSON.stringify({ results, refused }, null, 1));
}
