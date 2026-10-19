import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spanAt } from './support.mjs';
import { checkedPoly, checkRejectedAt } from './phases.mjs';

// R005 Tranche B B3 at the check phase, with no literal of two spreads
// (plan, "Test stages"): `pickR`-style signatures make `Merge` predicates
// at their uses (plan §2.1), which PureScript's cases and Sym solve as the
// arguments are checked (§2.3), re-examined after each top-level
// unification and in each settling round (§2.4, §2.9). A predicate still
// waiting at the end of a body is placeholder P5 at the use that made it;
// a contradiction a predicate caused is placeholder P2 (B5 renders D6),
// located by the user's L2 rule. Each program is checked within a time
// bound.
const pickR = 'fn pickR(p: { ...r }, q: { ...s }): { ...r, ...s } '
  + 'where r disjoint s = pickR(p, q); ';
const same = 'fn same(a: z, b: z): Int = 0; ';
const P5 = 'R005B placeholder: merge predicates still waiting at the end of '
  + 'a body are classified in Task B4';
const P2 = 'R005B placeholder: contradictions from merge predicates are '
  + 'reported in Task B5';
const BOUND_MS = 2000;

const timed = (run, source, ...rest) => {
  const started = Date.now();
  const found = run(source, ...rest);
  assert.ok(Date.now() - started < BOUND_MS, 'over the time bound');
  return found;
};
const checks = source => timed(checkedPoly, source);
const waitsAt = (source, text, nth = 0) => {
  const found = timed(checkRejectedAt, source, 'E_INTERNAL', text, nth);
  assert.equal(found.message, P5);
};
const causedAt = (source, text, nth = 0) => {
  const found = timed(checkRejectedAt, source, 'E_INTERNAL', text, nth);
  assert.equal(found.message, P2);
};

test('inside its own body the parts are rigid: case 1g', () => {
  checks(`${pickR}fn main(): Int = 0;`);
});

test('known arguments: case 1, the field read', () => {
  checks(`${pickR}fn main(): Int = `
    + '{ let x = pickR({ a: 1 }, { b: 2 }); x.a };');
});

test('one part unknown: Sym (1\') solves it either way round', () => {
  checks(`${pickR}fn main(): Int = `
    + '{ let f = fn(p) => pickR(p, { a: 1 }); 0 };');
  checks(`${pickR}fn main(): Int = `
    + '{ let f = fn(p) => pickR({ a: 1 }, p); 0 };');
});

test('both parts unknown: the predicate waits (P5) at its use', () => {
  waitsAt(`${pickR}fn main(): Int = { let f = fn(p, q) => pickR(p, q); 0 };`,
    'pickR(p, q)', 1);
});

test('a typed clash a case finds is a predicate\'s contradiction', () => {
  causedAt(`${pickR}fn want(w: { a: Bool, b: Int }): Int = 0; `
    + 'fn main(): Int = want(pickR({ a: 1 }, { b: 2 }));',
  'pickR({ a: 1 }, { b: 2 })');
});

// R10.1's limit: `p` was bound by an ordinary unification (`same`), not by
// a case, so the clash keeps the ordinary mismatch text.
test('a clash on a binding no case made keeps its own text', () => {
  const found = timed(checkRejectedAt, `${pickR}${same}fn main(): Int = { `
    + 'let f = fn(p) => { let w = pickR(p, { b: 2 }); '
    + 'same(w, { a: true, b: 3 }) }; f({ a: 1 }) };', 'E_TYPE', '{ a: 1 }');
  assert.equal(found.message, 'Expected { a: Bool }, found { a: Int }');
});

test('a generic caller: rigid parts solve by 1g and 1\'', () => {
  const lacking = 'fn g(x: { ...u }): Int where u lacks { a } = ';
  checks(`${pickR}${lacking}{ let y = pickR(x, { a: 1 }); y.a }; `
    + 'fn main(): Int = 0;');
  checks(`${pickR}${lacking}{ let y = pickR({ a: 1 }, x); y.a }; `
    + 'fn main(): Int = 0;');
});

test('a generic caller without the lack is D3\'\' (approved text)', () => {
  const found = timed(checkRejectedAt, `${pickR}fn g(x: { ...u }): Int = `
    + '{ let y = pickR(x, { a: 1 }); y.a }; fn main(): Int = 0;', 'E_TYPE',
  '{ a: 1 }');
  assert.equal(found.message, 'u may already have field a');
});

const inner = 'fn inner(w: { a: { ...p, ...q } }, x: { ...p }, y: { ...q }): '
  + 'Int where p disjoint q = 0; ';

test('a nested row desugars at the use and is solved with it', () => {
  checks(`${inner}fn main(): Int = `
    + 'inner({ a: { x: 1, y: 2 } }, { x: 1 }, { y: 2 });');
  causedAt(`${inner}fn main(): Int = `
    + 'inner({ a: { x: 1 } }, { x: 1 }, { y: 2 });', '{ y: 2 }');
});

test('an occurs failure through a case is a contradiction, not the guard',
  () => {
    causedAt(`${pickR}${same}fn main(): Int = `
      + '{ let h = fn(x) => same(x, pickR(x, { a: x })); 0 };',
    'pickR(x, { a: x })');
  });

