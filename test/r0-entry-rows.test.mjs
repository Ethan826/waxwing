// R037 (2), dossier §18.177-§18.178: row conversion is row-level, and
// main's boundary check pairs each label with its occurrence in one walk.
// The old forms wrapped a row in `TFun TUnit row TUnit` and unwrapped it,
// with an arm for a non-arrow; they are the oracle here. Rows are plain
// JS (test/unify-support.mjs): type metas 0..2, row metas 10..12.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TFun, TUnit } from '../output/Domain.Type/index.js';
import * as entry from '../output/Features.Check.Entry/index.js';
import { occurrencesAt } from '../output/Features.Check.Provenance/index.js';
import * as scheme from '../output/Features.Check.Scheme/index.js';
import * as unifier from '../output/Features.Check.Unify/index.js';
import * as rows from '../output/Features.Check.UnifyRow/index.js';
import { Right } from '../output/Data.Either/index.js';
import { choose, generator } from './coverage-oracle.mjs';
import { expectDiagnostic, log } from './fx-diagnostics-support.mjs';
import { bool, fromLabel, int, meta, plainMark, rigid,
  toRow } from './unify-support.mjs';

const cases = 400;
const span = { start: { line: 3, column: 1, offset: 40 },
  end: { line: 3, column: 9, offset: 48 } };

// A row with each label's mark, so a conversion that dropped one shows.
const plainLabel = l => ({ ...fromLabel(l), mark: plainMark(l.value2) });
const plain = flexRow => ({ labels: flexRow.value0.map(plainLabel),
  tail: flexRow.value1.constructor.name === 'Just'
    ? [flexRow.value1.value0.constructor.name, flexRow.value1.value0.value0]
    : null });
const occurrence = o => o.constructor.name === 'Written'
  ? ['Written', o.value0, o.value1] : ['Extended', o.value0];
const arrow = row => TFun.create(TUnit.value)(row)(TUnit.value);

// The pre-repair forms, kept only as the oracle.
const oldFlexibleRow = open => scheme.flexible(arrow(open)).value1;
const oldOpenedRow = flex => scheme.opened(arrow(flex)).value1;
const oldResolvedRow = (subst, open) =>
  scheme.opened(unifier.resolve(subst)(scheme.flexible(arrow(open)))).value1;

const genArg = next =>
  [int, bool, meta(0), meta(1), rigid(4)][choose(next, 5)];
// Effects 0 and 1 repeat often, so rows carry duplicate labels.
const genLabel = next => {
  const shape = choose(next, 4);
  if (shape === 0) return { e: 'console', args: [] };
  return { e: shape - 1, args: shape === 3 ? [] : [genArg(next)],
    mark: ['plain', 'nofail'][choose(next, 2)] };
};
const genRow = (next, tails) => ({
  labels: Array.from({ length: choose(next, 5) }, () => genLabel(next)),
  tail: tails[choose(next, tails.length)] });
const anyTail = [null, rigid(5), meta(10), meta(11), meta(12)];

// A substitution from unifying two generated rows, or the empty one.
const genSubst = next => {
  const result = rows.unifyRows(unifier.unify)(unifier.empty)(
    toRow(genRow(next, [meta(10), meta(11)])))(
    toRow(genRow(next, [null, meta(12)])));
  return result instanceof Right ? result.value0 : unifier.empty;
};

const duplicates = { labels: [{ e: 0, args: [int] }, { e: 0, args: [int] },
  { e: 'console', args: [] }, { e: 0, args: [meta(0)] }], tail: meta(10) };

test('flexibleRow and openedRow agree with the arrow round trip', () => {
  const next = generator(0x3702);
  const fixed = [duplicates, { labels: [], tail: null },
    { labels: [], tail: meta(11) }, { ...duplicates, tail: rigid(5) }];
  const generated = Array.from({ length: cases },
    () => genRow(next, anyTail));
  for (const plainRow of [...fixed, ...generated]) {
    const flex = toRow(plainRow);
    const open = scheme.openedRow(flex);
    assert.deepEqual(plain(scheme.flexibleRow(open)), plain(flex));
    assert.deepEqual(plain(scheme.flexibleRow(open)),
      plain(oldFlexibleRow(open)));
    assert.deepEqual(plain(scheme.flexibleRow(oldOpenedRow(flex))),
      plain(flex));
  }
});

