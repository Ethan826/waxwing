import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf } from './r0-probe-support.mjs';

// Task 0.4 (G-ValidR): today's printability and comparability, the
// judgements T-R0b §5.4's ground rule `ReqG` must agree with
// (Check/Printable.purs, Check/Comparable.purs, Check.purs
// printableEntry, Specialize/Printable.purs checkSites; all three read
// Check/Functional.purs containsFunction). A characterization: it pins
// the stage, code and exact text of each case and decides nothing.
// docs/plans/r0-validr-draft.md §2 reads these cases. No shared
// declaration prints or compares, so a changed rule fails only the
// cases it touches.
const declarations = [
  'type Box(a) = Box(a -> a);',
  'type F = F(Int -> Int);',
  'type Outer = Outer(Box(Int));',
  'type Wrap(a) = Wrap(a);',
  'type Tag(a) = Tag(Int);',
  'type L(a) = N | C(a, L(a));',
  'effect Log { fn log(x: Int): Unit; };',
  'fn inc(x: Int): Int = x + 1;'
].join(' ');
// A generic print, added only to the cases at a rigid variable.
const p = 'fn p(item: a): Text = show(item);';

const printable = found => `Expected a printable value, found ${found}`;
const comparable = found => `Type ${found} is not comparable`;
const entry = 'Expected fn main() with a printable result type';
const ok = ['compiled', null, null];
const atCheck = text => ['check', 'E_TYPE', text];
const atSpecialize = text => ['specialize', 'E_TYPE', text];
const atEntry = ['check', 'E_ENTRY', entry];
const tag = ty => `fn t(): Tag(${ty}) = Tag(1);`;
const handler = 'handler Log { log(x) => () }';
const open = 'fn s(r: { a: Int, ...r }): Text = show(r);';

