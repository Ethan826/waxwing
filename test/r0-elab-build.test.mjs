import test from 'node:test';
import assert from 'node:assert/strict';
import { named, sourceRows } from './r0-elab-corpus-run.mjs';
import { compareRow } from './r0-elab-compare.mjs';
import { load } from './r0-generate-support.mjs';

// R0 Task 7.1b, D1 spec §10 T1 and T2 on small programs, one group of
// rules each, so a defect in one rule's checked node fails here, fast,
// as well as in the corpus run (test/r0-elab-corpus.serial.test.mjs):
// every declaration `decide` judges Solved elaborates, and wherever the
// online search offered a certificate, `build`'s checked declaration
// equals the certificate's, effect-erased (§12.1's fallback); no
// declaration has a seal fault. Each
// group names the declarations that must be compared, so none passes by
// being skipped.
const Elaborating = await load('Domain.Elaborating');
const main = 'fn main(): Int = 0;\n';
const groups = {
  'E3-E6: references, calls, partial and over-application': [
    'type Box(a) = Box(a);\nfn add(a: Int, b: Int): Int = a + b;\n'
    + 'fn id(x: a): a = x;\nfn saturated(): Int = add(1, 2);\n'
    + 'fn partial(): (Int) -> Int = add(1);\n'
    + 'fn ref(): (Int, Int) -> Int = add;\nfn over(): Int = id(add)(1, 2);\n'
    + 'fn overNamed(): Int = id(add, 1, 2);\n'
    + 'fn boxed(): Box(Int) = Box(1);\nfn ctor(): (Int) -> Box(Int) = Box;\n'
    + 'fn pick(p: { a: Int, ...r }): Int = p.a;\n'
    + 'fn picks(): Int = pick({ a: 1, b: true });\n',
    ['saturated', 'partial', 'ref', 'over', 'overNamed', 'boxed', 'ctor',
      'picks']],
  'E7-E11, E14, E15: operators, if, application and pipes': [
    'fn f(x: Int, t: Text): Bool = '
    + 'if x < 1 then t == "${t}!" ++ "a" else true;\n'
    + 'fn g(k: (Int) -> Int, x: Int): Int = (x |> k) + k(1);\n'
    + 'fn h(k: (Int) -> (Int) -> Int): Int = k(1)(2);\n', ['f', 'g', 'h']],
  'E13, E16: lambdas, annotated or not, and lets': [
    'fn f(): Int = { let g = fn(x) => x + 1; let h = fn(y: Int, _) => y;'
    + ' g(h(1, true)) };\n', ['f']],
  'E12, P1-P7: matches and every pattern': [
    'type Opt(a) = None | Some(a);\n'
    + 'fn f(o: Opt(Int)): Int = match o { None => 0, Some(n) => n };\n'
    + 'fn g(p: { a: Int, b: Bool }): Int = '
    + 'match p { { a: 1, b } => 2, { a, ... } => a };\n'
    + 'fn h(p: { a: Int, b: Bool }): Bool = '
    + 'match p { { a, ...rest } => rest.b };\n', ['f', 'g', 'h']],
  'E24-E28: record literal, access, update, extension, removal': [
    'fn f(p: { a: Int, b: Bool }): Int = p.a;\n'
    + 'fn g(p: { a: Int, b: Bool }): { a: Int, b: Bool } = p { a = 2 };\n'
    + 'fn h(p: { a: Int, b: Bool }): { b: Bool } = p without { a };\n'
    + 'fn k(p: { a: Int }): { a: Int, c: Text } = { ...p, c: "x" };\n'
    + 'fn l(): { x: Int, y: Bool } = { x: 1, y: true };\n',
    ['f', 'g', 'h', 'k', 'l']],
  'E18, E19: print, show and crash, called and referenced': [
    'fn f(): Unit with Console = Console.print(1);\n'
    + 'fn g(): Text = show(true);\nfn h(): (Int) -> Text = show;\n'
    + 'fn c(): Int = crash("no");\nfn r(): (Text) -> Int = crash;\n',
    ['f', 'g', 'h', 'c', 'r']],
  'E17, E20, E21: operations, handlers and with': [
    'effect Two { fn two(a: Int, b: Int): Int; };\n'
    + 'fn partly(): Int with Two = { let inc = Two.two(1); inc(41) };\n'
    + 'fn fully(): Int with Two = Two.two(1, 2);\n'
    + 'fn ref(): (Int, Int) -> Int with Two = Two.two;\n'
    + 'fn made(): Handler(Two with pure) = '
    + 'handler Two { two(a, b) => a + b };\n'
    + 'fn handled(): Int = with made() { Two.two(1, 2) };\n',
    ['partly', 'fully', 'ref', 'made', 'handled']],
  'E16, E22, E23: defer, handle and fail': [
    'fn f(): Int = handle { Fail.fail({ code: 1 }) } '
    + '{ fail(e: { code: Int }) => e.code };\n'
    + 'fn g(): Unit with Console = { defer Console.print(1); () };\n',
    ['f', 'g']]
};

// `elaborate`'s IR at a Solved verdict, else `build`'s under the
// certificate's witness (test/r0-elab-corpus-run.mjs).
const builtOf = row => {
  if (row.elaborated !== null) return row.elaborated.value0;
  return row.built !== null && named(row.built) === 'Right'
    ? row.built.value0 : undefined;
};

for (const [name, [source, expected]] of Object.entries(groups))
  test(`T1, T2 (effect-erased): ${name}`, () => {
    const rows = sourceRows({ origin: name, source: source + main });
    assert.ok(rows.length > 0, 'the source resolves');
    for (const row of rows)
      assert.deepEqual(Elaborating.untracked(row.elaborating), [],
        row.decl.name);
    for (const row of rows.filter(found => found.judged !== null))
      assert.equal(named(row.elaborated), 'Elaborated', row.decl.name);
    const compared = rows.filter(row => row.certificate !== null
      && builtOf(row) !== undefined);
    assert.deepEqual(expected.filter(decl => !compared.some(row =>
      row.decl.name === decl)), [], 'every named declaration is compared');
    for (const row of compared)
      assert.ok(compareRow(row, builtOf(row)).same, row.decl.name);
  });
