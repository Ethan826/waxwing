import test from 'node:test';
import assert from 'node:assert/strict';
import { checked } from './support.mjs';
import { assertDiagnostic, wired } from './r005b-support.mjs';

// R005 Tranche B Task 3: persistent disjointness on single-tail rows, no
// spread literal (design §3, §4; plan Task 3). Approved texts: D2 `Field
// a is in both records: r disjoint s`, D3 `r and s are not known to be
// disjoint` with the hint `require r disjoint s in the signature`, D3'
// `r is in both records and may have fields`, D3'' `s may already have
// field a`, D1 `a is not allowed here: r lacks { a }`.
const g = 'fn g(a: { ...r }, b: { ...s }): Int where r disjoint s = 0; ';
const at = (text, nth = 0) => ({ text, nth });
const note = (message, text, nth = 0) => ({ message, at: at(text, nth) });
const clause = (nth = 0) => note('required here', 'r disjoint s', nth);
const rejects = (source, message, primary, notes) =>
  assertDiagnostic(source, { code: 'E_TYPE', message, at: primary, notes });
const d3 = (one, other) => `${one} and ${other} are not known to be `
  + `disjoint; require ${one} disjoint ${other} in the signature`;

test('a rigid passed twice is D3\'', () => {
  rejects(`${g}fn h(p: { ...t }): Int = g(p, p); fn main(): Int = 0;`,
    't is in both records and may have fields', at('p', 2), [clause()]);
  rejects(`${g}fn h(p: { ...r }): Int = g(p, p); fn main(): Int = 0;`,
    'r is in both records and may have fields', at('p', 2), [clause()]);
});

test('one record passed twice is D2, first written where it arrived', () => {
  rejects(`${g}fn main(): Int = { let p = { x: 1 }; g(p, p) };`,
    'Field x is in both records: r disjoint s', at('p', 2),
    [note('first written here', 'p', 1), clause()]);
});

test('a wrapper without the fact is D3 inside it, noted at g', () => {
  rejects(`${g}fn w(a: { ...u }, b: { ...v }): Int = g(a, b); `
    + 'fn main(): Int = 0;', d3('u', 'v'), at('b', 2), [clause()]);
});

test('a wrapper with the fact is refused at its caller', () => {
  const source = `${g}fn w(a: { ...u }, b: { ...v }): Int `
    + 'where u disjoint v = g(a, b); '
    + 'fn main(): Int = w({ x: 1 }, { x: 2 });';
  rejects(source, 'Field x is in both records: u disjoint v',
    at('{ x: 2 }'), [note('first written here', '{ x: 1 }'),
      note('required here', 'u disjoint v')]);
  checked(source.replace('{ x: 2 }', '{ y: 2 }'));
});

test('a decomposed lack keeps its clause: D2 unless a lacks names it', () => {
  const call = 'fn main(): Int = g({ x: 1 }, { x: 2 });';
  rejects(`${g}${call}`, 'Field x is in both records: r disjoint s',
    at('{ x: 2 }'), [note('first written here', '{ x: 1 }'), clause()]);
  const lacking = 'fn g(a: { ...r }, b: { ...s }): Int '
    + 'where r disjoint s, s lacks { x } = 0; ';
  rejects(`${lacking}${call}`, 'x is not allowed here: s lacks { x }',
    at('{ x: 2 }'), [note('required here', 'x', 0)]);
});

// `{}` is Unit's literal; the empty record value is a removal's result.
test('a meta apart from itself is the empty row', () => {
  const lambda = '{ let f = fn(p) => g(p, p); ';
  checked(`${g}fn main(): Int = ${lambda}f({ x: 1 } without { x }) };`);
  checked(`${g}fn h(e: {}): Int = ${lambda}f(e) }; fn main(): Int = 0;`);
  const found = wired(`${g}fn main(): Int = ${lambda}f({ x: 1 }) };`);
  assert.equal(found?.code, 'E_TYPE');
  const free = 'fn g(a: { ...r }, b: { ...s }): Int = 0; ';
  checked(`${free}fn main(): Int = ${lambda}f({ x: 1 }) };`);
});

const tagged = clauses => `${g}fn tagged(p: { id: Int, ...r }, q: { ...s }): `
  + `Int${clauses} = g(p, q); fn main(): Int = 0;`;

test('a label beside a tail against the other tail is D3\'\'', () => {
  rejects(tagged(''), 's may already have field id', at('q', 1),
    [note('s is introduced here', '...s', 1), clause()]);
});

test('with the lack written, the tails must still be disjoint (D3)', () => {
  rejects(tagged(' where s lacks { id }'), d3('r', 's'), at('q', 1),
    [clause()]);
  checked(tagged(' where s lacks { id }, r disjoint s'));
});