// Each case: a title and rows [source after the declarations,
// [phase, code, text]]; one test per case.
const cases = [
  ['a holder type at a function-free argument, Box(Int)', [
    ['fn main(): Text = show(Box(inc));', atCheck(printable('Box(Int)'))],
    ['fn main(): Unit with Console = Console.print(Box(inc));',
      atCheck(printable('Box(Int)'))],
    ['fn main(): Int = crash(Box(inc));', atCheck(printable('Box(Int)'))],
    ['fn main(): Bool = Box(inc) == Box(inc);',
      atCheck(comparable('Box(Int)'))]]],
  ['a holder type of no parameters, F', [
    ['fn main(): Text = show(F(inc));', atCheck(printable('F'))],
    ['fn main(): Bool = F(inc) == F(inc);', atCheck(comparable('F'))]]],
  ['a holder through the fixed point, Outer', [
    ['fn main(): Text = show(Outer(Box(inc)));',
      atCheck(printable('Outer'))]]],
  ['a type that stores its argument, Wrap, at each argument', [
    ['fn main(): Text = show(Wrap(1));', ok],
    ['fn main(): Bool = Wrap(1) == Wrap(1);', ok],
    ['fn main(): Text = show(Wrap(inc));',
      atCheck(printable('Wrap(Int -> Int)'))],
    ['fn main(): Bool = Wrap(inc) == Wrap(inc);',
      atCheck(comparable('Wrap(Int -> Int)'))],
    ['fn main(): Text = show(Wrap(Box(inc)));',
      atCheck(printable('Wrap(Box(Int))'))]]],
  ['a phantom argument counts, Tag', [
    [`${tag('Int')} fn main(): Text = show(t());`, ok],
    [`${tag('Int -> Int')} fn main(): Text = show(t());`,
      atCheck(printable('Tag(Int -> Int)'))],
    [`${tag('Int -> Int')} fn main(): Bool = t() == t();`,
      atCheck(comparable('Tag(Int -> Int)'))],
    [`${tag('Box(Int)')} fn main(): Text = show(t());`,
      atCheck(printable('Tag(Box(Int))'))],
    [`${tag('Box(Int)')} fn main(): Bool = t() == t();`,
      atCheck(comparable('Tag(Box(Int))'))]]],
  ['heads outside the declared types', [
    ['fn main(): Text = show(inc);', atCheck(printable('Int -> Int'))],
    ['fn main(): Bool = inc == inc;', atCheck(comparable('Int -> Int'))],
    [`fn main(): Text = show(${handler});`,
      atCheck(printable('Handler(Log)'))],
    ['fn main(): Text = show({ f: inc });',
      atCheck(printable('{ f: Int -> Int }'))],
    ['fn main(): Bool = () == ();', ok],
    ['fn main(): Bool = "a" < "b";', ok],
    ['fn main(): Bool = { a: 1 } == { a: 2 };', ok]]],
  ['main returning each: E_ENTRY exactly where show is refused', [
    ['fn main(): Box(Int) = Box(inc);', atEntry],
    ['fn main(): F = F(inc);', atEntry],
    ['fn main(): Outer = Outer(Box(inc));', atEntry],
    ['fn main(): Wrap(Int) = Wrap(1);', ok],
    ['fn main(): Wrap(Int -> Int) = Wrap(inc);', atEntry],
    ['fn main(): Tag(Int) = Tag(1);', ok],
    ['fn main(): Tag(Int -> Int) = Tag(1);', atEntry],
    ['fn main(): Tag(Box(Int)) = Tag(1);', atEntry],
    ['fn main(): Int -> Int = inc;', atEntry],
    [`fn main(): Handler(Log) = ${handler};`, atEntry],
    ['fn main(): { f: Int -> Int } = { f: inc };', atEntry],
    ['fn main(): Int = 1;', ok]]],
  // No foreign base type can be written (docs/language.md, I001
  // Proposed), so a value outside Waxwing's bases reaches a judgement
  // only as a rigid variable's instance: the next cases stand in.
  ['print at a rigid variable: accepted at check, judged per key', [
    [`${p} fn main(): Int = 1;`, ok],
    [`${p} fn main(): Text = p(1);`, ok],
    [`${p} fn main(): Text = p(inc);`,
      atSpecialize(printable('Int -> Int'))],
    [`${p} fn main(): Text = p(Box(inc));`,
      atSpecialize(printable('Box(Int)'))],
    [`${p} fn r(x: b): Text = p(x); fn main(): Text = r(inc);`,
      atSpecialize(printable('Int -> Int'))]]],
  ['an uncalled caller of p(inc): non-generic judged, generic not', [
    [`${p} fn q(): Text = p(inc); fn main(): Int = 1;`,
      atSpecialize(printable('Int -> Int'))],
    [`${p} fn q(x: b): Text = p(inc); fn main(): Int = 1;`, ok]]],
  ['print reaching a rigid variable through a lambda or a reference', [
    ['fn r(item: a): Text = { let g = fn(x) => show(x); g(item) }; '
      + 'fn main(): Text = r(1);', ok],
    ['fn ap(f: a -> Text, x: a): Text = f(x); '
      + 'fn r(x: b): Text = ap(show, x); fn main(): Text = r(1);', ok]]],
  ['print at a declared type over a rigid variable', [
    ['fn s(item: Box(a)): Text = show(item); fn main(): Int = 1;',
      atCheck(printable('Box(a)'))],
    ['fn s(item: Wrap(a)): Text = show(item); '
      + 'fn main(): Text = s(Wrap(1));', ok],
    ['fn s(item: Wrap(a)): Text = show(item); '
      + 'fn main(): Text = s(Wrap(inc));',
    atSpecialize(printable('Wrap(Int -> Int)'))]]],
  ['compare at a rigid variable: refused at check', [
    ['fn c(x: a): Bool = x == x; fn main(): Int = 1;',
      atCheck(comparable('a'))],
    ['fn c(x: Wrap(a)): Bool = x == x; fn main(): Int = 1;',
      atCheck(comparable('Wrap(a)'))],
    ['fn c(x: Tag(a)): Bool = x == x; fn main(): Int = 1;',
      atCheck(comparable('Tag(a)'))]]],
  ['print at an open record: judged per key', [
    [`${open} fn main(): Text = s({ a: 1, b: 2 });`, ok],
    [`${open} fn main(): Text = s({ a: 1, f: inc });`,
      atSpecialize(printable('{ a: Int, f: Int -> Int }'))]]],
  ['compare at an open record: refused at check', [
    ['fn c(r: { a: Int, ...r }): Bool = r == r; fn main(): Int = 1;',
      atCheck(comparable('{ a: Int, ...r }'))]]],
  ['at an unconstrained hole: print accepted, compare ambiguous', [
    ['fn main(): Text = show(N);', ok],
    ['fn main(): Bool = N == N;',
      atCheck('Ambiguous type L(_) in comparison')]]],
  ['a print builtin passed as a value, instantiated at a function', [
    ['fn ap(f: a -> Text, x: a): Text = f(x); '
      + 'fn main(): Text = ap(show, inc);',
    atCheck(printable('Int -> Int'))]]]
];

const pin = rows => {
  for (const [source, [phase, code, text]] of rows) {
    const result = phaseOf(`${declarations} ${source}`);
    assert.deepEqual(result, { phase, code, text }, source);
  }
};

for (const [title, rows] of cases) test(title, () => pin(rows));
