import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { canonicalSubstitution, sameSubstitution }
  from './r0-a2-canonical.mjs';

// Dossier §18.148 (5): "up to record field order" for the owed
// compatibility property (spec §11), one canonical comparison. These are
// unit tests of the comparison; the property stays owed until tranche 2.
const Atom = await load('Domain.Recorded.Atom');
const Hole = await load('Domain.Recorded.Hole');
const P = await load('Domain.Verdict.EffectPackage');
const Row = await load('Domain.Row');
const Maps = await load('Data.Map.Internal');
const { Tuple } = await load('Data.Tuple');
const { Nothing } = await load('Data.Maybe');

const int = new Atom.Base(Atom.IntBase.value);
const bool = new Atom.Base(Atom.BoolBase.value);
const hole = n => Hole.holeVar(n);
const fields = pairs => pairs.map(([label, value]) => new Tuple(label, value));
const record = (pairs, tails = []) => new Atom.Record(fields(pairs), tails);
// A substitution of one variable, hole 1, to `type`.
const sigma = type => Maps.singleton(hole(1))(type);
const pInt = new P.PBase(Atom.IntBase.value);
const pBool = new P.PBase(Atom.BoolBase.value);
const failOf = payload => ({ effect: Row.FailEffect.value, args: [payload],
  mark: P.TermN.value });
const consoleLabel = { effect: Row.ConsoleEffect.value, args: [],
  mark: P.TermN.value };
// `Int -> Int` with the effect row `labels`, closed.
const arrow = labels => Maps.singleton(hole(1))(new P.PArrow(pInt,
  { labels, tail: Nothing.value }, pInt));

test('field-order variants are equal', () => {
  const ab = record([['a', bool], ['b', int]]);
  const ba = record([['b', int], ['a', bool]]);
  assert.ok(sameSubstitution(sigma(ab), sigma(ba)));
  // Nested, under an arrow.
  assert.ok(sameSubstitution(sigma(new Atom.Arrow(ab, ba)),
    sigma(new Atom.Arrow(ba, ab))));
  // A package's record rows, and tails as a multiset.
  const row = (pairs, tails) => Maps.singleton(hole(2))(
    { fields: fields(pairs), tails });
  assert.ok(sameSubstitution(row([['x', pInt], ['y', pBool]],
    [hole(3), hole(4)]), row([['y', pBool], ['x', pInt]],
    [hole(4), hole(3)])));
  assert.deepEqual(canonicalSubstitution(sigma(ab)),
    canonicalSubstitution(sigma(ba)));
});

test('a moved field value is not equal', () => {
  assert.ok(!sameSubstitution(sigma(record([['a', bool], ['b', int]])),
    sigma(record([['a', int], ['b', bool]]))));
});

test('a changed hole number is not equal', () => {
  assert.ok(!sameSubstitution(sigma(new Atom.TVar(hole(3))),
    sigma(new Atom.TVar(hole(4)))));
  // Nor a record tail's, nor a dropped tail.
  assert.ok(!sameSubstitution(sigma(record([], [hole(3)])),
    sigma(record([], [hole(4)]))));
  assert.ok(!sameSubstitution(sigma(record([], [hole(3)])),
    sigma(record([], []))));
});

test('effect labels keep their multiplicity and same-key order', () => {
  const twoFails = [failOf(pInt), failOf(pBool)];
  assert.ok(sameSubstitution(arrow(twoFails), arrow([...twoFails])));
  assert.ok(!sameSubstitution(arrow(twoFails),
    arrow([failOf(pBool), failOf(pInt)])), 'swapped same-key order');
  assert.ok(!sameSubstitution(arrow([consoleLabel, consoleLabel]),
    arrow([consoleLabel])),
    'dropped duplicate label');
});
