// R0 a-min tranche 1 regression probes for the nodes' marked types and
// minting (Tasks 3, 4, 17), spread into test/regression-r0-amin.mjs.
// Each reads the recorded effects of a small program from the compiler
// under test.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const keyOf = JSON.stringify;
// Every `EffFresh` a shaped value names, by explicit stack.
const namedVars = values => {
  const found = new Set();
  const pending = [...values];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (value.EffFresh) found.add(keyOf(value.EffFresh));
    pending.push(...Object.values(value));
  }
  return found;
};

// `f` mints through a reference, a saturated call and a lambda.
const minting = 'fn two(a: Int, b: Int): Int = a; '
  + 'fn f(): Unit = { let r = two; let s = two(1, 2); '
  + 'let l = fn(x: Int, y: Int) => x; () }; fn main(): Unit = ();';
const three = 'fn three(a: Int, b: Int, c: Int): Int = a; '
  + 'fn f(): Unit = { let t = three(1); () }; fn main(): Unit = ();';
const handled = 'type Job(a) = Job(a); effect Log { fn log(n: Int): Unit; }; '
  + 'fn use(h: Handler(Log with Fail(Job(Int)))): Int = 0; '
  + 'fn main(): Unit with Console = { let h = handler Log { log(n) => '
  + 'Fail.fail(Job(n)) }; Console.print(use(h)) };';
const comparing = 'fn f(a: Int): Bool = a < 1; fn main(): Unit = ();';

// Item 0's `let` value path, as shaped.
const letValue = keyOf({ root: { InBody: [] }, steps: [{ Named: ['Block'] },
  { Named: ['items'] }, { Index: [0] }, { Named: ['Let'] },
  { Named: ['value'] }] });

export const nodeProbes = {
  // Task 4: a variable is minted once, and only where a recorded type
  // names it.
  'r0-amin-minted-once-where-named': async context => {
    const { entries, fieldsOf } = await toolkit(context);
    const found = fieldsOf(minting, 'f').effects;
    const named = namedVars([found.nodes, found.instances,
      found.annotations].flatMap(map => entries(map).flat()));
    const minted = shape(found.flexEff).filter(item => item.EffFresh)
      .map(item => keyOf(item.EffFresh));
    if (minted.length === 0) fail('nothing was minted');
    const repeated = minted.filter((item, at) => minted.indexOf(item) < at);
    const unnamed = minted.filter(item => !named.has(item));
    if (repeated.length > 0) fail(`minted twice: ${repeated.join(' ')}`);
    if (unnamed.length > 0) fail(`minted, unnamed: ${unnamed.join(' ')}`);
    passed(context);
  },
  // Task 3/4: a partial application's rest keeps its instance's stage
  // numbers: `three(1)` has stage 1's row, not stage 0's.
  'r0-amin-partial-reuses-stages': async context => {
    const { entries, fieldsOf } = await toolkit(context);
    const nodes = new Map(entries(fieldsOf(three, 'f').effects.nodes)
      .map(([path, type]) => [keyOf(path), type]));
    const rest = nodes.get(letValue);
    const stage = rest.MArrow[1].tail.Just[0].EffFresh[1];
    if (keyOf(stage) !== keyOf({ Stage: [1] }))
      fail(`three(1) rest begins at ${keyOf(stage)}, not Stage 1`);
    passed(context);
  },
  // Task 3: a node's marked type erases to its recorded type (checked
  // for base types, where erasure is the identity).
  'r0-amin-node-erasure': async context => {
    const { entries, fieldsOf } = await toolkit(context);
    const found = fieldsOf(comparing, 'f');
    const types = new Map(entries(found.types).map(([path, type]) =>
      [keyOf(path), type]));
    const bases = entries(found.effects.nodes).filter(([, type]) =>
      type.MBase);
    if (bases.length === 0) fail('no base-typed node');
    const differing = bases.filter(([path, type]) =>
      keyOf(types.get(keyOf(path))?.Base) !== keyOf(type.MBase));
    if (differing.length > 0)
      fail(`${differing.length} node(s) erase differently from types, `
        + `at ${keyOf(differing[0][0].steps)}`);
    passed(context);
  },
  // Task 5/17: a declaration with a written handler type in its
  // signature has `Outside HandlerType` (test/fx008-probes/witness/
  // famw.wxw's `use`); the source-derived scope of Task 17 holds this
  // invariant over resolved source.
  'r0-amin-handler-marker': async context => {
    const { fieldsOf } = await toolkit(context);
    const outside = keyOf(shape(fieldsOf(handled, 'use').outside));
    if (!outside.includes('HandlerType'))
      fail('a written handler type carries no Outside HandlerType');
    passed(context);
  }
};
