import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { B, app, eq, fresh, generated, load, problemsOf, rec, resolved,
  rigid, ruleEntries, tv } from './r0-generate-support.mjs';
import { problemFindings } from './r0-generate-checks.mjs';
import { nameOf, nodesOf } from './r0-generate-paths.mjs';

// R0 Task 3.2 (c): T-R0b §3.4, P1-P7, each pinned by a hand-checked list
// of `(AtomId, entry)`; and RT5 (§9 item 5): every constructor of
// Resolved `Expr`, `Pattern`, `Rest` and `Item` reaches a rule in a
// fixture (its node's type is recorded at its path).
const main = '\nfn main(): Int = 1;\n';
const v = (steps, role) => fresh(steps, role);
const arm = (index, ...more) => ['Match', 'arms', index, 'pattern', ...more];
const pinned = (source, name, rule, expected) => {
  const { decl, problem } = generated(source + main, name);
  assert.deepEqual(ruleEntries(problem, rule), expected, rule);
  assert.deepEqual(problemFindings(decl, problem), [], rule);
  return problem;
};

const opt = 'type Opt(a) = None | Some(a);\n'
  + 'fn f(o: Opt(Int)): Int = match o { Some(n) => n, None => 0, _ => 1 };';
test('P1, P2, P4: θ(owner) against τ_s, then the owner\'s marker', () => {
  const owner = index => app({ data: 0 }, [tv(v(arm(index), { inst: 0 }))]);
  const typeOpt = app({ data: 0 }, [B('Int')]);
  const problem = pinned(opt, 'f', 'P4', [0, 1].flatMap(index => [
    ['b', ['body', ...arm(index)], 0, eq(typeOpt, owner(index))],
    ['outside', ['body', ...arm(index)], 1, 'DataApplication']]));
  // P2 binds `n` at θ(field), so the first arm's body is `⟨p, inst 0⟩`.
  assert.deepEqual(ruleEntries(problem, 'E12')[0][3],
    eq(tv(v(arm(0), { inst: 0 })), tv(v([], 'res'))));
  assert.deepEqual(problem.types.find(([path]) => JSON.stringify(path.steps)
    === JSON.stringify(arm(2)))?.[1], typeOpt);
});

test('P3: a literal pattern against Int or Bool', () => {
  pinned('fn f(b: Bool): Int = match b { true => 1, false => 0 };', 'f',
    'P3', [0, 1].map(index => ['b', ['body', ...arm(index)], 0,
      eq(B('Bool'), B('Bool'))]));
});

const records = 'fn f(p: { a: Int, b: Bool }): Int = '
  + 'match p { { a: 1, b } => 2, { a, ... } => a };';
test('P5, P6: closed and ignored rests (B12, B11)', () => {
  const field = (index, label) => tv(v(arm(index), { field: label }));
  const scrutinee = rec([['a', B('Int')], ['b', B('Bool')]]);
  pinned(records, 'f', 'P5', [['b', ['body', ...arm(0)], 0,
    eq(scrutinee, rec([['a', field(0, 'a')], ['b', field(0, 'b')]]))]]);
  const problem = pinned(records, 'f', 'P6', [['b', ['body', ...arm(1)], 0,
    eq(scrutinee, rec([['a', field(1, 'a')]], [v(arm(1), 'rest')]))]]);
  assert.deepEqual(problem.b.filter(entry => entry.origin.rule === 'P5'
    || entry.origin.rule === 'P6').map(entry => entry.origin.row),
  ['B12', 'B11']);
  assert.deepEqual(problem.vars.find(([variable]) =>
    variable.fresh?.role === 'rest')[1].position, 'auxiliary');
});

test('P7: the rest binder is { ...⟨p, rest⟩ } at RestType p', () => {
  const problem = pinned('fn f(p: { a: Int, ...r }): { ...r } = '
    + 'match p { { a: _, ...rest } => rest };', 'f', 'P7', [
    ['b', ['body', ...arm(0)], 0, eq(rec([['a', B('Int')]], [rigid(0)]),
      rec([['a', tv(v(arm(0), { field: 'a' }))]], [v(arm(0), 'rest')]))]]);
  assert.deepEqual(ruleEntries(problem, 'E12')[0][3],
    eq(rec([], [v(arm(0), 'rest')]), tv(v([], 'res'))));
  const position = name => problem.vars.find(([variable]) =>
    JSON.stringify(variable.fresh?.role) === JSON.stringify(name))[1]
    .position;
  assert.deepEqual(position('rest'), { restType:
    { root: 'body', steps: arm(0) } });
  assert.deepEqual(position({ field: 'a' }), { patternType:
    { root: 'body', steps: arm(0, 'Record', 'fields', 0, 'pattern') } });
});

