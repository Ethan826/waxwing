import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';

// A2 Task 6 (docs/plans/2026-10-31-a2-validator-plan.md): mark terms
// (statements §2, §5) and grouped rows (spec §9, R-A). The oracles below
// are written from the statements' meaning, not from the PureScript:
// a term is read under a valuation of its rigid marks as N = 0, M = 1,
// `J S` the join (max) of S's values, N when S is empty. Every result is
// bounded agreement on the stated grammar, not a proof.
const Term = await load('Features.Check.Strategy.Effects.Term');
const Rows = await load('Features.Check.Strategy.Effects.Rows');
const Row = await load('Domain.Row');
const Atom = await load('Domain.Recorded.Atom');
const Types = await load('Domain.Verdict.EffectPackage');
const Sets = await load('Data.Set');
const { Just, Nothing } = await load('Data.Maybe');
const { foldableArray } = await load('Data.Foldable');
const { ordString } = await load('Data.Ord');

const subsets = names => names.reduce((found, name) =>
  found.concat(found.map(subset => [...subset, name])), [[]]);
const termsOver = names => ['N', 'M',
  ...subsets(names).map(subset => ['J', ...subset])];
const termOf = spec => spec === 'N' ? Types.TermN.value
  : spec === 'M' ? Types.TermM.value
    : new Types.TermJ(Sets.fromFoldable(foldableArray)(ordString)(
      spec.slice(1)));
const valuations = names => subsets(names).map(high =>
  new Set(high));
const valueAt = (spec, high) => spec === 'N' ? 0 : spec === 'M' ? 1
  : spec.slice(1).some(name => high.has(name)) ? 1 : 0;
const pairs = names => termsOver(names).flatMap(left =>
  termsOver(names).map(right => [left, right]));
const show = spec => JSON.stringify(spec);

test('holds over every valuation', () => {
  const names = ['k', 'l'];
  assert.equal(pairs(names).length, 36);
  for (const [left, right] of pairs(names)) {
    const meaning = valuations(names).every(high =>
      valueAt(left, high) <= valueAt(right, high));
    assert.equal(Term.holds(termOf(left))(termOf(right)), meaning,
      `${show(left)} ⊑ ${show(right)}`);
  }
});

test('norm equality exact', () => {
  const names = ['a', 'b', 'c', 'd'];
  assert.equal(valuations(names).length, 16);
  for (const [left, right] of pairs(names)) {
    const meaning = valuations(names).every(high =>
      valueAt(left, high) === valueAt(right, high));
    assert.equal(Term.sameTerm(termOf(left))(termOf(right)), meaning,
      `${show(left)} ≡ ${show(right)}`);
  }
});

test('norm sends the empty join to N and keeps every other term', () => {
  const normal = spec => Term.norm(termOf(spec)).constructor.name;
  assert.deepEqual(['N', 'M', ['J'], ['J', 'k'], ['J', 'k', 'l']]
    .map(normal), ['TermN', 'TermM', 'TermN', 'TermJ', 'TermJ']);
  assert.deepEqual(Term.norm(termOf(['J', 'k', 'l'])).value0,
    termOf(['J', 'k', 'l']).value0);
});

test('join subset', () => {
  assert.equal(Term.holds(termOf(['J', 'k', 'l']))(termOf(['J', 'k'])),
    false);
  assert.equal(Term.holds(termOf(['J', 'k']))(termOf(['J', 'k', 'l'])),
    true);
  assert.equal(Term.holds(termOf(['J', 'k']))(termOf('N')), false);
  assert.equal(Term.holds(termOf(['J']))(termOf('N')), true);
});

// Rows over effects A = 1 and B = 2, each label of one argument, Int or
// Bool, every mark N, closed or ending in one rigid tail.
const labelSpecs = [[1, 'Int'], [1, 'Bool'], [2, 'Int'], [2, 'Bool']];
const sequences = length => length === 0 ? [[]]
  : sequences(length - 1).flatMap(row =>
    labelSpecs.map(label => [...row, label]));