// Decision 14 (the user, 2026-10-17): a required lack on a record argument
// holds for every component of `{ ...r, ...s }` (one passed lacks fact per
// tail), and that alone never establishes `r disjoint s`. Each test below
// fails for exactly its own reason, through the declared-type wrapper `W`,
// in a body type (Resolve) and at a call (Check).
const types = 'type Holder(...r) = Holder({ x: Int, ...r }); '
  + 'type W(...a, ...b) = W(Holder({ ...a, ...b })); ';
const annotated = (clauses, written) => `${types}fn c(a: { ...u }, `
  + `b: { ...v }): Int${clauses} = { let f = fn(h: ${written}) => 0; 0 }; `
  + 'fn main(): Int = 0;';
const k = 'fn k(a: { ...r }, b: { ...s }, w: W(...r, ...s)): Int = 0; ';
// The argument `text` of the call `k(a, b)`, as a `{ text, nth }`.
const inCall = (source, text) => {
  const call = source.indexOf('k(a, b)');
  let nth = 0;
  for (let found = source.indexOf(text); found < call;
    found = source.indexOf(text, found + 1)) nth++;
  return at(text, nth);
};
// The wording of an implied lack's refusal at a call (Tranche A's shape
// text) may improve in a later design (D1 is for written clauses only);
// that the call is REJECTED is mandatory, and `rejects` asserts it.
const calledRejects = (clauses, message, text, notes) => {
  const source = called(clauses);
  rejects(source, message, inCall(source, text), notes);
};
const called = clauses => `${types}${k}fn c(a: { ...u }, b: { ...v }): `
  + `Int${clauses} = { let h = k(a, b); 0 }; fn main(): Int = 0;`;

for (const written of ['W(...u, ...v)', 'Holder({ ...u, ...v })']) {
  test(`every tail must lack the label, disjointness given: ${written}`, () => {
    rejects(annotated(' where u disjoint v, u lacks { x }', written),
      'v may already have field x', at('...v', 1),
      [note('v is introduced here', '...v', 0)]);
    rejects(annotated(' where u disjoint v, v lacks { x }', written),
      'u may already have field x', at('...u', 1),
      [note('u is introduced here', '...u', 0)]);
    checked(annotated(' where u disjoint v, u lacks { x }, v lacks { x }',
      written));
  });

  test(`lacking the label is no disjointness: ${written}`, () => {
    rejects(annotated(' where u lacks { x }, v lacks { x }', written),
      d3('u', 'v'), at('...v', 1), []);
  });
}

test('at a call every tail must lack the label, disjointness given', () => {
  calledRejects(' where u disjoint v, u lacks { x }',
    'Expected { ..._ }, found { ...v }', 'b', []);
  calledRejects(' where u disjoint v, v lacks { x }',
    'Expected { ..._ }, found { ...u }', 'a', []);
  checked(called(' where u disjoint v, u lacks { x }, v lacks { x }'));
});

test('at a call lacking the label is no disjointness', () => {
  calledRejects(' where u lacks { x }, v lacks { x }', d3('u', 'v'), 'b',
    [note('required here', '...s', 1)]);
  checked(called(' where u lacks { x }, v lacks { x }, u disjoint v'));
});

test('at a call the wrapper\'s pair holds for metas: D2', () => {
  rejects(`${types}${k}fn main(): Int = { let h = k({ y: 1 }, { y: 2 }); 0 };`,
    'Field y is in both records: r disjoint s', at('{ y: 2 }'),
    [note('first written here', '{ y: 1 }'), note('required here', '...s', 1)]);
});

// The pair lives in the substitution, keyed by the use's metas, so it
// holds however the function is passed (design §1.5), and a constructor's
// fields imply it as a signature's types do (design §1.4).
test('the pair survives a partial application and a reference', () => {
  const twice = `${g}fn main(): Int = { let add = g({ x: 1 }); `;
  rejects(`${twice}add({ x: 5 }) };`, 'Field x is in both records: '
    + 'r disjoint s', at('{ x: 5 }'),
  [note('first written here', '{ x: 1 }'), clause()]);
  checked(`${twice}add({ y: 5 }) };`);
  rejects(`${g}fn main(): Int = { let h = g; h({ x: 1 }, { x: 2 }) };`,
    'Field x is in both records: r disjoint s', at('{ x: 2 }'),
    [note('first written here', '{ x: 1 }'), clause()]);
});

test('a constructor\'s fields imply the pair at its use', () => {
  const use = right => `${types}fn ap(f: (h) -> W({ y: Int }, ${right})): `
    + 'Int = 0; fn main(): Int = ap(W);';
  rejects(use('{ y: Int }'), 'Field y is in both records: a disjoint b',
    at('W', 3), [note('first written here', 'W', 3),
      note('required here', '...b', 1)]);
  checked(use('{ z: Int }'));
});
