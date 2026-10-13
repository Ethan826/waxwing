import test from 'node:test';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// FX017: a callback whose written row lacks a label of its caller's row is
// reported as that, not as the caller performing the label. The wording is
// the user's, approved 2026-10-12 (BACKLOG FX017). Probes p1-p6 are the
// ones the whole-branch review found.
const effects = 'effect L { fn l(): Int; }; effect M { fn m(): Int; }; ';
const main = ' fn main(): Unit with Console = print(1);';
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
    + 'with L + M = q(x) + l();' + main, {
    code: 'E_EFFECT',
    message: lacks('q', 'L + M', 'is M', written('q', 'L + M')),
    at: ['q(x)'],
    notes: [['q: Int -> Int with M', 'with M', 'q\'s row is written here'],
      [': Int with L + M =', 'with L + M', 'a\'s row is written here']]
  });
});

test('p3: the headline prints labels only, the hint keeps the named tail', () => {
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
    notes: [['q: Int -> Int,', 'q', 'q\'s row is written here'],
      [': Int with L =', 'with L', 'a\'s row is written here']]
  });
});

test('p5: a lambda performing M keeps the genuine message', () => {
  expectDiagnostic(effects + 'fn a(x: Int): Int with L = '
    + '(fn(y: Int) => m())(x);' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['(fn(y: Int) => m())(x)'],
    notes: [['=> m()', 'm()', 'M is performed here'],
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

test('a function value that is not a parameter: no name, no callee note', () => {
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

test('a label an installation put in the row keeps the old message', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> Int with L, x: Int): Int with L '
    + '= { let h = handler M { m() => 1 }; with h { q(x) } };' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['q(x) }', 'q(x)'],
    notes: [[': Int with L =', 'with L',
      'the signature of a does not allow M']]
  });
});

test('a callee pairing with an installed duplicate keeps the old message', () => {
  const around = 'with handler Log { log(n) => log(n + 100) } { body(()) }';
  expectDiagnostic('effect Log { fn log(n: Int): Unit; }; '
    + 'fn around(body: Unit -> Unit with Log + ...e): Unit with Log + ...e = '
    + `${around}; fn main(): Unit with Console = with handler Log `
    + '{ log(n) => print(n) } { around(fn(u: Unit) => log(1)) };', {
    code: 'E_EFFECT',
    message: 'around performs Log, which its signature does not allow',
    at: ['body(())'],
    notes: [[around, around, 'Log comes from this function value'],
      [around, 'log(n + 100)', 'Log is performed here'],
      [around, around, 'Log is handled here'],
      [': Unit with Log + ...e =', 'with Log + ...e',
        'the signature of around does not allow Log']]
  });
});

test('a named tail and a Fail payload: the hint writes the row as written', () => {
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

const anonymous = (row, own) => 'this function value must allow every effect '
  + `of a (${row}), but its row ${own}; a function value's row must equal `
  + 'its caller\'s (FX017)';
const callerNote = [': Int with L + M =', 'with L + M', 'a\'s row is written here'];

test('a later stage of a curried parameter is an anonymous function value', () => {
  expectDiagnostic(effects + 'fn a(q: Int -> (Int -> Int with L) with L + M, '
    + 'x: Int): Int with L + M = q(x, x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'is L'),
    at: ['q(x, x)'], notes: [callerNote]
  });
});

test('a parameter with a two-stage type is anonymous: its hint would loop', () => {
  const head = effects + 'fn a(q: Int -> Int -> Int with L, x: Int): Int '
    + 'with L + M = ';
  expectDiagnostic(head + 'q(x, x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'has no labels'),
    at: ['q(x, x)'], notes: [callerNote]
  });
  expectDiagnostic(head + 'q(x)(x);' + main, {
    code: 'E_EFFECT', message: anonymous('L + M', 'has no labels'),
    at: ['q(x)'], notes: [callerNote]
  });
});

test('a row nested in a label payload keeps the old message', () => {
  expectDiagnostic(effects + 'effect S(s) { fn get(): s; }; '
    + 'fn a(q: Int -> Int with S(Int -> Int with L), x: Int): Int '
    + 'with S(Int -> Int with L + M) = q(x);' + main, {
    code: 'E_EFFECT',
    message: 'a performs M, which its signature does not allow',
    at: ['q(x)'],
    notes: [[': Int with S(Int -> Int with L + M) =',
      'with S(Int -> Int with L + M)',
      'the signature of a does not allow M']]
  });
});
