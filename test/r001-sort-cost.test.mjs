import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { settleDeclarations } from '../output/Features.Resolve.Sorts/index.js';
import {
  typeIndices, indexOf
} from '../output/Features.Resolve.TypeIndices/index.js';
import { Right, Left } from '../output/Data.Either/index.js';
import { Just } from '../output/Data.Maybe/index.js';

// R001 Task 15 (T007): the row-sort walks cost a program without records
// as much as one with them (a 10,000-type chain took 1.9x its time before
// records), and each written type scanned every declared type by name.
// These guard the remedies without timing anything: a program with no
// record type written in a declaration is settled as written (the same
// array back, no walk), and the name index finds what a scan in
// declaration order finds.
const main = ' fn main(): Int = 0;';

const typesOf = source => {
  const parsed = parse(source + main);
  assert.ok(parsed instanceof Right, 'program parses');
  return parsed.value0.types;
};

const settled = types => settleDeclarations(typeIndices(types))(types);

test('declarations without a record type are settled as written', () => {
  const types = typesOf('type L(a) = N | C(a, L(a)); '
    + 'type H(...e) = H((Unit) -> Unit with ...e); type P(...p) = P(H(...p));');
  const result = settled(types);
  assert.ok(result instanceof Right);
  assert.equal(result.value0, types, 'the declarations, not a settled copy');
});

test('a record type written in a declaration settles the sorts', () => {
  const types = typesOf('type R(...r) = R({ x: Int, ...r }); '
    + 'type S(...s) = S(R(...s));');
  const result = settled(types);
  assert.ok(result instanceof Right);
  assert.notEqual(result.value0, types);
  assert.deepEqual(result.value0.map(type => type.parameters[0].sort
    .constructor.name), ['RecordSort', 'RecordSort']);
});

// Every declaration is searched, not only the first.
test('a record type in a later declaration settles the sorts', () => {
  const types = typesOf('type S(...s) = S(R(...s)); type U = U(Int); '
    + 'type R(...r) = R({ x: Int, ...r });');
  assert.deepEqual(settled(types).value0.map(type => type.parameters
    .map(parameter => parameter.sort.constructor.name)),
  [['RecordSort'], [], ['RecordSort']]);
});

test('a record type nested in a declaration still settles', () => {
  const types = typesOf('type R(...r) = R(L((Int) -> { x: Int, ...r })); '
    + 'type L(a) = L(a);');
  assert.equal(settled(types).value0[0].parameters[0].sort.constructor.name,
    'RecordSort');
});

test('a disagreement is still found when a record type is written', () => {
  const types = typesOf('type R(...r) = R({ x: Int, ...r }, '
    + '(Unit) -> Unit with ...r);');
  assert.ok(settled(types) instanceof Left);
});

// A small fixed generator: names repeat, some are absent, order is mixed.
const names = ['A', 'B', 'Ab', 'a', 'T1', 'T10', 'T2', 'Z', 'b', 'ä', ''];
const generated = seed => {
  let state = seed;
  const next = bound => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % bound;
  };
  return Array.from({ length: next(14) },
    () => ({ name: names[next(names.length)] }));
};

test('a name is found at its first declaration, or not at all', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const entries = generated(seed);
    const indices = typeIndices(entries);
    for (const name of [...names, 'Q', 'zz']) {
      const found = indexOf(indices)(name);
      const scanned = entries.findIndex(entry => entry.name === name);
      assert.equal(found instanceof Just ? found.value0 : -1, scanned,
        `${name} in ${JSON.stringify(entries)}`);
    }
  }
});
