import test from 'node:test';
import assert from 'node:assert/strict';
import { rightOrThrow, load, problemsOf, resolved }
  from './r0-generate-support.mjs';
import { stableStringify } from './r0-canonical.mjs';

// AT13, independence (T-R0a §9 AT13; T-R0b G-local and §10; R0 tranche
// Task 3.4). Changing `f`'s body, not its signature, leaves `g`'s
// recorded problem and static refusals byte-equal, including when the
// change adds a call that merges `f` and `g` into one recursive
// component: generation reads callee signatures only, and `adm` holds
// sites with no component flag (T-R0b §1, §10). The verdict half waits
// for decision (Task 4.x).
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const g = 'fn g(p: { a: Int, ...r }): Int = p.a + f(1) + later(p);\n';
const later = 'fn later(q: { ...s }): Int = 0;\n';
const main = 'fn main(): Int = 0;\n';
// [what changes, f before, f after]
const pairs = [
  ['a body without calls', 'fn f(x: Int): Int = x + 1;',
    'fn f(x: Int): Int = { let y = x + 2; y + y };'],
  ['a call to g: one recursive component',
    'fn f(x: Int): Int = x + 1;', 'fn f(x: Int): Int = g({ a: x }) + 1;'],
  ['a body today\'s checker refuses', 'fn f(x: Int): Int = x + 1;',
    'fn f(x: Int): Int = true;'],
  ['a call to a callee g also calls', 'fn f(x: Int): Int = x;',
    'fn f(x: Int): Int = { let m = later({ a: 1, b: 2 }); x };']
];

const gOf = source => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const found = problemsOf(program).find(item => item.decl.name === 'g');
  const statics = rightOrThrow(
    Generate.staticRules(tables)(signatures)(found.decl), 'g');
  return [stableStringify(found.problem),
    statics.map(item => item.constructor.name)];
};

for (const [change, before, after] of pairs) {
  test(`f's body changed (${change}): g's problem is unchanged`, () => {
    // `f` after `g`: g's id, paths and spans stay where they were.
    const program = f => `${g}${later}${f}\n${main}`;
    const [mine, theirs] = [gOf(program(before)), gOf(program(after))];
    assert.deepEqual(mine, theirs);
    assert.equal(JSON.parse(mine[0]).adm.length, 2, 'g\'s two call sites');
  });
}

// A control: the comparison sees a change to g's own body.
test('control: changing g itself changes its problem', () => {
  const source = body => `${body}${later}fn f(x: Int): Int = x;\n${main}`;
  assert.notDeepEqual(gOf(source(g)), gOf(source(
    'fn g(p: { a: Int, ...r }): Int = p.a + f(true) + later(p);\n')));
});
