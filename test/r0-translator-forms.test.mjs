import test from 'node:test';
import assert from 'node:assert/strict';
import { Int, Text, Unit, data, eq, fun, fv, nodeType, rec, ruleEntries,
  translated, tv, typeAt, varInfo } from './r0-translator-support.mjs';

// RT1's translator, rule by rule (Task 3.3): functions, blocks, builtins,
// effects and handlers (T-R0b §3.2, §3.3, §3.5: E13-E23). Expected
// values are hand-derived from the rule tables.
const program = translated(`
effect State(s) { fn get(): s; fn put(x: s): Unit; };
type Err = Missing(Int);
type Rec = Rec({ m: Int });
fn lam(p: { a: Int, ...r }): Int = (fn(q: { a: Int, ...r }, z) => q.a)(p, 1);
fn piped(x: Int): Text = x |> show;
fn fin(): Unit = ();
fn blocks(): Int = { let a = 1; let _ = 2; 3; defer fin(); a };
fn eff(): Unit with State(Int) = { let r = State.put; State.put(1); () };
fn refs(): Unit with Console = { let p = Console.print; let c = crash; () };
fn calls(): Unit with Console = { Console.print(1); show(1, 2); crash("x") };
fn mk(): Handler(State(Int) with pure) =
  handler State(Int) { get() => 1, put(x) => () };
fn st(h: Handler(State(Int))): Int = with h { State.get() };
fn g(id: Int): Text with Fail(Err) = Fail.fail(Missing(id));
fn hd(id: Int): Text = handle g(id) { fail(e: Err) => "Guest" };
fn fam(): Int with Fail(Err) { fail } = fail(Missing(1));
fn famr(): Int with Fail({ m: Int }) { fail } = fail({ m: 1 });
fn main(): Int = 0;
`);
const item = (index, kind = 'Let') => `body:Block/items/${index}/${kind}/value`;
const short = entries => entries.map(([list, path, index, row, , value]) =>
  [list, path, index, row, value]);
const rigidRow = rec({ a: Int }, [{ rigid: 0 }]);

test('E13: annotated and fresh parameters; the definedness atom', () => {
  const at = 'body:Apply/function';
  const z = fv(at, { param: 1 });
  const field = tv(fv(`${at}/Lambda/body`, { field: 'a' }));
  assert.deepEqual(typeAt(program.lam, at), fun([rigidRow, tv(z)], field));
  assert.deepEqual(ruleEntries(program.lam, 'E13'),
    [['b', at, 0, 'B14', 'types', eq(rigidRow, rigidRow)]]);
  assert.deepEqual(varInfo(program.lam, z),
    ['type', 'exists', 'E13', { paramType: [{ root: 'body',
      steps: ['Apply', 'function'] }, 1] }]);
});

test('E14 and E15: application and pipe against τ̄ → ⟨p, res⟩', () => {
  const res = tv(fv('body:', 'res'));
  const z = tv(fv('body:Apply/function', { param: 1 }));
  const field = tv(fv('body:Apply/function/Lambda/body', { field: 'a' }));
  assert.deepEqual(short(ruleEntries(program.lam, 'E14')), [['b', 'body:', 0,
    'B1', eq(fun([rigidRow, z], field), fun([rigidRow, Int], res))]]);
  const pi = tv(fv('body:Pipe/right', { param: 0 }));
  assert.deepEqual(short(ruleEntries(program.piped, 'E15')), [['b', 'body:',
    0, 'B1', eq(fun([pi], Text), fun([Int], res))]]);
});

test('E16: lets bind, discards keep entries, defer is marked', () => {
  const { blocks } = program;
  assert.deepEqual(typeAt(blocks, 'body:Block/result'), Int);
  assert.deepEqual(typeAt(blocks, item(2, 'Discard')), Int);
  assert.deepEqual(short(ruleEntries(blocks, 'E16')), [
    ['b', 'body:Block/items/3', 0, 'B1', eq(Unit, Unit)],
    ['outside', 'body:Block/items/3', 1, 'O6', 'Deferred']]);
});

