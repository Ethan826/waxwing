import test from 'node:test';
import assert from 'node:assert/strict';
import { problemsOf, resolved } from './r0-generate-support.mjs';
import { phaseOf } from './r0-probe-support.mjs';
import { stableStringify, wholeProblem } from './r0-canonical.mjs';

// RT10, origin kinds (T-R0b §9 item 10 [VOR]; R0 tranche Task 3.4).
// recorder-spec T10's fixtures: h1-h4 (split-irrelevance statements.md
// §1 item 4), cmp-c, cmp-cf, pr-c, pr-cf, eq-c, eq-d and E2's `peek` in
// `divide` (streams-5-8-review.md §0, pk-crash-c). The review kept no
// files; these are rebuilt from its text, and each still meets today's
// checker as the review recorded (the first test). Each `BQ` atom has
// the kind T-R0b §6 gives it: E10, E18 and E19 body, Sig10 contract (of
// `main`). No caller site adds an atom to a callee: every `q` is empty
// (Sig9) and `divide`'s problem is the same under every caller.
const divide = (extra, result) => 'fn divide(whole: { ...u, ...v },'
  + ` left: { ...s }, right: { ...t },\n    ${extra}): ${result}\n`
  + '  where u disjoint s, v disjoint t = "ok";\n';
const cmp = annotation => `${divide('k: ({ ...u }) -> Bool', 'Text')}`
  + 'fn main(): Text =\n  divide({ a: 1, f: fn(n: Int) => n, c: 2 },'
  + ` { a: 2 }, { b: 3 },\n    fn(p: ${annotation}) => p == p);\n`;
const pr = annotation => `${divide('k: ({ ...u }) -> Text', 'Text')}`
  + 'fn main(): Text =\n  divide({ a: 1, f: fn(n: Int) => n, c: 2 },'
  + ` { a: 2 }, { b: 3 },\n    fn(p: ${annotation}) => show(p));\n`;
const eq = label => divide('h: ({ ...u }) -> Int, k: ({ ...u }) -> Bool',
  'Text') + 'fn main(): Text =\n  divide({ a: 1, c: 2, d: 3 }, { a: 2 },'
  + ` { b: 3 },\n    fn(p) => p.c, fn(p: { ${label}: Int }) => p == p);\n`;
const probe = (result, site, w) => `fn probe(k: ({ ...r }) -> ${result},`
  + ` w: { ...r }): Text = "ok";\nfn main(): Text = probe(fn(p) => ${site},`
  + ` ${w});\n`;
const f = '{ f: fn(n: Int) => n }';
const c = '{ c: Int }';
const cf = '{ c: Int, f: (Int) -> Int }';
const peek = 'fn divide(whole: { ...u, ...v }, left: { ...s }, right:'
  + ' { ...t },\n    g: (Int) -> { ...u }, k: ({ ...u }) -> Bool): Text\n'
  + '  where u disjoint s, v disjoint t = {\n'
  + '  let peek = fn(p: { ...u }) => show(p);\n  peek(g(0))\n};\n'
  + 'fn main(): Text =\n  divide({ a: 1, c: 2, d: 3 }, { a: 2 }, { b: 3 },\n'
  + '    fn(n: Int) => crash("boom"), fn(p: { c: Int }) => true);\n';

