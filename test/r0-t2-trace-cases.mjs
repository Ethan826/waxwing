// Tranche 2 Task 6 (design §C.1-§C.6, Task 3c; dossier §18.155 (3),
// (4)): the trace's fixtures and checks, shared by
// test/r0-t2-trace.test.mjs and the restored-defect probes
// (test/regression-r0-t2-trace.mjs). `traceCases(load)` takes a module
// loader, so a probe reads the compiler under test only. Each check
// returns the names of the cases that differ (empty when all hold).
// Fixture-level.
const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${JSON.stringify(result.value0)}`);
  return result.value0;
};

export const sources = {
  slots: `effect Log { fn log(n: Int): Unit; };
fn pick(x: a, y: b): a = x;
fn one(u: Unit): Int with Log = { Log.log(1); 1 };
fn run(cb: Unit -> Int with ...e): Int with ...e = cb(());
fn add(x: Int, y: Int): Int = x + y;
fn f(): Int = pick(1, true);
fn g(): Int with Log = run(one);
fn part(): Int -> Int = add(1);
fn inc(x: Int): Int with Log = { Log.log(x); x + 1 };
fn piped(): Int with Log = 1 |> inc;
fn main(): Unit with Console = Console.print(1);
`,
  holes: `type List(a) = Nil | Cons(a, List(a));
fn length(xs: List(a)): Int = match xs {
  Nil => 0,
  Cons(_, rest) => 1 + length(rest),
};
fn f(): Int = length(Nil);
fn add(x: Int, y: Int): Int = x + y;
fn e(): Int -> Int = add(length(Nil));
fn main(): Unit with Console = Console.print(1);
`,
  // Values `State` alone held before the extension (Task 6b): clause
  // entries, installations and deferrals.
  state: `effect Log { fn log(n: Int): Unit; };
effect Tick { fn tick(): Unit; };
fn handled(): Unit with Tick =
  with handler Log { log(n) => Tick.tick() } { Log.log(1) };
fn nested(): Unit with Tick =
  with handler Log { log(n) => Tick.tick() }
  { with handler Log { log(n) => Log.log(n) } { Log.log(2) } };
fn deferred(): Unit with Console = { defer Console.print(1); () };
fn main(): Unit with Console = Console.print(1);
`,
  // State values whose metas the body shares, or does not.
  shared: `effect Log { fn log(n: Int): Unit; };
fn lam(): Unit = { let k = fn(h: Handler(Log)) => with h { Log.log(1) }; () };
fn mk(): Unit = { let v = handler Log { log(n) => () }; () };
fn main(): Unit with Console = Console.print(1);
`,
  // research/t2-read-back-review/over-applied.wxw.txt, copied.
  over: `effect Log { fn log(n: Int): Unit; };
fn add(x: Int, y: Int): Int = x + y;
fn two(a: Int, b: Int): Int -> Int = add(a + b);
fn inc(x: Int): Int with Log = { Log.log(x); x + 1 };
fn overTwo(): Int = two(1, 2, 3);
fn inFirst(): Int with Log = two(inc(1), 2, 3);
fn inExtra(): Int with Log = two(1, 2, inc(3));
fn main(): Unit with Console =
  with handler Log { log(n) => Console.print(n) }
  { Console.print(overTwo() + inFirst() + inExtra()) };