const allRows = [0, 1, 2, 3, 4].flatMap(sequences);
const tails = [Nothing.value, new Just(new Types.PTailRigid(0))];
const bases = { Int: Atom.IntBase.value, Bool: Atom.BoolBase.value };
const labelOf = ([effect, arg]) => ({ effect: new Row.UserEffect(effect),
  args: [new Types.PBase(bases[arg])], mark: Types.TermN.value });
const rowOf = (labels, tail) => ({ labels: labels.map(labelOf), tail });
const describe = grouped => JSON.stringify({
  keyed: grouped.keyed.map(pair => [pair.value0.value0.value0 ?? 'fail',
    pair.value1.map(label => label.args[0].value0.constructor.name)]),
  tail: grouped.tail.constructor.name
});
const fromJust = maybe => {
  assert.equal(maybe.constructor.name, 'Just');
  return maybe.value0;
};
// The closure of (eq-swap), adjacent labels of distinct keys, by BFS.
const classOf = (labels, tail) => {
  const seen = new Set([show(labels)]);
  const queue = [labels];
  while (queue.length > 0) {
    const row = queue.shift();
    for (let at = 0; at + 1 < row.length; at += 1) {
      if (row[at][0] === row[at + 1][0]) continue;
      const next = [...row];
      [next[at], next[at + 1]] = [next[at + 1], next[at]];
      if (!seen.has(show(next))) { seen.add(show(next)); queue.push(next); }
    }
  }
  return tail.constructor.name + [...seen].sort()[0];
};

test('grouped matches eq-swap', () => {
  const cases = tails.flatMap(tail => allRows.map(labels => ({
    grouped: describe(fromJust(Rows.grouped(rowOf(labels, tail)))),
    swapped: classOf(labels, tail) })));
  assert.equal(cases.length, 2 * (1 + 4 + 16 + 64 + 256));
  const byGrouped = new Map();
  const bySwapped = new Map();
  for (const { grouped, swapped } of cases) {
    if (!byGrouped.has(grouped)) byGrouped.set(grouped, swapped);
    if (!bySwapped.has(swapped)) bySwapped.set(swapped, grouped);
    assert.equal(byGrouped.get(grouped), swapped, grouped);
    assert.equal(bySwapped.get(swapped), grouped, swapped);
  }
  // A class is a pair of per-key sequences: sum over n ≤ 4 of
  // (n + 1) 2^n = 129 per tail.
  assert.equal(bySwapped.size, 2 * 129);
});

test('grouped keeps each key\'s labels in row order', () => {
  const found = fromJust(Rows.grouped(rowOf([[1, 'Int'], [2, 'Int'],
    [1, 'Bool']], Nothing.value)));
  assert.equal(describe(found), JSON.stringify({ keyed: [[1, ['IntBase',
    'BoolBase']], [2, ['IntBase']]], tail: 'Nothing' }));
});

test('E1 order', () => {
  const state = [[1, 'Int'], [1, 'Bool']];
  const left = Rows.grouped(rowOf(state, Nothing.value));
  const right = Rows.grouped(rowOf([...state].reverse(), Nothing.value));
  assert.notEqual(describe(fromJust(left)), describe(fromJust(right)));
});

test('grouped refuses a keyless Fail label and keys Fail by head', () => {
  const failRow = arg => ({ labels: [{ effect: Row.FailEffect.value,
    args: [arg], mark: Types.TermN.value }], tail: Nothing.value });
  const keyless = failRow(new Types.PVar(new Atom.RigidVar(3)));
  assert.equal(Rows.grouped(keyless).constructor.name, 'Nothing');
  const { keyed } = fromJust(Rows.grouped(failRow(
    new Types.PBase(bases.Int))));
  assert.ok(keyed[0].value0 instanceof Row.FailKey);
});