// RT5. The constructor lists, checked against the declarations they
// come from (Style.Arms reads each source's data constructors), so a
// constructor added there fails here until a fixture covers it.
const exprs = ['Integer', 'Boolean', 'Local', 'FunctionRef', 'CtorRef',
  'Call', 'Construct', 'Add', 'Concat', 'Interpolate', 'Compare', 'If',
  'Match', 'Lambda', 'Apply', 'Pipe', 'UnitValue', 'Block', 'OperationRef',
  'Perform', 'PrintRef', 'Print', 'ShowRef', 'Show', 'CrashRef', 'Crash',
  'Handler', 'With', 'Handle', 'Fail', 'TextLiteral', 'RecordLiteral',
  'FieldAccess', 'RecordUpdate', 'RecordExtension', 'RecordRemoval'];
const items = ['Let', 'Defer', 'Discard'];
const patterns = ['Wildcard', 'Bind', 'IntLit', 'BoolLit', 'Ctor', 'Record'];
const rests = ['NoRest', 'IgnoredRest', 'NamedRest'];
test('RT5: the constructor lists are the declared ones', async () => {
  const { arms } = await load('Style.Arms');
  const declared = file => arms(readFileSync(file, 'utf8')).value0.declared;
  assert.deepEqual(declared('src/Domain/Resolved.purs').sort(),
    [...exprs, ...items, 'Given', 'Spreading'].sort());
  assert.deepEqual(declared('src/Domain/Resolved/Core.purs').sort(),
    [...patterns, ...rests, 'GlobalFunction', 'GlobalCtor', 'BuiltinShow',
      'BuiltinCrash', 'Lacks', 'Disjoint'].sort());
});

const fixtures = [`type Box(a) = Box(a);
fn inc(n: Int): Int = n + 1;
fn f(x: Int, t: Text, b: Bool): Unit with Console = {
  let g = inc;
  let k = Box;
  let c = Box(inc(x));
  let s = "\${t}" ++ "a";
  let m = match c { Box(1) => true, Box(n) => n < 2 };
  let z = match b { true => 1, _ => 0 };
  let l = fn(y) => y;
  let a = l(1) |> inc;
  let i = if b then x else 0;
  defer Console.print(x);
  Console.print(show(x));
  ()
};`, `effect State(s) { fn get(): s; fn put(v: s): Unit; };
type Err = Oops;
fn f(h: Handler(Console with pure)): Int with Console + State(Int) = {
  let p = Console.print;
  let w = show;
  let q = crash;
  let r = State.put;
  State.put(State.get());
  let s = handler State(Int) { get() => 1, put(v) => () };
  with h { Console.print(1) };
  handle Fail.fail(Oops) { fail(error: Err) => crash(2) }
};`, `fn f(p: { a: Int, b: Bool }): Int = {
  let r = { a: 1, b: true };
  let u = r { a = 2 };
  let e = { ...p, c: 3 };
  let m = p without { a };
  match p { { a: 1, b } => 2, { a, ... } => a, { b, ...rest } => r.a }
};`];

test('RT5: every constructor reaches its rule in a fixture', () => {
  const reached = new Set();
  for (const source of fixtures)
    for (const { decl, problem } of problemsOf(resolved(source + main))) {
      const typed = new Set(problem.types.map(([path]) =>
        JSON.stringify(path.steps)));
      for (const { steps, node } of nodesOf(decl.body)) {
        const name = nameOf(node);
        const path = items.includes(name) ? [...steps, name, 'value'] : steps;
        if (typed.has(JSON.stringify(path))) reached.add(name);
        if (name === 'Record' && 'value2' in node && typed.has(
          JSON.stringify(steps))) reached.add(nameOf(node.value2));
      }
      assert.deepEqual(problemFindings(decl, problem), [], decl.name);
    }
  for (const name of [...exprs, ...patterns, ...rests, ...items])
    assert.ok(reached.has(name), name);
});
