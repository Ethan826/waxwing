import test from 'node:test';
import assert from 'node:assert/strict';
import { rejected, rejectedAll } from './support.mjs';
import { Left, Right } from '../output/Data.Either/index.js';
import { Nothing } from '../output/Data.Maybe/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { checkProgram } from '../output/Features.Check.Outcomes/index.js';

// Task 1.2, the collecting driver (T-R0a §7, G-hide): every declaration
// is checked whatever happened to the others. The order of diagnostics
// is today's (Features/Check.purs before this task): `main`'s
// printability, then bodies in declaration order, then the program-wide
// stages (instantiation rule, then coverage), which still run only when
// the entry and every body passed. `compile` returns the first; the
// corpus-wide snapshot (r0-first-diagnostic.serial.test.mjs) pins it.
const reportOf = source => {
  const parsed = parse(source);
  assert.ok(parsed instanceof Right, 'parse failed');
  const resolved = resolve(parsed.value0);
  assert.ok(resolved instanceof Right, 'resolve failed');
  return checkProgram(resolved.value0);
};
const said = diagnostics => diagnostics.map(diagnostic =>
  `${diagnostic.code} ${diagnostic.message}`);
const boolForInt = 'E_TYPE Expected Int, found Bool';
const intForBool = 'E_TYPE Expected Bool, found Int';
const list = 'type List(a) = Nil | Cons(a, List(a)); ';
const partial = 'type T = A | B; fn g(t: T): Int = match t { A => 0 }; ';
const polymorphic = 'fn p(x: a): Int = p(Cons(x, Nil)); ';
const main = 'fn main(): Int = 0;';
const notPrintable = 'fn main(): (Int) -> Int = fn(x: Int) => x;';

test('reports each broken declaration once, in order', () => {
  const all = rejectedAll(
    'fn f(): Int = true; fn g(): Bool = 1; fn main(): Int = 0;');
  assert.deepEqual(all.map(d => d.code), ['E_TYPE', 'E_TYPE']);
  assert.ok(all[0].span.start.offset < all[1].span.start.offset);
});

test('the order: entry, bodies by declaration, then program-wide', () => {
  const cases = [
    // Declaration order, not call order.
    [`fn g(): Bool = f(); fn f(): Int = true; ${main}`,
      ['E_TYPE Expected Bool, found Int', boolForInt]],
    // The entry is judged before any body.
    [`fn f(): Int = true; ${notPrintable}`, ['E_ENTRY Expected fn main()'
      + ' with a printable result type', boolForInt]],
    // Program-wide stages run only when every body passed ...
    [`${partial}fn f(): Int = true; ${main}`, [boolForInt]],
    [`${list}${polymorphic}fn f(): Int = true; ${main}`, [boolForInt]],
    // ... and the entry passed ...
    [`${partial}${notPrintable}`, ['E_ENTRY Expected fn main() with a'
      + ' printable result type']],
    // ... and then report one: the instantiation rule before coverage.
    [`${partial}${main}`, ['E_NON_EXHAUSTIVE Missing pattern: B']],
    [`${list}${partial}${polymorphic}${main}`, ['E_SPECIALIZATION'
      + ' Recursive call to p changes its type arguments']]];
  for (const [source, expected] of cases) {
    assert.deepEqual(said(rejectedAll(source)), expected, source);
    assert.deepEqual(said([rejected(source, expected[0].split(' ')[0])]),
      [expected[0]], source);
  }
});

// AT3 (T-R0a §9): an Unresolved f (D4 today, an E_TYPE "Cannot tell")
// and a contradictory g after it are both reported; h passes. In this
// tranche each outcome is today's checker result (ruling R2), and no
// declaration has a recorded problem yet.
test('AT3: an unresolved f and a contradictory g both reported', () => {
  const source = 'fn pick2(w: { ...r, ...s }): Int = 0; '
    + 'fn wrap(k: ({ ...t }) -> Int): Int = 0; fn f(): Int = wrap(pick2); '
    + `fn g(): Int = true; fn h(): Int = 1; ${main}`;
  const cannotTell = 'E_TYPE Cannot tell what pick2\'s r and s hold; pass'
    + ' a lambda with annotated parameters in place of pick2';
  assert.deepEqual(said(rejectedAll(source)), [cannotTell, boolForInt]);
  const report = reportOf(source);
  assert.ok(report.entry instanceof Right);
  assert.deepEqual(report.outcomes.map(outcome => [outcome.name,
    outcome.today instanceof Left, outcome.problem === Nothing.value]),
  [['pick2', false, true], ['wrap', false, true], ['f', true, true],
    ['g', true, true], ['h', false, true], ['main', false, true]]);
  // The program's diagnostics are the entry's and the bodies', in order.
  assert.ok(report.program instanceof Left);
  assert.deepEqual(said(report.program.value0.map(wire)),
    [cannotTell, boolForInt]);
  assert.deepEqual(report.outcomes.filter(outcome =>
    outcome.today instanceof Left).map(outcome => outcome.today.value0),
  report.program.value0);
});

test('a passing program checks every body and the program-wide stages',
  () => {
    const report = reportOf(`fn f(): Int = 1; ${main}`);
    assert.ok(report.entry instanceof Right);
    assert.ok(report.outcomes.every(outcome => outcome.today instanceof
      Right));
    assert.ok(report.program instanceof Right);
    assert.deepEqual(said(rejectedAll(`fn f(): Bool = 1; ${main}`)),
      [intForBool]);
  });
