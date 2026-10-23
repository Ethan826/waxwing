import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Bool, Int, Text, eq, fv, nodeType, rec, ruleEntries, translated,
  tv, typeAt, varInfo } from './r0-translator-support.mjs';
import { exprShapes } from './r0-translator-exprs.mjs';
import { patternShapes } from './r0-translator-records.mjs';

// RT1's translator, rule by rule (Task 3.3): records and patterns (T-R0b
// §3.3, §3.4: E24-E28, P1-P7), and G-total over the resolved syntax.
const program = translated(`
fn lit(): { a: Int, b: Text } = { b: "x", a: 1 };
fn ext(p: { a: Int, ...r }): { a: Int, c: Bool, ...r } where r lacks { c } =
  { ...p, c: true };
fn acc(p: { a: Int, ...r }): Int = p.a;
fn upd(p: { a: Int, ...r }): { a: Int, ...r } = p { a = 2 };
fn rm(p: { a: Int, b: Int, ...r }): { ...r } = p without { a, b };
fn pats(p: { a: Int, b: Bool }): Int = match p {
  { a: 1, b: true } => 0, { a: x, ... } => x, { a, ...rest } => a };
fn binds(p: { a: Int, b: Bool }): { b: Bool } = match p {
  { a, ...rest } => rest };
fn wild(n: Int): Int = match n { _ => 0, k => k, 3 => 3 };
fn main(): Int = 0;
`);
const short = entries => entries.map(([list, path, index, row, , value]) =>
  [list, path, index, row, value]);
const rigidA = rec({ a: Int }, [{ rigid: 0 }]);

test('E24: a closed literal of its fields, with no entries', () => {
  assert.deepEqual(typeAt(program.lit, 'body:'), rec({ a: Int, b: Text }));
  assert.deepEqual(ruleEntries(program.lit, 'E24'), []);
});

test('E25: the spread\'s atom, then the result\'s', () => {
  const spread = fv('body:', { spread: 1 });
  assert.deepEqual(short(ruleEntries(program.ext, 'E25')), [
    ['b', 'body:', 0, 'B2', eq(rigidA, rec({}, [spread]))],
    ['b', 'body:', 1, 'B2', eq(tv(fv('body:', 'res')),
      rec({ c: Bool }, [spread]))]]);
  assert.deepEqual(varInfo(program.ext, spread),
    ['row', 'exists', 'E25', 'auxiliary']);
});

test('E26: access through `{ l: ⟨p, field l⟩, ...⟨p, rest⟩ }`', () => {
  const field = fv('body:', { field: 'a' });
  assert.deepEqual(short(ruleEntries(program.acc, 'E26')), [['b', 'body:',
    0, 'B4', eq(rigidA, rec({ a: tv(field) }, [fv('body:', 'rest')]))]]);
  assert.deepEqual(varInfo(program.acc, field),
    ['type', 'exists', 'E26', nodeType('body:')]);
  assert.deepEqual(varInfo(program.acc, fv('body:', 'rest'))[3], 'auxiliary');
});

test('E27: per updated label, the receiver and the new value', () => {
  const upd = fv('body:', { upd: 'a' });
  assert.deepEqual(short(ruleEntries(program.upd, 'E27')), [
    ['b', 'body:', 0, 'B7', eq(rigidA,
      rec({ a: tv(upd) }, [fv('body:', { updrest: 'a' })]))],
    ['b', 'body:', 1, 'B7', eq(Int, tv(upd))]]);
  assert.deepEqual(typeAt(program.upd, 'body:'), rigidA);
});

test('E28: removal of every label; the result is `{ ...⟨p, rest⟩ }`', () => {
  const field = label => tv(fv('body:', { field: label }));
  const rest = fv('body:', 'rest');
  assert.deepEqual(short(ruleEntries(program.rm, 'E28')), [['b', 'body:', 0,
    'B8', eq(rec({ a: Int, b: Int }, [{ rigid: 0 }]),
      rec({ a: field('a'), b: field('b') }, [rest]))]]);
  assert.deepEqual(typeAt(program.rm, 'body:'), rec({}, [rest]));
});

test('P1-P3: wildcard, binder and literal patterns', () => {
  const { wild } = program;
  assert.deepEqual(['P1', 'P2'].flatMap(rule => ruleEntries(wild, rule)), []);
  assert.deepEqual(typeAt(wild, 'body:Match/arms/1/body'), Int);
  assert.deepEqual(short(ruleEntries(wild, 'P3')),
    [['b', 'body:Match/arms/2/pattern', 0, 'B1', eq(Int, Int)]]);
});

test('P5-P7: closed, ignored and named rests', () => {
  const arm = index => `body:Match/arms/${index}/pattern`;
  const field = (index, label) => tv(fv(arm(index), { field: label }));
  const scrutinee = rec({ a: Int, b: Bool });
  assert.deepEqual(short(ruleEntries(program.pats, 'P5')), [['b', arm(0), 0,
    'B12', eq(scrutinee, rec({ a: field(0, 'a'), b: field(0, 'b') }))]]);
  assert.deepEqual(short(ruleEntries(program.pats, 'P6')), [['b', arm(1), 0,
    'B11', eq(scrutinee, rec({ a: field(1, 'a') },
      [fv(arm(1), 'rest')]))]]);
  assert.deepEqual(short(ruleEntries(program.pats, 'P7')), [['b', arm(2), 0,
    'B10', eq(scrutinee, rec({ a: field(2, 'a') },
      [fv(arm(2), 'rest')]))]]);
  const sub = `${arm(0)}/Record/fields/0/pattern`;
  assert.deepEqual(short(ruleEntries(program.pats, 'P3'))[0],
    ['b', sub, 0, 'B1', eq(field(0, 'a'), Int)]);
  assert.deepEqual(varInfo(program.pats, fv(arm(0), { field: 'a' }))[3],
    { patternType: { root: 'body',
      steps: ['Match', 'arms', 0, 'pattern', 'Record', 'fields', 0,
        'pattern'] } });
  assert.deepEqual(varInfo(program.pats, fv(arm(1), 'rest'))[3], 'auxiliary');
  assert.deepEqual(varInfo(program.pats, fv(arm(2), 'rest'))[3],
    { restType: { root: 'body', steps: ['Match', 'arms', 2, 'pattern'] } });
  assert.deepEqual(typeAt(program.binds, 'body:Match/arms/0/body'),
    rec({}, [fv(arm(0), 'rest')]));
});

// G-total (§2.4): every constructor of Resolved.Expr (36) and Pattern (6)
// reaches a rule, read from the declarations' source; Item and Rest are
// matched by name in their rules (E16, P5-P7).
const constructors = (file, type) => {
  const source = readFileSync(new URL(`../src/Domain/${file}`,
    import.meta.url), 'utf8');
  const block = source.split(`data ${type}\n`)[1].split('\n\n')[0];
  return [...block.matchAll(/^ {2}[=|] ([A-Z]\w*)/gm)]
    .map(match => match[1]);
};

test('G-total: every Expr and Pattern constructor has a rule', () => {
  const expressions = constructors('Resolved.purs', 'Expr');
  const patterns = constructors('Resolved/Core.purs', 'Pattern');
  assert.deepEqual([expressions.length, patterns.length], [36, 6]);
  assert.deepEqual(exprShapes.map(shape => shape.name.replace('$$', ''))
    .sort(), [...expressions].sort());
  assert.deepEqual(patternShapes.map(shape => shape.name).sort(),
    [...patterns].sort());
});