// The joint fixpoint of effect settling and re-examination (plan §2.9),
// both directions.
const handled = 'let r = handle Fail.fail(pickR(u, { c: 1 })) '
  + '{ fail(e: { a: { b: Int }, c: Int }) => 0 }; ';

test('a predicate\'s binding decides a postponed Fail pair', () => {
  checks(`${pickR}fn main(): Int = handle { let k = fn(x, y) => `
    + 'Fail.fail(pickR(x, y)); k({ a: 1 }, { b: 2 }) } '
    + '{ fail(e: { a: Int, b: Int }) => e.a };');
});

test('a settling retry unblocks a waiting predicate', () => {
  checks(`${pickR}${same}fn main(): Int = { let h = fn(q, z, u) => { `
    + `let v = pickR(q, z); ${handled}same(u, { a: q }) }; 0 };`);
  waitsAt(`${pickR}fn main(): Int = { let h = fn(q, z, u) => `
    + '{ let v = pickR(q, z); 0 }; 0 };', 'pickR(q, z)');
});

// Found while settling, outside any requirement: located by the L2 rule
// at the latest written participant, `want(v)`'s argument.
test('a clash a settling retry exposes is located by the L2 rule', () => {
  const source = `${pickR}${same}fn want(w: { b: Bool }): Int = 0; `
    + 'fn main(): Int = { let h = fn(q, z, u) => { let v = pickR(q, z); '
    + `${handled}let x = same(u, { a: q }); want(v) }; 0 };`;
  causedAt(source, 'v', occurrencesBefore(source, 'v',
    source.indexOf('want(v)') + 'want('.length));
});

// The same conflict with its statements rearranged (in the third the
// payload's family is known at the handler, so the clash may surface in
// the handler's unification rather than while settling): in each, the
// L2 rule locates it at the corresponding logical site, `want`'s
// argument, wherever that now is (the same expression, not one offset).
test('rearranged, the same conflict keeps its logical location', () => {
  const head = `${pickR}${same}fn want(w: { b: Bool }): Int = 0; `
    + 'fn main(): Int = { let h = fn(q, z, u) => { let v = pickR(q, z); ';
  for (const body of [
    `${handled}let x = same(u, { a: q }); want(v) }; 0 };`,
    `let y = want(v); ${handled}same(u, { a: q }) }; 0 };`,
    `let y = want(v); let x = same(u, { a: q }); ${handled}0 }; 0 };`,
  ]) {
    const source = head + body;
    causedAt(source, 'v', occurrencesBefore(source, 'v',
      source.indexOf('want(v)') + 'want('.length));
  }
});

// How many times `text` occurs before `offset`: the nth of the one there.
const occurrencesBefore = (source, text, offset) => {
  let count = 0;
  for (let at = source.indexOf(text); at !== -1 && at < offset;
    at = source.indexOf(text, at + 1)) count++;
  return count;
};

test('a waiting predicate is reported before the Fail family it leaves open',
  () => {
    waitsAt(`${pickR}fn main(): Int = handle { let k = fn(x, y) => `
      + 'Fail.fail(pickR(x, y)); 0 } { fail(e: { a: Int, b: Int }) => e.a };',
    'pickR(x, y)');
  });

// Plan §2.2: a predicate's `site` is diagnostic metadata. No case reads
// it, and the rescan reads it only to locate a failure (the L2 rule).
test('no solving step reads a predicate\'s site', () => {
  const module = name => readFileSync(
    `src/Features/Check/RowMerge/${name}.purs`, 'utf8');
  assert.ok(!/site/.test(module('Cases')));
  const improve = module('Improve');
  const located = improve.slice(improve.indexOf('located ∷'),
    improve.indexOf('latest ∷'));
  assert.ok(located.includes('merge.site'));
  assert.equal(improve.split('.site').length - 1,
    located.split('.site').length - 1);
});

// A handler's own rows (what its clauses may perform) hold labels whose
// arguments can be records of two tails; they are desugared at the use
// like any other row (before the follow-up they reached the guard).
const effects = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect State(s) { fn get(): s; }; ';
const stateOf = 'fn f(h: Handler(Log with State({ ...r, ...t })), '
  + 'x: { ...r }, y: { ...t }): Int where r disjoint t = 0; ';

test('a record of two tails in a handler\'s row is desugared', () => {
  const mk = record => `fn mk(): Handler(Log with State(${record})) = mk(); `;
  checks(`${effects}${stateOf}${mk('{ a: Int, b: Int }')}`
    + 'fn main(): Int = f(mk(), { a: 1 }, { b: 2 });');
  causedAt(`${effects}${stateOf}${mk('{ a: Int }')}`
    + 'fn main(): Int = f(mk(), { a: 1 }, { b: 2 });', '{ b: 2 }');
  waitsAt(`${effects}fn g(h: Handler(Log with State({ ...r, ...t }))): Int `
    + `= 0; ${mk('{ a: Int }')}fn main(): Int = g(mk());`, 'g(mk())');
});
