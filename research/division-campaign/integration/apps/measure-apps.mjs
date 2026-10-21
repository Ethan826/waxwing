// Stream 9: the application-shaped programs of this directory and the
// scaling families of scale.mjs, measured with stream 7b's instrumented
// compiler (../measure/instrument.mjs) and sizes (../measure/metrics.mjs),
// plus the slicing variants of ../measure/variants.mjs. Read-only.
//
//   node research/division-campaign/integration/apps/measure-apps.mjs \
//     <scratch-dir> [--json <file>]
//
// The scratch directory receives a copy of output/; delete it after.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import assert from 'node:assert/strict';
import { instrument } from '../measure/instrument.mjs';
import { measureFunction } from '../measure/metrics.mjs';
import { read } from '../measure/expect.mjs';
import { measureVariants } from '../measure/variants.mjs';
import { expectations } from './expect.mjs';
import { families } from './scale.mjs';
import { programTables, scaleTables } from './tables.mjs';

const [scratch, flag, jsonFile] = process.argv.slice(2);
if (!scratch) throw new Error('usage: measure-apps.mjs <scratch-dir>');
const root = resolvePath('.');
const here = new URL('.', import.meta.url).pathname;
const { resolved, record, keysOf, load } = await instrument(root, scratch);
const { check } = await load('Features.Check');
const { specialize } = await load('Features.Specialize');
const { wire } = await load('Format.Diagnostic');
const { resolve: resolveTy } = await load('Features.Check.Subst');
const { TVar } = await load('Domain.Type.Core');

// The whole program through Check and Specialize (no Go), as resolved:
// with two-spread literals joined when Resolve refused them.
const verdictOf = program => {
  const checked = check(program);
  const failed = result => {
    const shown = wire(result.value0);
    return `${shown.code} ${shown.message.slice(0, 50)}`;
  };
  if (checked.constructor.name !== 'Right') return `check: ${failed(checked)}`;
  const lowered = specialize(checked.value0);
  if (lowered.constructor.name !== 'Right') {
    return `specialize: ${failed(lowered)}`;
  }
  return 'accepted';
};

const measureSource = (origin, source) => {
  const found = resolved(source);
  if (!found.program) return { origin, stage: found.stage, functions: [] };
  const functions = found.program.functions
    .filter(definition => definition.name !== 'wxJoin')
    .map(definition => {
      const { verdict, atoms, solved } = record(found.program, definition);
      const sizes = measureFunction(definition, atoms, keysOf);
      const sliced = measureVariants(atoms, keysOf,
        { solved, resolve: resolveTy, TVar });
      // variants.mjs's 7b slicing must agree with metrics.mjs's.
      assert.deepEqual(
        [sliced['7b'].patterns, sliced['7b'].consistent],
        [sizes.log2.slicedPatterns ?? 0, sizes.log2.slicedConsistent ?? 0],
        `${origin} ${definition.name}: 7b slicing disagrees`);
      return { name: definition.name, verdict, ...sizes, sliced };
    });
  return { origin, joins: found.joins, program: verdictOf(found.program),
    functions };
};

// The hand-computed points first: a wrong measurement stops here.
for (const expected of expectations) {
  const family = families.find(entry => entry.name === expected.family);
  const row = measureSource('expect', family.source(expected.size))
    .functions.find(found => found.name === family.target);
  const got = Object.fromEntries(
    Object.keys(expected.sizes).map(key => [key, read(row, key)]));
  assert.deepEqual(got, expected.sizes, `${expected.family}: ${expected.why}`);
}
console.log(`Expectations: ${expectations.length} hold.\n`);

const programs = readdirSync(here).filter(name => name.endsWith('.wxw'))
  .sort().map(name =>
    measureSource(name, readFileSync(join(here, name), 'utf8')));

const scaling = families.map(family => ({
  name: family.name,
  target: family.label ?? family.target,
  points: family.sizes.map(size => {
    const target = typeof family.target === 'function'
      ? family.target(size) : family.target;
    const measured = measureSource(`${family.name}@${size}`,
      family.source(size));
    return { size, joins: measured.joins, program: measured.program,
      row: measured.functions.find(row => row.name === target) };
  })
}));

console.log(programTables(programs));
console.log(scaleTables(scaling));
if (flag === '--json' && jsonFile) {
  writeFileSync(jsonFile, JSON.stringify({ programs, scaling }, null, 1));
}
