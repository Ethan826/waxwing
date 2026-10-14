// Generator of well-typed FX001 programs over two user effects (Log and
// Tick), two failure families (Err and Oops) and Console traces. A program
// is a random main block of designed scenarios (test/fx-gen-fragments.mjs,
// test/fx-gen-cleanup.mjs) among random items (test/fx-gen-expr.mjs); the
// scenarios guarantee the census. `generate(seed)` returns { seed, source,
// tree } and is a pure function of the seed.
import { block, doItem, text, withHandler } from './fx-gen-ast.mjs';
import { cleanupFragments } from './fx-gen-cleanup.mjs';
import {
  genBlock, installed, intExpr, logHandler, tickHandler, unitExpr
} from './fx-gen-expr.mjs';
import { failingFrame } from './fx-gen-failing.mjs';
import { crossing, escaping, nested, stages } from './fx-gen-fragments.mjs';
import { noteType, textFrame } from './fx-gen-text.mjs';
import { rng } from './fx-gen-rng.mjs';
import {
  namer, performedItems, scheme, speller
} from './fx-gen-names.mjs';

export const fragments = [
  { name: 'nested', make: nested }, { name: 'crossing', make: crossing },
  { name: 'stages', make: stages }, { name: 'escaping', make: escaping },
  ...cleanupFragments
];
// Outside the rotation (it would dilute the scenarios counted by the
// census): an extra in some programs, in most unconstrained ones.
const failing = { name: 'failing-frame', make: failingFrame };
const texting = { name: 'text-frame', make: textFrame };
const regular = fragments.filter(fragment => !fragment.terminal);

export const prelude = 'type Err = Err1(Int) | Err2; type Oops = Oops(Int); '
  + 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(n: Int): Int; }; '
  + 'fn arg(n: Int): Int with Console = { Console.print(n); n }; '
  + 'fn risky(n: Int): Int with Fail(Err) { fail } + Console = '
  + '{ Console.print(n); Fail.fail(Err1(n)); n };';
const known = [
  { name: 'arg', params: [['n', 'Int']], ret: 'Int', row: new Set() },
  { name: 'risky', params: [['n', 'Int']], ret: 'Int', row: new Set(['Err']) }
];

// A generated function's user effects are `nofail` (FX008): its body may
// `defer` them, and the random clauses are fail-free.
const rowTexts = { Log: 'nofail Log', Tick: 'nofail Tick', Err: 'Fail(Err)',
  Oops: 'Fail(Oops)' };
const rowText = labels =>
  ['Console', ...[...labels].map(label => rowTexts[label])]
  .join(' + ');

const randomFn = (ctx, index) => {
  const row = new Set(ctx.r.shuffle(['Log', 'Tick', 'Err', 'Oops'])
    .filter(() => ctx.r.chance(35)));
  const params = ['a', 'b'].slice(0, ctx.r.int(3)).map(name => [name, 'Int']);
  const ret = ctx.r.pick(['Int', 'Unit']);
  const inner = { ...ctx, labels: row, locals: params.map(([name]) => name),
    failing: new Set(), lax: new Set() };
  return { name: `f${index}`, params, ret, retText: ret, row,
    rowText: rowText(row), body: genBlock(inner, 2, ret) };
};

// A function is written with its spelling scheme (test/fx-gen-names.mjs);
// one without (a hand-built test program) qualifies every operation.
const fnText = fn => {
  const row = fn.names?.rowText ?? fn.rowText;
  return `fn ${fn.name}(${fn.params.map(([name, type]) =>
    `${name}: ${type}`).join(', ')}): ${fn.retText}`
    + `${row ? ` with ${row}` : ''} = ${text(fn.body, speller(fn.names))};`;
};

