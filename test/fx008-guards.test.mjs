// FX008 whole-branch review M3: paths the design keeps as guards and no
// program reaches. Reaching one reports E_INTERNAL, never continues. A
// checked program cannot reach them, so each test changes a checked state
// by hand (through the test-only Features.Check.Inspect) until it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Left } from '../output/Data.Either/index.js';
import { empty, insert, toUnfoldable } from '../output/Data.Map.Internal/index.js';
import { Nothing } from '../output/Data.Maybe/index.js';
import { ordInt } from '../output/Data.Ord/index.js';
import { unfoldableArray } from '../output/Data.Unfoldable/index.js';
import { Row } from '../output/Domain.Row/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { checkedStates, settledAgain } from '../output/Features.Check.Inspect/index.js';
import { tailPass } from '../output/Features.Check.TailPass/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { parse } from '../output/Format.Parse/index.js';

const logs = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; ';
// The installation's C ends in the signature's variable, and so does the
// row it is installed in.
const rigid = logs
  + 'fn run(cb: Unit -> Unit with ...e): Unit with ...e = '
  + 'with handler Log { log(n) => cb(()) } { log(1) }; '
  + 'fn main(): Unit with Console = run(fn(u: Unit) => print(1));';
// Two installations; the outer one's row holds only Log.
const nested = logs
  + 'fn main(): Unit with Console = with handler Log { log(n) => print(n) } '
  + '{ with handler Tick { tick() => { log(1); log(2) } } '
  + '{ with handler Log { log(n) => { tick(); log(n) } } { log(3) } } };';

const programOf = source => resolve(parse(source).value0).value0;
const entries = map => toUnfoldable(unfoldableArray)(map);
const withInstallation = (state, id, installation) => ({
  ...state,
  restricted: {
    ...state.restricted,
    installations: insert(ordInt)(id)(installation)(state.restricted.installations)
  }
});
const internal = result => {
  assert.ok(result instanceof Left, 'expected a rejection');
  const diagnostic = wire(result.value0);
  assert.equal(diagnostic.code, 'E_INTERNAL');
  return diagnostic.message;
};

const runState = () => {
  const checked = checkedStates(programOf(rigid));
  return checked.value0.find(found => found.name === 'run').state;
};

test('the tail pass accepts an installation row that ends in the variable', () => {
  const state = runState();
  const result = tailPass({})({ ...state, restricted: {
    ...state.restricted, clauses: empty } });
  assert.equal(result.constructor.name, 'Right');
});

test('an installation row that does not end in its clause row is internal', () => {
  const state = runState();
  const [{ value0: id, value1: found }] = entries(state.restricted.installations);
  const broken = withInstallation(
    { ...state, restricted: { ...state.restricted, clauses: empty } }, id,
    { ...found, current: new Row([], Nothing.value) });
  assert.match(internal(tailPass({})(broken)),
    /Installation row does not end in its clause row/);
});

test('an installed clause label without a partner is internal', () => {
  const program = programOf(nested);
  const state = checkedStates(program).value0
    .find(found => found.name === 'main').state;
  const [first, second] = entries(state.restricted.installations);
  // The outer Log handler's C is given the Tick handler's: `current`, the
  // row it was installed in, holds no Tick label.
  const unpartnered = state_ => withInstallation(state_, first.value0,
    { ...first.value1, clauses: second.value1.clauses, matched: -1 });
  const same = settledAgain(program)('main')(state_ => state_);
  assert.equal(same.constructor.name, 'Right');
  const result = settledAgain(program)('main')(unpartnered);
  assert.match(internal(result), /Installed clause label without a partner/);
});