test('E17: an operation reference and a perform, marked', () => {
  const [ref, perform] = [item(0), item(1, 'Discard')];
  const s = path => tv(fv(path, { inst: 0 }));
  assert.deepEqual(typeAt(program.eff, ref), fun([s(ref)], Unit));
  assert.deepEqual(typeAt(program.eff, perform), Unit);
  assert.deepEqual(short(ruleEntries(program.eff, 'E17')), [
    ['b', perform, 0, 'B1', eq(Int, s(perform))],
    ['outside', ref, 0, 'O2', 'EffectArgument'],
    ['outside', perform, 1, 'O2', 'EffectArgument']]);
  assert.deepEqual(varInfo(program.eff, fv(ref, { inst: 0 }))[3],
    { slot: [{ root: 'body', steps: ['Block', 'items', 0, 'Let', 'value'] },
      0] });
});

test('E18: builtin references with `pr π`; crash\'s result at the body', () => {
  const [print, crash] = [item(0), item(1)];
  const pi = path => tv(fv(path, { param: 0 }));
  assert.deepEqual(typeAt(program.refs, print), fun([pi(print)], Unit));
  assert.deepEqual(typeAt(program.refs, crash),
    fun([pi(crash)], tv(fv(crash, 'res'))));
  assert.deepEqual(short(ruleEntries(program.refs, 'E18')), [
    ['bq', print, 0, 'C1', { pr: pi(print) }],
    ['bq', crash, 0, 'C1', { pr: pi(crash) }]]);
  assert.deepEqual(varInfo(program.refs, fv(crash, 'res'))[3],
    { lambdaBody: { root: 'body', steps: ['Block', 'items', 1, 'Let',
      'value'] } });
});

test('E19: `pr` of a single argument only', () => {
  assert.deepEqual(short(ruleEntries(program.calls, 'E19')), [
    ['bq', item(0, 'Discard'), 0, 'C1', { pr: Int }],
    ['bq', 'body:Block/result', 0, 'C1', { pr: Text }]]);
  assert.deepEqual(typeAt(program.calls, item(1, 'Discard')), Text);
  assert.deepEqual(varInfo(program.calls, fv('body:Block/result', 'res'))[3],
    nodeType('body:Block/result'));
});

test('E20 and E21: handler types, marked; clause parameters at θ', () => {
  const s = tv(fv('body:', { inst: 0 }));
  assert.deepEqual(typeAt(program.mk, 'body:'),
    { app: { head: { handler: 0 }, args: [s] } });
  assert.deepEqual(short(ruleEntries(program.mk, 'E20')),
    [['outside', 'body:', 0, 'O3', 'HandlerType']]);
  assert.deepEqual(short(ruleEntries(program.st, 'E21')),
    [['outside', 'body:', 0, 'O3', 'HandlerType']]);
  assert.deepEqual(typeAt(program.st, 'body:'), tv(fv('body:', 'res')));
});

test('E22: the body and each clause against ⟨p, res⟩, marked', () => {
  const res = tv(fv('body:', 'res'));
  assert.deepEqual(short(ruleEntries(program.hd, 'E22')), [
    ['b', 'body:', 1, 'B1', eq(Text, res)],
    ['b', 'body:', 2, 'B1', eq(Text, res)],
    ['outside', 'body:', 0, 'O4', 'FailFamily']]);
});

test('E23: a written family is equated; marked unless record-free', () => {
  assert.deepEqual(short(ruleEntries(program.fam, 'E23')),
    [['b', 'body:', 0, 'B1', eq(data(0), data(0))]]);
  assert.deepEqual(short(ruleEntries(program.g, 'E23')),
    [['outside', 'body:', 0, 'O4', 'FailFamily']]);
  const record = rec({ m: Int });
  assert.deepEqual(short(ruleEntries(program.famr, 'E23')), [
    ['b', 'body:', 0, 'B1', eq(record, record)],
    ['outside', 'body:', 1, 'O4', 'FailFamily']]);
});