// The program text: the fixed prelude, then the functions, then main.
// A program with no `defer` needs no mark, so it is written with plain
// labels (M) as every program without `defer` is. A function's marks follow
// its callees' (a plain label cannot call a `nofail` one), which the
// generator does not track, so the choice is per program. A random clause
// may fail (Task 11): the generator then keeps cleanup, and every call of a
// function whose row names the label, away from the frames that may fail
// (`ctx.failing`, test/fx-gen-expr.mjs).
export const render = ({ fns, main }) => {
  const body = [...fns.map(fnText), fnText(main)].join(' ');
  const types = body.includes('Note') ? prelude + noteType : prelude;
  return plainWithoutDefer(`${types} ${body}`);
};

const plainWithoutDefer = source =>
  (source.includes('defer') ? source : source.replace(/nofail /g, ''));

// Focus scenarios by index: every scenario recurs, and a terminal one
// (it ends the program with a defect) is paired with a regular one.
const focusOf = index => {
  const first = fragments[index % fragments.length];
  const second = regular[(index * 5 + 3) % regular.length];
  return first.terminal ? [second, first] : [first, second];
};

// Unconstrained, most cleanup scenarios (80%) sit under a fail-free user
// handler, so their cleanups may perform its label.
// Not those that may move the block into a function of their own, whose
// row would lack the label.
const wrappable = new Set(['cleanup-normal', 'cleanup-registration',
  'cleanup-unreached', 'cleanup-defect', 'cleanup-crash-normal',
  'cleanup-several-crashes']);
const made = (ctx, fragment) => {
  if (!ctx.shared.unconstrained || !wrappable.has(fragment.name)
    || !ctx.r.chance(80)) return fragment.make(ctx);
  const label = ctx.r.pick(['Log', 'Tick']);
  const make = label === 'Log' ? logHandler : tickHandler;
  const clause = make(ctx, 1);
  return withHandler(clause,
    block([doItem(fragment.make(installed(ctx, label, 'plain')))]));
};

const mainItems = (ctx, focus, extras) => {
  const regulars =
    ctx.r.shuffle([...focus.filter(f => !f.terminal), ...extras]);
  const items = regulars.map(fragment => doItem(made(ctx, fragment)));
  const noise =
    Array.from({ length: ctx.r.int(3) }, () => doItem(unitExpr(ctx, 2)));
  return ctx.r.shuffle([...items, ...noise]);
};

// options.unconstrained: cleanup ignores the failing frames (the one-way
// soundness differential, test/fx008-soundness.serial.test.mjs).
export const generate = (seed, index = seed, options = {}) => {
  const r = rng(seed);
  const shared = {
    counter: 0, extra: [], shapes: [], unconstrained: !!options.unconstrained };
  const spelling = namer(seed);
  const mainNames = scheme(spelling, 'Console');
  let ctx = { r, shared, labels: new Set(), locals: [], fns: [...known],
    failing: new Set(), lax: new Set(), spell: speller(mainNames) };
  const own = [];
  for (let count = r.int(3), position = 0; position < count; position++) {
    const fn = randomFn(ctx, position);
    own.push(fn);
    ctx = { ...ctx, fns: [...ctx.fns, fn] };
  }
  const focus = focusOf(index);
  const extras = r.chance(40) ? [r.pick(regular)] : [];
  if (r.chance(shared.unconstrained ? 40 : 15)) extras.push(failing);
  if (r.chance(70)) extras.push(texting);
  const items = mainItems(ctx, focus, extras);
  const terminal = focus.find(fragment => fragment.terminal);
  const ret = !terminal && r.chance(25) ? 'Int' : 'Unit';
  const ending = terminal ? [doItem(made(ctx, terminal))] : [];
  const value = ret === 'Int' ? intExpr(ctx, 2) : null;
  const body = block([...items, ...ending], value);
  const main = { name: 'main', params: [], retText: ret, rowText: 'Console',
    body, names: mainNames };
  const named = fn => ({ ...fn,
    names: scheme(spelling, fn.rowText, performedItems(fn.body)) });
  const program = { fns: [...own, ...shared.extra].map(named), main };
  return { seed, program, source: render(program), shapes: shared.shapes,
    focus: focus.map(fragment => fragment.name) };
};
