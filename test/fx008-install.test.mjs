// FX008 Task 8: installations. `with` consumes C into the installing row,
// gives the body a frame mark and registers an installation for settling.
// The checker's final states come from `checkedStates`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toUnfoldable } from '../output/Data.Map.Internal/index.js';
import { unfoldableArray } from '../output/Data.Unfoldable/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { checkedStates } from '../output/Features.Check/index.js';
import { MarkMeta } from '../output/Domain.Row/index.js';
import { Ended, Fixed, endOf } from '../output/Features.Check.Walked/index.js';
import { edgesOf } from '../output/Features.Check.MarkStore/index.js';
import { runGo } from './support.mjs';
import { plainMark } from './unify-support.mjs';

const probe = name => readFileSync(`test/fx008-probes/${name}.wxw`, 'utf8');
const states = source => {
  const checked = checkedStates(resolve(parse(source).value0).value0);
  assert.equal(checked.constructor.name, 'Right', JSON.stringify(checked));
  return checked.value0;
};
const stateOf = (source, name) =>
  states(source).find(found => found.name === name).state;
const installationsOf = state =>
  toUnfoldable(unfoldableArray)(state.restricted.installations)
    .map(pair => pair.value1);

const logs = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; ';
const closed = logs
  + 'fn run(): Unit with Tick = with handler Log { log(n) => tick() } '
  + '{ log(1) }; '
  + 'fn main(): Unit with Console = '
  + 'with handler Tick { tick() => print(0) } { run() };';
const rigid = logs
  + 'fn run(cb: Unit -> Unit with ...e): Unit with ...e = '
  + 'with handler Log { log(n) => cb(()) } { log(1) }; '
  + 'fn main(): Unit with Console = run(fn(u: Unit) => print(1));';
const console = 'fn f(h: Handler(Console with pure)): Unit with Console = '
  + 'with h { print(1) }; fn main(): Unit = ();';

test('an installation records frame <= C edges', () => {
  const state = stateOf(closed, 'run');
  const found = installationsOf(state);
  assert.equal(found.length, 1);
  const at = found[0].span.start.offset;
  const assumed = edgesOf(state.subst.marks).filter(edge =>
    edge.reason.constructor.name === 'Assumed'
    && edge.reason.value0.start.offset === at);
  // Settling consumes C again each round; the same edge is not a second one.
  const distinct = new Set(assumed.map(edge =>
    JSON.stringify([plainMark(edge.lower), plainMark(edge.upper)])));
  assert.equal(distinct.size, 1);
});

test('a literal whose clause row closed is installed correctly', () => {
  const state = stateOf(closed, 'run');
  const [installation] = installationsOf(state);
  assert.ok(installation, 'no installation registered');
  assert.ok(endOf(state.subst)(installation.clauses) instanceof Ended);
  assert.equal(runGo(closed), '0\n');
});

test('a literal whose clause tail turned rigid is installed correctly', () => {
  const state = stateOf(rigid, 'run');
  const [installation] = installationsOf(state);
  assert.ok(installation, 'no installation registered');
  assert.ok(endOf(state.subst)(installation.clauses) instanceof Fixed);
  assert.ok(endOf(state.subst)(installation.current) instanceof Fixed);
  assert.equal(runGo(rigid), '1\n');
});

test('a Console frame is nofail and a Log frame is a mark meta', () => {
  const [console_] = installationsOf(stateOf(console, 'f'));
  assert.ok(console_, 'no installation registered');
  assert.equal(plainMark(console_.frame), 'nofail');
  const [log] = installationsOf(stateOf(closed, 'run'));
  assert.ok(log.frame instanceof MarkMeta);
});

test('a late clause label reaches the installing row', () => {
  assert.equal(runGo(probe('f1')), '1\n2\n');
  assert.equal(runGo(probe('f2')), '1\n2\n');
});
