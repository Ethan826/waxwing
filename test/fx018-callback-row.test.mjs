import test from 'node:test';
import { accepted, applyHint, effects, here, keep, main, write }
  from './fx018-support.mjs';
import { expectDiagnostic } from './fx-diagnostics-support.mjs';

// Part (a): inside `with`/`handle` the row at the call holds the installed
// labels first. Probes a1-a5 are the controller's (sdd/fx018).
const install = 'let h = handler M { m() => 1 }; ';
const calleeNote = (text, row) => [text, row, 'q\'s row is written here'];
const callerNote = (text, row) => [text, row, 'a\'s row is written here'];
const handled = (label, container = 'with h { q(x) }') =>
  [container, container, `${label} is handled here`];
const body = (callee, caller, call = 'q(x)') => effects
  + `fn a(q: Int -> Int ${callee}, x: Int): Int ${caller} = { ${install}`
  + `with h { ${call} } };` + main;

test('a1: a callback lacking an installed label and the caller\'s M', () => {
  const source = body('with L', 'with L + M');
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'M + L + M', 'is L', write('q', 'M + L + M')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L,', 'with L'), handled('M'),
      callerNote(': Int with L + M =', 'with L + M')]
  });
  applyHint(source, 'q: Int -> Int with L,', row => `q: Int -> Int with ${row},`);
});

test('a2: the caller\'s row alone is not enough under the installation', () => {
  const source = body('with L + M', 'with L + M');
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'M + L + M', 'is L + M', write('q', 'M + L + M')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L + M,', 'with L + M'),
      handled('M'), callerNote(': Int with L + M =', 'with L + M')]
  });
  applyHint(source, 'q: Int -> Int with L + M,',
    row => `q: Int -> Int with ${row},`);
});

test('a4: a callback lacking the installed label', () => {
  const source = body('with L', 'with L');
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'M + L', 'is L', write('q', 'M + L')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L,', 'with L'), handled('M'),
      callerNote(': Int with L =', 'with L')]
  });
  applyHint(source, 'q: Int -> Int with L,', row => `q: Int -> Int with ${row},`);
});

test('a3, a5: the rows the hint prints are accepted', () => {
  accepted(body('with M + L + M', 'with L + M'));
  accepted(body('with M + L', 'with L'));
});

test('a handle installs Fail(E): its label and site are named', () => {
  const source = 'type E = E; ' + effects + 'fn a(q: Int -> Int with L, x: Int): '
    + 'Int with L = handle { q(x) } { fail(error: E) => 0 };' + main;
  const handle = 'handle { q(x) } { fail(error: E) => 0 }';
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'Fail(E) + L', 'is L', write('q', 'Fail(E) + L')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L,', 'with L'),
      [handle, handle, 'Fail(E) is handled here'],
      callerNote(': Int with L =', 'with L')]
  });
  applyHint(source, 'q: Int -> Int with L,', row => `q: Int -> Int with ${row},`);
});

test('nested withs: each installation is named, innermost first', () => {
  const inner = 'with g { q(x) }';
  const outer = `with h { ${inner} }`;
  const source = effects + 'fn a(q: Int -> Int with L, x: Int): Int with L = '
    + `{ ${install}let g = handler N { n() => 2 }; ${outer} };` + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'N + M + L', 'is L', write('q', 'N + M + L')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L,', 'with L'),
      handled('N', inner), handled('M', outer),
      callerNote(': Int with L =', 'with L')]
  });
  applyHint(source, 'q: Int -> Int with L,', row => `q: Int -> Int with ${row},`);
});

test('a named tail stays in the hint; the ambient tail does not', () => {
  const source = effects + 'fn a(q: Int -> Int with L + ...e, x: Int): Int '
    + `with L + ...e = { ${install}with h { q(x) } };` + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: here('q', 'M + L', 'is L', write('q', 'M + L + ...e')),
    at: ['q(x)'],
    notes: [calleeNote('q: Int -> Int with L + ...e,', 'with L + ...e'),
      handled('M'), callerNote(': Int with L + ...e =', 'with L + ...e')]
  });
  applyHint(source, 'q: Int -> Int with L + ...e,',
    row => `q: Int -> Int with ${row},`);
});

test('an unannotated callback under an installation', () => {
  expectDiagnostic(effects + `fn a(q: Int -> Int, x: Int): Int with L = { ${install}`
    + `with h { q(x) } };` + main, {
    code: 'E_EFFECT',
    message: here('q', 'M + L', 'has no labels', write('q', 'M + L')),
    at: ['q(x)'],
    notes: [['q: Int -> Int,', 'q', 'q\'s row is not written'], handled('M'),
      callerNote(': Int with L =', 'with L')]
  });
});

test('a function value that is not a parameter is anonymous', () => {
  expectDiagnostic(effects + keep
    + 'fn a(q: Int -> Int with L, x: Int): Int with L = '
    + `{ ${install}with h { keep(q)(x) } };` + main, {
    code: 'E_EFFECT',
    message: here('this function value', 'M + L', 'is L'),
    at: ['keep(q)(x)'],
    notes: [handled('M', 'with h { keep(q)(x) }'),
      callerNote(': Int with L =', 'with L')]
  });
});

test('a payload holding a row: the hint is anonymous', () => {
  const state = 'effect S(s) { fn get(): s; }; ';
  const payload = 'S(Int -> Int with pure)';
  expectDiagnostic(effects + state + `fn a(q: Int -> Int with ${payload}, `
    + `x: Int): Int with ${payload} = { ${install}with h { q(x) } };` + main, {
    code: 'E_EFFECT',
    message: here('q', 'M + S(Int -> Int)', 'is S(Int -> Int)'),
    at: ['q(x)'],
    notes: [calleeNote(`q: Int -> Int with ${payload},`, `with ${payload}`),
      handled('M'), callerNote(`: Int with ${payload} =`, `with ${payload}`)]
  });
});
