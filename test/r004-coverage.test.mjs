import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRejectedAt, checkedPoly } from './phases.mjs';

// R004 Task 3: coverage through record patterns (design §3). Checked
// through Check only, since record patterns reach Go in Task 4.
const prelude = 'type Opt(a) = Nada | Some(a); type Void = Void(Void); ';
const main = ' fn main(): Int = 0;';
const over = (ty, ...arms) => `${prelude}fn f(x: ${ty}): Int = `
  + `match x { ${arms.join(', ')} };${main}`;
const whole = source => source.slice(source.indexOf('match x'),
  source.lastIndexOf('};') + 1);

const missing = (source, witness) => {
  const found = checkRejectedAt(source, 'E_NON_EXHAUSTIVE', whole(source));
  assert.equal(found.message, `Missing pattern: ${witness}`);
};
const redundant = (source, pattern) =>
  checkRejectedAt(source, 'E_REDUNDANT', pattern);

const user = '{ admin: Bool, name: Int }';

test('an arm after an exhaustive record row is redundant', () => {
  redundant(over(user, '{ admin: _, name: n } => n',
    '{ admin: true, ... } => 0'), '{ admin: true, ... }');
});

test('a witness through a record field lists every field', () => {
  missing(over(user, '{ admin: true, ... } => 1'),
    '{ admin: false, name: _ }');
});

test('a record-only match over both Bool fields is exhaustive', () => {
  checkedPoly(over('{ a: Bool, b: Int }', '{ a: true, ... } => 1',
    '{ a: false, ... } => 2'));
});

test('an open type\'s witness ends with ...', () => {
  missing(over('{ a: Bool, ...r }', '{ a: true, ... } => 1'),
    '{ a: false, ... }');
});

test('a nested open record keeps its ... inside the witness', () => {
  missing(over('{ a: { b: Bool, ...r }, c: Bool }', '{ a: _, c: true } => 1'),
    '{ a: { b: _, ... }, c: false }');
});

test('a record witness under a constructor', () => {
  missing(over('Opt({ a: Bool, b: Bool })', 'Nada => 0',
    'Some({ a: true, ... }) => 1'), 'Some({ a: false, b: _ })');
});

test('a parameterized type inside a record', () => {
  missing(over('{ o: Opt(Bool) }', '{ o: Nada } => 0',
    '{ o: Some(true) } => 1'), '{ o: Some(false) }');
});

// No pattern names Opt(Bool) here, so its table exists only if coverage
// finds the application inside the record type.
test('a binder over a record holding an applied type', () => {
  checkedPoly(over('{ o: Opt(Bool) }', 'y => 0'));
});

test('a wildcard and record patterns mix', () => {
  checkedPoly(over(user, '{ admin: true, name: _ } => 1', '_ => 2'));
  redundant(over(user, '_ => 1', '{ admin: true, ... } => 2'),
    '{ admin: true, ... }');
  checkedPoly(over('Opt({ a: Bool })', 'Some({ a: true }) => 1',
    'Some(_) => 2', 'Nada => 3'));
});

// A record is inhabited exactly when every field is, so a constructor
// holding a record with an uninhabited field, nested or not, is too.
const holders = 'type Wrap = Wrap({ v: Void, n: Int });'
  + ' type Deep = Deep({ r: { v: Void }, b: Bool }); ';

test('a constructor holding a record with an uninhabited field', () => {
  for (const holder of ['Wrap', 'Deep']) {
    checkedPoly(holders + over(`Opt(${holder})`, 'Nada => 0'));
    redundant(holders + over(`Opt(${holder})`, 'Nada => 0', '_ => 1'),
      '_');
  }
});

test('an uninhabited record field leaves no witness', () => {
  checkedPoly(over('{ b: Bool, r: { v: Void } }', '{ b: true, ... } => 1'));
});
