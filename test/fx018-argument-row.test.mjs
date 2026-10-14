import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { accepted, applyHint, argument, effects, keep, main, write }
  from './fx018-support.mjs';
import { diagnose, expectDiagnostic } from './fx-diagnostics-support.mjs';

// Part (b): a function passed where the parameter's row has a label the
// function's row lacks. Probes b1-b5 are the controller's (sdd/fx018).
const take = 'fn take(f: Int -> Int with L + M): Int with L + M = f(1); ';
const of = 'take\'s parameter f';
const qNote = ['q: Int -> Int with L)', 'with L', 'q\'s row is written here'];
const fNote = ['f: Int -> Int with L + M)', 'with L + M',
  'f\'s row is written here'];
const caller = 'fn a(q: Int -> Int with L): Int with L + M = take(q);';
const hintText = (callee, row) => write(callee, row);

test('b1: q lacks M, which take\'s parameter writes', () => {
  const source = effects + take + caller + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: argument('q', of, 'L + M', 'is L', hintText('q', 'L + M')),
    at: ['take(q)', 'q'],
    notes: [qNote, fNote]
  });
  applyHint(source, 'q: Int -> Int with L)',
    row => `q: Int -> Int with ${row})`);
});

test('b2, b4, b5: accepted programs stay accepted', () => {
  accepted(effects + take
    + 'fn a(q: Int -> Int with L + M): Int with L + M = take(q);' + main);
  accepted(effects + 'fn take(f: Int -> Int with L): Int with L = f(1); '
    + 'fn a(q: Int -> Int with L + M): Int with L + M = take(q);' + main);
  accepted(effects + take
    + 'fn a(x: Int): Int with L + M = take(fn(y: Int) => L.l());' + main);
});

test('b3: the argument performing more keeps the old message', () => {
  const { diagnostic } = diagnose(effects + take
    + 'fn a(q: Int -> Int with M + L + M): Int with L + M = take(q);' + main);
  assert.equal(diagnostic.message,
    'a performs M, which its signature does not allow');
});

test('an unannotated argument has no labels; its name is the note', () => {
  const source = effects + take + 'fn a(q: Int -> Int): Int with L + M = '
    + 'take(q);' + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: argument('q', of, 'L + M', 'has no labels',
      hintText('q', 'L + M')),
    at: ['take(q)', 'q'],
    notes: [['q: Int -> Int)', 'q', 'q\'s row is not written'], fNote]
  });
});

test('a call result is an anonymous function value', () => {
  expectDiagnostic(effects + keep + take
    + 'fn a(q: Int -> Int with L): Int with L + M = take(keep(q));' + main, {
    code: 'E_EFFECT',
    message: argument('this function value', of, 'L + M', 'is L'),
    at: ['take(keep(q))', 'keep(q)'],
    notes: [fNote]
  });
});

test('a let-bound function value is anonymous', () => {
  expectDiagnostic(effects + take + 'fn a(q: Int -> Int with L): Int '
    + 'with L + M = { let g = q; take(g) };' + main, {
    code: 'E_EFFECT',
    message: argument('this function value', of, 'L + M', 'is L'),
    at: ['take(g)', 'g'],
    notes: [fNote]
  });
});

test('a named tail of the argument stays in the hint', () => {
  const source = effects + take + 'fn a(q: Int -> Int with L + ...e): Int '
    + 'with L + M + ...e = take(q);' + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: argument('q', of, 'L + M', 'is L', hintText('q', 'L + M + ...e')),
    at: ['take(q)', 'q'],
    notes: [['q: Int -> Int with L + ...e)', 'with L + ...e',
      'q\'s row is written here'], fNote]
  });
  applyHint(source, 'q: Int -> Int with L + ...e)',
    row => `q: Int -> Int with ${row})`);
});

test('a Fail payload label in the parameter row', () => {
  const source = 'type E = E; ' + effects
    + 'fn take(f: Int -> Int with L + Fail(E)): Int with L + Fail(E) = f(1); '
    + 'fn a(q: Int -> Int with L): Int with L + Fail(E) = take(q);' + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: argument('q', of, 'L + Fail(E)', 'is L',
      hintText('q', 'L + Fail(E)')),
    at: ['take(q)', 'q'],
    notes: [qNote, ['f: Int -> Int with L + Fail(E))', 'with L + Fail(E)',
      'f\'s row is written here']]
  });
  applyHint(source, 'q: Int -> Int with L)',
    row => `q: Int -> Int with ${row})`);
});

test('a constructor field has no parameter name', () => {
  expectDiagnostic(effects + 'type Box = Box(Int -> Int with L + M); '
    + 'fn a(q: Int -> Int with L): Box with L + M = Box(q);' + main, {
    code: 'E_EFFECT',
    // The field's row is closed: no row written for q can end like it.
    message: argument('q', 'the parameter it is passed to', 'L + M', 'is L'),
    at: ['Box(q)', 'q'],
    notes: [qNote]
  });
});

test('a payload holding a row: the hint is anonymous', () => {
  const state = 'effect S(s) { fn get(): s; }; ';
  expectDiagnostic(effects + state
    + 'fn take(f: Int -> Int with S(Int -> Int with pure)): Int = 1; '
    + 'fn a(q: Int -> Int with L): Int = take(q);' + main, {
    code: 'E_EFFECT',
    message: argument('q', of, 'S(Int -> Int)', 'is L'),
    at: ['take(q)', 'q'],
    notes: [qNote, ['f: Int -> Int with S(Int -> Int with pure))',
      'with S(Int -> Int with pure)', 'f\'s row is written here']]
  });
});

test('a caller wider than the callee: the hint would not fix the call', () => {
  const source = effects + take + 'fn a(q: Int -> Int with L): Int '
    + 'with N + L + M = take(q);' + main;
  expectDiagnostic(source, {
    code: 'E_EFFECT',
    message: argument('q', of, 'L + M', 'is L'),
    at: ['take(q)', 'q'],
    notes: [qNote, fNote]
  });
  assert.ok(!(compile(source.replace('q: Int -> Int with L)',
    'q: Int -> Int with L + M)')) instanceof Right));
});
