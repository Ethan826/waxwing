import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { g0From } from './r0-g0-support.mjs';
import { holdersOf } from './r0-translator-holders.mjs';

// Ruling K-a (author, 2026-10-23): the recorded problem carries the
// program's complete holder set. The source-to-problem obligation:
// generation computes the program's own set, direct and transitive
// containment alike, and RT1's translator computes it apart. Then the
// coverage rule: a head a candidate introduces is judged from the set,
// and a head the program does not declare is never printable.
const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const { Atom } = g0;
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const Unfoldable = await load('Data.Unfoldable');
const Sets = await load('Data.Set');

const types = [
  ['F', 'type F = F(Int -> Int);', true], // a function field
  ['G', 'type G = G(F);', true], // through F
  ['P', 'type P(a) = P(a -> a);', true], // a parameterized holder
  ['W', 'type W = W(P(Int));', true], // through P's application
  ['H', 'type H = HNil | HCons(Int -> Int, H);', true], // recursive
  ['L', 'type L = LNil | LCons(Int, L);', false], // recursive, none
  ['C', 'type C = C({ f: Int -> Int });', true], // a record field
  ['K', 'type K = K(Int);', false],
  ['T', 'type T(a) = T(Int);', false] // a phantom parameter
];
const body = 'fn f(): Int = { let g = fn(y) => show(y); 0 };\n'
  + 'fn main(): Int = 0;\n';
const source = `${types.map(([, text]) => text).join('\n')}\n${body}`;
const program = resolve(parse(source).value0).value0;
const idOf = name => program.types.findIndex(info => info.name === name);
const ids = set => Sets.toUnfoldable(Unfoldable.unfoldableArray)(set);
const recorded = stubs.recorded.problem(source);

test('generation records the program\'s complete holder set', () => {
  const wanted = types.filter(([, , holds]) => holds)
    .map(([name]) => idOf(name)).sort((a, b) => a - b);
  assert.deepEqual(ids(recorded.holders.holding), wanted);
  assert.deepEqual(ids(recorded.holders.declared),
    program.types.map((_, index) => index));
  // RT1's translator (a separate algorithm) agrees on all four sets;
  // `admitted` and `overRecords` since Scope A (dossier §18.198).
  assert.deepEqual(holdersOf(program), { declared: ids(
    recorded.holders.declared), holding: wanted,
  admitted: ids(recorded.holders.admitted),
  overRecords: ids(recorded.holders.overRecords) });
});

// σ binds the flexible `y` of `pr y` to each type in turn.
const under = image => {
  const variable = recorded.bq[0].value.value0.value0;
  const found = g0.check(recorded, g0.candidateOf(recorded,
    [[variable, image]]));
  return found.constructor.name === 'Right' ? 'Right'
    : found.value0.constructor.name;
};
const data = name => new Atom.Base(new Atom.DataBase(idOf(name)));
const app = (name, args) => new Atom.App(new Atom.DataHead(idOf(name)),
  args);
const int = new Atom.Base(Atom.IntBase.value);

test('a holder a candidate introduces is judged from the problem\'s set',
  () => {
    // §3.2(a): a declared type holding functions is open, so the refusal
    // is `RequirementOpen` (the brief), read by rule 3 as a decline.
    assert.equal(under(data('F')), 'RequirementOpen');
    assert.equal(under(data('G')), 'RequirementOpen');
    assert.equal(under(app('P', [int])), 'RequirementOpen');
    assert.equal(under(new Atom.Arrow(int, int)), 'RequirementFails');
    assert.equal(under(app('T', [new Atom.Arrow(int, int)])),
      'RequirementFails');
    assert.equal(under(data('K')), 'Right');
    assert.equal(under(data('L')), 'Right');
  });

test('a head the program does not declare is never printable', () => {
  const absent = program.types.length + 5;
  assert.equal(under(new Atom.Base(new Atom.DataBase(absent))),
    'RequirementUnjudged');
  assert.equal(under(new Atom.App(new Atom.DataHead(absent), [])),
    'RequirementUnjudged');
});
