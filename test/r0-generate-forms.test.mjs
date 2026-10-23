import test from 'node:test';
import assert from 'node:assert/strict';
import { B, app, eq, fresh, fun, generated, rec, rigid, ruleEntries, tv }
  from './r0-generate-support.mjs';
import { problemFindings } from './r0-generate-checks.mjs';

// R0 Task 3.2 (b, c): T-R0b §3.3 records (E24-E28) and §3.5 builtins and
// effects (E17-E23), each pinned by a hand-checked list of `(AtomId,
// entry)`; RT7's checks (with §5.3's defining atoms) on every fixture.
const main = '\nfn main(): Int = 1;\n';
const v = (steps, role) => fresh(steps, role);
const at = (steps, role) => tv(v(steps, role));
const pinned = (source, name, rule, expected) => {
  const { decl, problem } = generated(source + main, name);
  assert.deepEqual(ruleEntries(problem, rule), expected, rule);
  assert.deepEqual(problemFindings(decl, problem), [], rule);
  return problem;
};
const positions = problem => problem.vars
  .filter(([variable]) => 'fresh' in variable).map(([variable, info]) =>
    [variable.fresh.role, info.sort, info.position]);
const node = { root: 'body', steps: [] };

test('E24: a literal is its record, fields in label order; no entry', () => {
  const { problem } = generated('fn f(): { a: Int, b: Bool } = '
    + '{ b: true, a: 1 };' + main);
  assert.deepEqual(problem.types[0][1],
    rec([['a', B('Int')], ['b', B('Bool')]]));
  assert.deepEqual(problem.b.map(entry => entry.origin.rule), ['Sig3']);
});

test('E25: the spread\'s atom, then the result\'s (B2)', () => {
  const problem = pinned('fn f(p: { name: Text, ...r }): '
    + '{ admin: Bool, name: Text, ...r } where r lacks { admin } = '
    + '{ ...p, admin: true };', 'f', 'E25', [
    ['b', ['body'], 0, eq(rec([['name', B('Text')]], [rigid(0)]),
      rec([], [v([], { spread: 1 })]))],
    ['b', ['body'], 1, eq(at([], 'res'),
      rec([['admin', B('Bool')]], [v([], { spread: 1 })]))]]);
  assert.deepEqual(positions(problem), [['res', 'type', { nodeType: node }],
    [{ spread: 1 }, 'row', 'auxiliary']]);
});

test('E26: selection, the field positioned, the rest an auxiliary', () => {
  const problem = pinned('fn f(p: { a: Int, ...r }): Int = p.a;', 'f',
    'E26', [['b', ['body'], 0, eq(rec([['a', B('Int')]], [rigid(0)]),
      rec([['a', at([], { field: 'a' })]], [v([], 'rest')]))]]);
  assert.deepEqual(positions(problem), [
    [{ field: 'a' }, 'type', { nodeType: node }],
    ['rest', 'row', 'auxiliary']]);
});

test('E27: per field, the operand\'s shape and the value (B7)', () => {
  const problem = pinned('fn f(p: { a: Int, ...r }): { a: Int, ...r } = '
    + 'p { a = 2 };', 'f', 'E27', [
    ['b', ['body'], 0, eq(rec([['a', B('Int')]], [rigid(0)]),
      rec([['a', at([], { upd: 'a' })]], [v([], { updrest: 'a' })]))],
    ['b', ['body'], 1, eq(B('Int'), at([], { upd: 'a' }))]]);
  assert.deepEqual(positions(problem), [[{ upd: 'a' }, 'type', 'auxiliary'],
    [{ updrest: 'a' }, 'row', 'auxiliary']]);
});

test('E28: removal is { ...⟨p, rest⟩ }; every variable auxiliary', () => {
  const problem = pinned('fn f(p: { a: Int, ...r }): { ...r } = '
    + 'p without { a };', 'f', 'E28', [['b', ['body'], 0,
    eq(rec([['a', B('Int')]], [rigid(0)]),
      rec([['a', at([], { field: 'a' })]], [v([], 'rest')]))]]);
  assert.deepEqual(problem.types[0][1], rec([], [v([], 'rest')]));
  assert.deepEqual(positions(problem), [[{ field: 'a' }, 'type',
    'auxiliary'], ['rest', 'row', 'auxiliary']]);
});

const state = 'effect State(s) { fn get(): s; fn put(v: s): Unit; };\n';
test('E17: operation arguments, then EffectArgument (O2, body)', () => {
  const problem = pinned(state + 'fn f(): Unit with State(Int) = '
    + 'State.put(State.get());', 'f', 'E17', [
    ['b', ['body'], 0, eq(at(['Perform', 'args', 0], { inst: 0 }),
      at([], { inst: 0 }))],
    ['outside', ['body'], 1, 'EffectArgument'],
    ['outside', ['body', 'Perform', 'args', 0], 0, 'EffectArgument']]);
  assert.deepEqual(problem.outside.map(entry => entry.origin.row),
    ['O2', 'O2']);
  const ref = pinned(state + 'fn f(): (Int) -> Unit with State(Int) = '
    + 'State.put;', 'f', 'E17', [['outside', ['body'], 0, 'EffectArgument']]);
  assert.deepEqual(ref.types[0][1], fun([at([], { inst: 0 })], B('Unit')));
  // An effect with no parameters: no EffectArgument.
  pinned('effect Log { fn log(n: Int): Unit; };\n'
    + 'fn f(): Unit with Log = Log.log(1);', 'f', 'E17',
  [['b', ['body'], 0, eq(B('Int'), B('Int'))]]);
});

