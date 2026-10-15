import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectedAt } from './support.mjs';

// FX025: an unbound effect row variable reported E_INTERNAL; it is the
// unbound type variable a record tail gets.
const main = ' fn main(): Int = 0;';
const effect = 'effect E { fn op(): Unit; }; ';
const holder = 'type E(...e) = E((Int) -> Int with ...e); ';

// A row written with `with` is reported at the whole row, as the sort
// errors of Resolve.Occurrences are.
const unbound = (source, text, name, nth = 0) => {
  const diagnostic = rejectedAt(source, 'E_UNBOUND', text, nth);
  assert.equal(diagnostic.message, `Unbound type variable ${name}`);
};

test('an unbound effect row variable in a declaration is unbound', () => {
  unbound(`type W = W((Int) -> Int with ...z);${main}`, 'with ...z', 'z');
  unbound(`type W(...e) = W((Int) -> Int with ...z);${main}`,
    'with ...z', 'z');
});

test('an unbound row variable is unbound beside labels', () => {
  unbound(`${effect}type W = W((Int) -> Int with E + ...z);${main}`,
    'with E + ...z', 'z');
});

test('an unbound row variable as a declared type argument', () => {
  unbound(`${holder}type W = W(E(...z));${main}`, '...z', 'z');
});

test('an unbound row variable in a lambda annotation', () => {
  unbound('fn main(): Int = { let g = fn(d: (Int) -> Int with ...e) => 0; '
    + '0 };', 'with ...e', 'e');
  unbound(`${holder}fn f(x: Int): Int = { let g = fn(d: E(...e)) => 0; 0 };`
    + main, '...e', 'e', 2);
});
