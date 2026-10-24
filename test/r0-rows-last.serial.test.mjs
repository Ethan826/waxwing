import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from './fx-gen-rng.mjs';
import { loadCorpus } from './r0-corpus.mjs';
import { resolved } from './r0-generate-support.mjs';

// R0 Task 7.1b review, Minor 5 (Q5): an instantiation's slot index is
// its variable's `VarId` only while effect-row variables (`RowSort`,
// which get no slot: Generate/Fresh.purs `sortVar`) are numbered last.
// Resolve orders them so (Resolve/Signature.purs sorts by sort, then
// the implicit row; Resolve/Types.purs puts row parameters last). This
// checks it: in every function's and declared type's `sorts`, nothing
// but `RowSort` follows a `RowSort`. Over seeded programs whose
// parameters are written in shuffled order, then over every resolving
// program of the pinned corpus (corpus-wide, hence serial).
const seeds = 300;
const name = value => value.constructor.name;

const rowsLast = sorts => sorts.map(name)
  .every((sort, at, all) => at === 0 || all[at - 1] !== 'RowSort'
    || sort === 'RowSort');

const offending = program => [
  ...program.functions.map(found => [found.name, found.sorts]),
  ...program.types.map(found => [found.name, found.sorts])
].filter(([, sorts]) => !rowsLast(sorts)).map(([found]) => found);

// Type and function parameters of each sort, each with its use.
const typeItems = [['a', 'a'], ['b', 'b'], ['...r', '{ ...r }'],
  ['...s', '{ x: Int, ...s }'], ['...e', '(Int) -> Int with ...e']];
const functionItems = [['p', 't'], ['q', '{ ...r }'], ['u', 'Box(v)'],
  ['g', '(Int) -> Int with ...e'], ['h', '(t) -> Unit with ...d'],
  ['k', '{ y: w, ...s }']];

const sourceOf = seed => {
  const random = rng(seed);
  const some = items => random.shuffle(items)
    .slice(0, 1 + random.int(items.length));
  const typed = some(typeItems);
  const params = some(functionItems);
  return 'type Box(a) = Box(a);\n'
    + `type T(${typed.map(([written]) => written).join(', ')}) = `
    + `T(${typed.map(([, used]) => used).join(', ')});\n`
    + `fn f(${params.map(([at, ty]) => `${at}: ${ty}`).join(', ')}): Int`
    + ' = 0;\nfn main(): Int = 0;\n';
};

test('generated parameters in any order resolve with rows last', () => {
  const mixed = [];
  for (let seed = 0; seed < seeds; seed += 1) {
    const program = resolved(sourceOf(seed));
    const sorts = [...program.functions, ...program.types]
      .flatMap(found => found.sorts.map(name));
    if (sorts.includes('RowSort') && sorts.includes('TypeSort'))
      mixed.push(seed);
    assert.deepEqual(offending(program), [], `seed ${seed}`);
  }
  assert.ok(mixed.length > seeds / 2, `${mixed.length} mixed`);
});

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

test('every corpus function and type has its rows last', async () => {
  const programs = (await loadCorpus()).map(entry => programOf(entry.source))
    .filter(program => program !== null);
  assert.ok(programs.length > 900, `${programs.length} programs`);
  assert.deepEqual(programs.flatMap(offending), []);
});