// Task 4.3 (RT8's first run): a perform is checked as a named call
// (Check/Operation.purs `named`, FN001), so E17 takes E5's three cases:
// fewer arguments are a partial application, more an over-application.
const two = 'effect Two { fn two(a: Int, b: Int): Unit; };\n';
test('E17: a partial perform is the arrow of the rest', () => {
  const problem = pinned(two + 'fn f(): Int -> Unit with Two = Two.two(1);',
    'f', 'E17', [['b', ['body'], 0, eq(B('Int'), B('Int'))]]);
  assert.deepEqual(problem.types[0][1], fun([B('Int')], B('Unit')));
});

test('E17: an over-applied perform is E5\'s ⟨p, res⟩ (B1)', () => {
  const make = 'effect Make { fn make(n: Int): Int -> Int; };\n';
  const problem = pinned(make + 'fn f(): Int with Make = Make.make(1, 2);',
    'f', 'E17', [['b', ['body'], 0, eq(B('Int'), B('Int'))],
      ['b', ['body'], 1, eq(fun([B('Int')], B('Int')),
        fun([B('Int')], at([], 'res')))]]);
  assert.deepEqual(problem.types[0][1], at([], 'res'));
  assert.deepEqual(positions(problem), [['res', 'type', { nodeType: node }]]);
});

test('E18, E19: pr at the parameter or the one argument (C1)', () => {
  const crash = pinned('fn f(): (Bool) -> Int = crash;', 'f', 'E18',
    [['bq', ['body'], 0, { pr: at([], { param: 0 }) }]]);
  assert.deepEqual(positions(crash), [['res', 'type', { lambdaBody: node }],
    [{ param: 0 }, 'type', { paramType: [node, 0] }]]);
  pinned('fn f(): Text = show(1);', 'f', 'E19',
    [['bq', ['body'], 0, { pr: B('Int') }]]);
  pinned('fn f(): Text = show(1, 2);', 'f', 'E19', []);
});

test('E20: the handler type, HandlerType, clause parameters at θ', () => {
  const problem = pinned(state + 'fn f(): Handler(State(Int) with pure) = '
    + 'handler State(Int) { get() => 1, put(v) => () };', 'f', 'E20',
  [['outside', ['body'], 0, 'HandlerType']]);
  assert.deepEqual(problem.types[0][1], app({ handler: 0 },
    [at([], { inst: 0 })]));
  assert.deepEqual(problem.types.map(([path]) => path.steps.join('/')),
    ['', 'Handler/clauses/0/body', 'Handler/clauses/1/body']);
});

test('E21: with records HandlerType and no equation', () => {
  const problem = pinned('fn f(h: Handler(Console with pure)): Unit '
    + 'with Console = with h { Console.print(1) };', 'f', 'E21',
  [['outside', ['body'], 0, 'HandlerType']]);
  // A builtin effect's handler type has a head (Task 3.2's HandlerHead
  // over an effect reference): `Handler(Console)`.
  assert.deepEqual(problem.types.find(([path]) =>
    path.steps.join('/') === 'With/handler')[1],
  app({ handler: 'Console' }, []));
});

const err = 'type Err = Oops;\n';
test('E22: FailFamily, body and clauses against ⟨p, res⟩', () => {
  pinned(err + 'fn f(): Int = handle Fail.fail(Oops) '
    + '{ fail(error: Err) => 2 };', 'f', 'E22', [
    ['outside', ['body'], 0, 'FailFamily'],
    ['b', ['body'], 1, eq(at(['Handle', 'body'], 'res'), at([], 'res'))],
    ['b', ['body'], 2, eq(B('Int'), at([], 'res'))]]);
});

test('E23: a written family without record or variable is unmarked',
  () => {
    pinned(err + 'fn f(): Int with Fail(Err) { fail } = fail(Oops);', 'f',
      'E23', [['b', ['body'], 0, eq(B({ data: 0 }), B({ data: 0 }))]]);
    pinned('fn f(): Int with Fail({ a: Int }) { fail } = fail({ a: 1 });',
      'f', 'E23', [
        ['b', ['body'], 0, eq(rec([['a', B('Int')]]), rec([['a', B('Int')]]))],
        ['outside', ['body'], 1, 'FailFamily']]);
    pinned(err + 'fn f(): Int = Fail.fail(Oops);', 'f', 'E23',
      [['outside', ['body'], 0, 'FailFamily']]);
  });