// [name, source, today's phase and text (the review's), BQ per
// declaration as [atom, rule, kind]]
const body = (atom, rule) => [atom, rule, 'body'];
const entry = ['pr', 'Sig10', 'contract'];
const fixtures = [
  ['h1', probe('Text', 'show(p)', f), ['check', 'Expected a printable value,'
    + ' found { f: Int -> Int }'], { main: [body('pr', 'E19'), entry] }],
  ['h2', probe('Text', 'show(p)', '{ a: 1 }'), ['compiled', null],
    { main: [body('pr', 'E19'), entry] }],
  ['h3', probe('Bool', 'p == p', f), ['check', 'Type { f: Int -> Int } is'
    + ' not comparable'], { main: [body('cmp', 'E10'), entry] }],
  ['h4', probe('Bool', 'p == p', '{ a: 1 }'), ['compiled', null],
    { main: [body('cmp', 'E10'), entry] }],
  ['cmp-c', cmp(c), ['specialize', 'R005B placeholder: rows with several'
    + ' tails are lowered in Task 8'], { main: [body('cmp', 'E10'), entry] }],
  ['cmp-cf', cmp(cf), ['check', 'Type { c: Int, f: Int -> Int } is not'
    + ' comparable'], { main: [body('cmp', 'E10'), entry] }],
  ['pr-c', pr(c), ['specialize', 'R005B placeholder: rows with several'
    + ' tails are lowered in Task 8'], { main: [body('pr', 'E19'), entry] }],
  ['pr-cf', pr(cf), ['check', 'Expected a printable value, found'
    + ' { c: Int, f: Int -> Int }'], { main: [body('pr', 'E19'), entry] }],
  ['eq-c', eq('c'), ['specialize', 'R005B placeholder: rows with several'
    + ' tails are lowered in Task 8'], { main: [body('cmp', 'E10'), entry] }],
  ['eq-d', eq('d'), ['check', 'Expected { c: Int, ..._ } -> Bool, found'
    + ' { d: Int } -> Bool'], { main: [body('cmp', 'E10'), entry] }],
  ['peek', peek, ['specialize', 'R005B placeholder: rows with several'
    + ' tails are lowered in Task 8'],
  // main's `crash("boom")` is E19's too.
  { divide: [body('pr', 'E19')], main: [body('pr', 'E19'), entry] }]
];

const problems = source => new Map(problemsOf(resolved(source))
  .map(({ decl, problem }) => [decl.name, problem]));
const atomOf = value => Object.keys(value)[0];

test('the rebuilt probes meet today\'s checker as the review recorded',
  () => {
    for (const [name, source, [phase, text]] of fixtures)
      assert.deepEqual([phaseOf(source).phase, phaseOf(source).text],
        [phase, text], name);
  });

for (const [name, source, , kinds] of fixtures) {
  test(`${name}: each BQ atom has its kind; no callee gains one`, () => {
    const found = problems(source);
    for (const [decl, problem] of found) {
      // Entry order is recorded, not canonical: compared sorted.
      assert.deepEqual(problem.bq.map(item => [atomOf(item.value),
        item.origin.rule, item.origin.kind]).sort(),
      [...(kinds[decl] ?? [])].sort(), decl);
      assert.deepEqual(problem.q, [], decl);
    }
  });
}

// `divide`'s problem is its own: the same under each written split.
test('a caller\'s split leaves divide\'s problem unchanged', () => {
  const callee = source => wholeProblem(problems(source).get('divide'));
  assert.equal(callee(cmp(c)), callee(cmp(cf)));
  assert.equal(callee(pr(c)), callee(pr(cf)));
  assert.equal(callee(eq('c')), callee(eq('d')));
});

// RT10 asks that cmp-c and cmp-cf "record the same atom" (recorder-spec
// T8b: the atom mentions a flexible variable, not the solved type). By
// T-R0b's rule text they record it at the same origin, but its operand
// is the lambda's written annotation (E13: σ = ⟦A⟧; E2; E10 `cmp τ_l`),
// so the two values differ; the review's pair writes the split as that
// annotation. Recorded for the author (docs/findings.md, Task 3.4).
test('cmp-c and cmp-cf: one origin, each its written annotation', () => {
  const site = source => problems(source).get('main').bq
    .filter(item => item.origin.rule === 'E10')
    .map(item => [stableStringify(item.origin.atom), item.value]);
  const [[mine, made], [theirs, other]] = [site(cmp(c)), site(cmp(cf))]
    .map(([only]) => only);
  assert.equal(mine, theirs);
  const int = { base: 'Int' };
  assert.deepEqual([made, other], [
    { cmp: { record: { fields: [['c', int]], tails: [] } } },
    { cmp: { record: { fields: [['c', int], ['f', { fun: { params: [int],
      result: int } }]], tails: [] } } }]);
});