test('repeated labels keep their order and count through conversion', () => {
  const open = scheme.openedRow(toRow(duplicates));
  const back = plain(scheme.flexibleRow(open));
  assert.equal(back.labels.length, 4);
  assert.deepEqual(back.labels.map(l => [l.e, l.args]),
    [[0, [int]], [0, [int]], ['console', []], [0, [meta(0)]]]);
});

test('resolvedRow agrees with the arrow round trip under a substitution',
  () => {
    const next = generator(0x3703);
    for (let index = 0; index < cases; index += 1) {
      const subst = genSubst(next);
      const open = scheme.openedRow(toRow(genRow(next, anyTail)));
      assert.deepEqual(
        plain(scheme.flexibleRow(entry.resolvedRow(subst)(open))),
        plain(scheme.flexibleRow(oldResolvedRow(subst, open))));
    }
  });

// What the zip paired: resolveRow's labels with occurrencesAt's ids.
const zipped = (subst, open) => {
  const labels = unifier.resolveRow(subst)(scheme.flexibleRow(open)).value0;
  const ids = occurrencesAt(span)(subst)(scheme.flexibleRow(open));
  assert.equal(labels.length, ids.length);
  return labels.map((label, index) =>
    [plainLabel(label), occurrence(ids[index])]);
};
const paired = (subst, open) => entry.finalEntries(subst)(span)(open)
  .map(found => [plainLabel(found.label), occurrence(found.occurrence)]);

test('finalEntries pairs as the zip did, every label kept', () => {
  const next = generator(0x3704);
  for (let index = 0; index < cases; index += 1) {
    const subst = genSubst(next);
    const open = scheme.openedRow(toRow(genRow(next, anyTail)));
    assert.deepEqual(paired(subst, open), zipped(subst, open));
  }
});

test('tail-expanded labels keep duplicates and their occurrences', () => {
  // [E0(Int) | 10] against [E0(Int), E1, E0(Int)]: 10 := [E1, E0(Int)].
  const result = rows.unifyRows(unifier.unify)(unifier.empty)(
    toRow({ labels: [{ e: 0, args: [int] }], tail: meta(10) }))(
    toRow({ labels: [{ e: 0, args: [int] }, { e: 1, args: [] },
      { e: 0, args: [int] }], tail: null }));
  assert.ok(result instanceof Right);
  const open = scheme.openedRow(
    toRow({ labels: [{ e: 0, args: [int] }], tail: meta(10) }));
  const found = paired(result.value0, open);
  assert.deepEqual(found.map(([label]) => [label.e, label.args]),
    [[0, [int]], [1, []], [0, [int]]]);
  assert.deepEqual(found.map(([, id]) => id[0]),
    ['Written', 'Extended', 'Extended']);
  assert.equal(found[0][1][2], 0);
  assert.deepEqual(found, zipped(result.value0, open));
});

// End to end: each rejection pinned on the pre-repair compiler too
// (§18.178). Console first, then Log: a check that stops after one label
// accepts it; Log through a callee's row reaches main by tail expansion.
const at = (source, inner) => [source, inner];
const boundary = source => [source, source, 'main may perform only Console'];

test('main rejects a label after Console', () => {
  const main = 'fn main(): Unit = { Console.print("a"); Log.log(1) };';
  expectDiagnostic(log + main, { code: 'E_EFFECT',
    message: 'Unhandled Log in main', at: at(main, 'Log.log(1)'),
    notes: [boundary(main)] });
});

test('main rejects a label reached through a callee after Console', () => {
  const both = 'fn both(): Unit with Console + Log = '
    + '{ Console.print("a"); Log.log(1) }; ';
  const main = 'fn main(): Unit = both();';
  expectDiagnostic(log + both + main, { code: 'E_EFFECT',
    message: 'Unhandled Log in main', at: at(main, 'both()'),
    notes: [[both, 'Log.log(1)', 'Log is performed here'], boundary(main)] });
});

test('main rejects a repeated label at its first occurrence', () => {
  const main = 'fn main(): Unit = '
    + '{ Console.print("a"); Log.log(1); Log.log(2) };';
  expectDiagnostic(log + main, { code: 'E_EFFECT',
    message: 'Unhandled Log in main', at: at(main, 'Log.log(1)'),
    notes: [boundary(main)] });
});
