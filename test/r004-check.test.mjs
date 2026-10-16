import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectedAt } from './support.mjs';
import { checkRejectedAt, checkedPoly } from './phases.mjs';

// R004 Task 2: checking record patterns (design §2, §6). Names are chosen
// so that no text occurs inside another.
const main = ' fn main(): Int = 0;';
const helper = ' fn g(b: Bool): Int = 1;';
const over = (ty, ...arms) =>
  `fn f(x: ${ty}): Int = match x { ${arms.join(', ')} };${helper}${main}`;

// Coverage runs after every body is checked; since Task 3 it judges
// record patterns too, so a program that checks is accepted through
// Check (Go lowering is Task 4's), or its redundant arm is reported.
const passesCheck = source => checkedPoly(source);
const redundantAt = (source, pattern) =>
  checkRejectedAt(source, 'E_REDUNDANT', pattern);

const failsAt = (source, text, message, nth = 0) => {
  const found = rejectedAt(source, 'E_TYPE', text, nth);
  assert.equal(found.message, message);
};

test('a missing field is the first unlisted label, at the pattern', () => {
  failsAt(over('{ fc: Int, fa: Int, fb: Int }', '{ fb: vb } => vb'),
    '{ fb: vb }',
    'Pattern is missing field fa; add it or end the pattern with ...');
});

test('an open row with every known field listed misses the rest', () => {
  failsAt(over('{ fa: Int, ...r }', '{ fa: va } => va'), '{ fa: va }',
    'Pattern is missing the rest of { fa: Int, ...r }; end the pattern'
      + ' with ...');
});

test('an unknown label is reported at the label, not its pattern', () => {
  failsAt(over('{ fa: Int }', '{ fa: va, unknown: value } => va'),
    'unknown', 'unknown is not a field of { fa: Int }');
});

test('labels are known before any field pattern is checked', () => {
  failsAt(over('{ fa: Int }', '{ fa: true, fz: vz } => 1'), 'fz',
    'fz is not a field of { fa: Int }');
});

test('a tail never supplies a field', () => {
  failsAt(over('{ ...r }', '{ fa: va, ... } => 1'), 'fa',
    'fa is not a field of { ...r }');
});

test('a rigid variable is not a record', () => {
  failsAt(over('a', '{ fa: va, ... } => 1'), '{ fa: va, ... }',
    'Expected a record, found a');
});

test('Int is not a record', () => {
  failsAt(over('Int', '{ fa: va } => 1'), '{ fa: va }',
    'Expected a record, found Int');
});

test('a field pattern of the wrong type is a mismatch at that pattern',
  () => {
    failsAt(over('{ fa: Int }', '{ fa: true } => 1'), 'true',
      'Expected Int, found Bool');
  });

test('field order in the pattern is irrelevant', () => {
  const ty = '{ fa: Int, fb: Bool }';
  passesCheck(over(ty, '{ fb: true, fa: va } => va',
    '{ fa: vb, fb: false } => vb'));
});

test('a field binder has its field type in the arm body', () => {
  const ty = '{ fa: Int, fb: Bool }';
  passesCheck(over(ty, '{ fa: va, ... } => va + 1'));
  failsAt(over(ty, '{ fa: va, ... } => g(va)'), 'va', 'Expected Bool,'
    + ' found Int', 1);
});

test('a punned binder has its field type', () => {
  const ty = '{ fa: Int, fb: Bool }';
  passesCheck(over(ty, '{ fb, ... } => g(fb)'));
  failsAt(over(ty, '{ fa, ... } => g(fa)'), 'fa',
    'Expected Bool, found Int', 2);
});

test('a record pattern under a generic constructor field', () => {
  const source = 'type Box(a) = Box(a); '
    + over('Box({ fk: Int, fm: Bool })', 'Box({ fk: vk, ... }) => vk + 1');
  passesCheck(source);
});

test('a record pattern nested in a record pattern', () => {
  passesCheck(over('{ fa: { fb: Int, fc: Bool } }',
    '{ fa: { fb: vb, ... } } => vb'));
});

// An unannotated lambda parameter's type is a hole when the match is
// checked: the pattern decides it.
const lambda = (pattern, argument) => 'fn f(): Int = '
  + `(fn(p) => match p { ${pattern} => vk + 1 })(${argument});${main}`;

test('a closed pattern makes a hole a closed record', () => {
  passesCheck(lambda('{ fk: vk }', '{ fk: 1 }'));
  failsAt(lambda('{ fk: vk }', '{ fk: 1, fm: true }'), '{ fk: 1, fm: true }',
    'Expected { fk: Int }, found { fk: Int, fm: Bool }');
});

test('an open pattern makes a hole an open record', () => {
  passesCheck(lambda('{ fk: vk, ... }', '{ fk: 1, fm: true }'));
});

test('a hole\'s fields take their patterns\' types', () => {
  failsAt(lambda('{ fk: vk }', '{ fk: true }'), '{ fk: true }',
    'Expected { fk: Int }, found { fk: Bool }');
});

// User decision 2026-10-16: a record pattern extends a hole tail with the
// labels it writes, as `.l` does, so arm order does not matter; a closed
// pattern closes a hole tail.
const hole = (argument, ...found) => 'fn f(): Int = (fn(p) => match p { '
  + `${found.join(', ')} })(${argument});${main}`;
const openFirst = ['{ fk: true, ... } => 1', '{ fk: vk, fm: vm } => vm'];
const closedFirst = [openFirst[1], openFirst[0]];

test('either arm order extends, then closes, a hole tail', () => {
  passesCheck(hole('{ fk: true, fm: 2 }', ...openFirst));
  // Checked either way: the closed arm first leaves the open one redundant.
  redundantAt(hole('{ fk: true, fm: 2 }', ...closedFirst),
    '{ fk: true, ... }');
  for (const found of [openFirst, closedFirst]) {
    failsAt(hole('{ fk: true, fm: 2, fz: 3 }', ...found),
      '{ fk: true, fm: 2, fz: 3 }',
      'Expected { fk: Bool, fm: Int }, found { fk: Bool, fm: Int, fz: Int }');
  }
});

// Checked, then the first arm, matching every value, leaves the second
// redundant.
test('a later open arm may name a field an earlier open arm did not', () => {
  redundantAt(hole('{ fa: 1, fb: true, fc: 3 }', '{ fa: va, ... } => va',
    '{ fb: vb, ... } => 2'), '{ fb: vb, ... }');
});

test('an open arm after a closed one cannot add a field', () => {
  failsAt(hole('{ fk: true }', '{ fk: true } => 1', '{ fz: vz, ... } => 2'),
    'fz', 'fz is not a field of { fk: Bool }');
});
