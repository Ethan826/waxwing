import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// FX017: a callback whose written row lacks a label of its caller's row is
// reported as that, not as the caller performing the label. The wording is
// the user's, approved 2026-10-12 (BACKLOG FX017). Probes p1-p6 are the
// ones the whole-branch review found.
const effects = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; ';
const main = ' fn main(): Unit with Console = Console.print(1);';
const fixed = 'a callback\'s row must equal its caller\'s (FX017)';
const lacks = (callee, row, own, fresh = '') =>
  `${callee} must allow every effect of a (${row}), but its row ${own}`
  + `; ${fresh}${fixed}`;
const written = (callee, row) => `write ${callee}'s row as \`with ${row}\`; `;

test('p1: the callback names L, the caller L + M', () => {
  expectDiagnostic(effects
    + 'fn a(q: Int -> Int with L, x: Int): Int with L + M = q(x);' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L + M', 'is L', written('q', 'L + M')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with L', 'with L', 'q\'s row is written here'],
      [': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('p2: the callback lacks L, which the body only performs later', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with M, x: Int): Int '
    + 'with L + M = q(x) + L.l();' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L + M', 'is M', written('q', 'L + M')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with M', 'with M', 'q\'s row is written here'],
      [': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('p3: the headline prints labels only, the hint keeps the named '
  + 'tail', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L + ...e, x: Int): Int '
    + 'with M + L + ...e = q(x);' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'M + L', 'is L', written('q', 'M + L + ...e')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with L + ...e', 'with L + ...e',
      'q\'s row is written here'],
    [': Int with M + L + ...e =', 'with M + L + ...e',
      'a\'s row is written here']]
  });
});

test('p4: an unannotated callback has no labels; its name is the note', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int, x: Int): Int with L = q(x);'
    + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L', 'has no labels', written('q', 'L')),
    at: ['q(x)'],
    notes: [['q: Int -> Int,', 'q', 'q\'s row is not written'],
      [': Int with L =', 'with L', 'a\'s row is written here']]
  });
});

test('p5: a lambda performing M keeps the genuine message', () => {
  expectDiagnostic(effects + 'fn a(x: Int): Int with L = '
    + '(fn(y: Int) => M.m())(x);' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['(fn(y: Int) => M.m())(x)'],
    notes: [['=> M.m()', 'M.m()', 'M is performed here'],
      [': Int with L =', 'with L',
        'the signature of a does not allow M']]
  });
});

test('p6: a callback performing more than its caller keeps its message', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L + M, x: Int): Int '
    + 'with L = q(x);' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['q(x)'],
    notes: [[': Int with L =', 'with L',
      'the signature of a does not allow M']]
  });
});

test('a function value that is not a parameter: no name, no callee '
  + 'note', () => {
  const keep = 'fn keep(f: Int -> Int with ...e): Int -> Int with ...e = f; ';
  expectDiagnostic(effects + keep
    + 'fn a(q: Int -> Int with L, x: Int): Int with L + M = keep(q)(x);'
    + main, {
    code: 'E_EFFECT',
    message: 'this function value must allow every effect of a (L + M), but '
      + 'its row is L; a function value\'s row must equal its caller\'s '
      + '(FX017)',
    at: ['keep(q)(x)'],
    notes: [[': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('a pipe applies the parameter the same way', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L, x: Int): Int '
    + 'with L + M = x |> q;' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L + M', 'is L', written('q', 'L + M')),
    at: ['x |> q', 'x'],
    notes: [['q: Int -> Int with L', 'with L', 'q\'s row is written here'],
      [': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('a Fail payload label prints as the row prints it', () => {
  expectDiagnostic('type E = E; effect L { fn l(): Int; }; '
    + 'fn a(q: Int -> Int with Fail(E), x: Int): Int with Fail(E) + L = q(x);'
    + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'Fail(E) + L', 'is Fail(E)',
      written('q', 'Fail(E) + L')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with Fail(E)', 'with Fail(E)',
      'q\'s row is written here'],
    [': Int with Fail(E) + L =', 'with Fail(E) + L',
      'a\'s row is written here']]
  });
});

test('a let-bound callee keeps no name in the resolved syntax', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L, x: Int): Int '
    + 'with L + M = { let f = q; f(x) };' + main, {
    code: 'E_EFFECT',
    message: 'this function value must allow every effect of a (L + M), but '
      + 'its row is L; a function value\'s row must equal its caller\'s '
      + '(FX017)',
    at: ['f(x)'],
    notes: [[': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

// Under `with` or `handle` the text is FX018's
// (test/fx018-callback-row.test.mjs).
test('a callee pairing with an installed duplicate: FX018\'s text is '
  + 'true', () => {
  const around = 'with handler Log { log(n) => Log.log(n + 100) } { body(()) }';
  const source = 'effect Log { fn log(n: Int): Unit; }; '
    + 'fn around(body: Unit -> Unit with Log + ...e): Unit with Log + ...e = '
    + `${around}; fn main(): Unit with Console = with handler Log `
    + '{ log(n) => Console.print(n) } { around(fn(u: Unit) => Log.log(1)) };';
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: 'body must allow every effect at this call (Log + Log), but its '
      + 'row is Log; write body\'s row as `with Log + Log + ...e`; a '
      + 'callback\'s row must equal the row where it is called (FX018)',
    at: ['body(())'],
    notes: [['body: Unit -> Unit with Log + ...e', 'with Log + ...e',
      'body\'s row is written here'],
    [around, around, 'Log is handled here'],
    [': Unit with Log + ...e =', 'with Log + ...e',
      'around\'s row is written here']]
  });
  assert.ok(compile(source.replace('body: Unit -> Unit with Log + ...e',
    'body: Unit -> Unit with Log + Log + ...e')) instanceof Right);
});

test('a named tail and a Fail payload: the hint writes the row as '
  + 'written', () => {
  expectDiagnostic('type E = E; effect L { fn l(): Int; }; '
    + 'fn a(q: Int -> Int with Fail(E) + ...e, x: Int): Int '
    + 'with L + Fail(E) + ...e = q(x);' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L + Fail(E)', 'is Fail(E)',
      written('q', 'L + Fail(E) + ...e')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with Fail(E) + ...e', 'with Fail(E) + ...e',
      'q\'s row is written here'],
    [': Int with L + Fail(E) + ...e =', 'with L + Fail(E) + ...e',
      'a\'s row is written here']]
  });
});