`
};

// The over-applied calls: the call, its extra argument, and the labels
// the extra stage's row reads (design §C.2's observed reading).
export const overCases = [['overTwo', 'two(1, 2, 3)', '3', 0],
  ['inFirst', 'two(inc(1), 2, 3)', '3', 1],
  ['inExtra', 'two(1, 2, inc(3))', 'inc(3)', 1]];

// The span of the `nth` occurrence of `text` in `source`, as
// "start-end" offsets (end exclusive).
export const spanOf = (source, text, nth = 0) => {
  let at = -1;
  for (let seen = 0; seen <= nth; seen += 1) at = source.indexOf(text, at + 1);
  if (at < 0) throw new Error(`no ${text} in the source`);
  return `${at}-${at + text.length}`;
};

// The checked expression record at `key` ("start-end") in a body.
export const exprAt = (value, key) => {
  if (value === null || typeof value !== 'object') return undefined;
  if (value.span !== undefined && value.ty !== undefined
    && `${value.span.start.offset}-${value.span.end.offset}` === key)
    return value;
  for (const part of Object.values(value)) {
    const found = exprAt(part, key);
    if (found !== undefined) return found;
  }
  return undefined;
};

export const traceCases = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const Maps = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const Holes = await load('Features.Check.Holes');
  const Core = await load('Domain.Type.Core');
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const keyText = key => `${key.value0}-${key.value1}`;
  const arrow = row => new Core.TFun(Core.TUnit.value, row, Core.TUnit.value);

  // `recheck`'s result for the named declaration, its Traced maps keyed
  // by "start-end" text ("start-end start-end" for an applied row).
  const traced = (source, name) => {
    const program = right(resolve(right(parse(source), 'parse')),
      'resolve');
    const decl = program.functions.find(item => item.name === name);
    const found = right(Function.recheck(functional(program.ctors))(
      program)(decl), 'recheck');
    const { uses, applied, piped } = found.trace;
    const bySpan = map => new Map(pairs(map).map(([k, v]) =>
      [keyText(k), v]));
    return { found,
      clauses: bySpan(found.trace.clauses),
      deferrals: bySpan(found.trace.deferrals),
      installations: bySpan(found.trace.installations),
      uses: new Map(pairs(uses).map(([k, v]) => [keyText(k), v])),
      applied: new Map(pairs(applied).map(([k, v]) =>
        [`${keyText(k.value0)} ${keyText(k.value1)}`, v])),
      piped: new Map(pairs(piped).map(([k, v]) => [keyText(k), v])) };
  };

  // Every hole occurrence in the finished trace, in the extension order
  // of design §C.3: uses, then applied, then piped, each in key order;
  // within a use, slots, opened tail, stages, fields, result.
  const metasInOrder = item => {
    const found = [];
    const visit = ty => Holes.foldHoles(seen => meta => {
      seen.push(meta);
      return seen;
    })(found)(ty);
    const visitSlot = slot => visit(slot.constructor.name === 'RowSlot'
      ? arrow(slot.value0) : slot.value0);
    for (const list of item.uses.values()) for (const use of list) {
      use.slots.forEach(visitSlot);
      if (use.opened.constructor.name === 'Just')
        visit(arrow(use.opened.value0));
      use.stages.forEach(row => visit(arrow(row)));
      use.fields.forEach(visit);
      visit(use.result);
    }
    for (const list of [...item.applied.values(), ...item.piped.values()])
      list.forEach(row => visit(arrow(row)));
    for (const list of item.clauses.values()) for (const entry of list)
      [entry.row, entry.inference, entry.clauses].forEach(row =>
        visit(arrow(row)));
    for (const list of item.deferrals.values())
      list.forEach(row => visit(arrow(row)));
    for (const list of item.installations.values())
      list.forEach(entry => visit(arrow(entry.current)));
    return found;
  };
  const bodyHoleCount = item =>
    Maps.size(Holes.numbering(item.found.function.body));

  // Each over-applied call's extra stage under its own (span, argument
  // span) key, one entry, beside the saturated call's one use entry.
  const appliedWrong = () => overCases.filter(([name, call, extra,
    labels]) => {
    const item = traced(sources.over, name);
    const callSpan = spanOf(sources.over, call);
    const start = Number(callSpan.split('-')[0]) + call.lastIndexOf(extra);
    const key = `${callSpan} ${start}-${start + extra.length}`;
    const rows = item.applied.get(key) ?? [];
    return item.applied.size !== 1 || rows.length !== 1
      || rows[0].value0.length !== labels
      || (item.uses.get(callSpan) ?? []).length !== 1;
  }).map(([name]) => name);

  // `f`'s `Nil` and `length` share one unsolved meta, which the body
  // numbers: both slots read the hole of `Nil`'s type in the body.
  const renumberWrong = () => {
    const item = traced(sources.holes, 'f');
    const call = spanOf(sources.holes, 'length(Nil)');
    const start = Number(call.split('-')[0]) + 'length('.length;
    const nil = `${start}-${start + 'Nil'.length}`;
    const node = exprAt(item.found.function.body, nil);
    const hole = node.ty.value1[0].value0.value0;
    const slotOf = key => item.uses.get(key)[0].slots[0].value0.value0;
    return [['Nil', slotOf(nil)], ['length', slotOf(call)]]
      .filter(([, slot]) => slot === undefined || slot.value0 !== hole
        || hole >= bodyHoleCount(item)).map(([name]) => name);
  };
  // `handled`'s clause entry under its clause's span, one entry, its
  // own row holding the clause body's `Tick`.
  const clauseWrong = () => {
    const item = traced(sources.state, 'handled');
    const key = spanOf(sources.state, 'log(n) => Tick.tick()');
    const list = item.clauses.get(key) ?? [];
    return [['one clause key', item.clauses.size === 1],
      ['one entry', list.length === 1],
      ['row reads Tick', list.length === 1
        && list[0].row.value0.length === 1]]
      .filter(([, held]) => !held).map(([name]) => name);
  };
  return { traced, metasInOrder, bodyHoleCount, appliedWrong,
    renumberWrong, clauseWrong, Core };
};
