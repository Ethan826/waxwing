import { readFileSync } from 'node:fs';

// FX008 Task 9 programs, shared by the defer tests and the regression
// probes (scripts/regression-fx008-marks.mjs). Sources of the review's
// probes are read from test/fx008-probes.
export const probe = name => readFileSync(`test/fx008-probes/${name}.wxw`,
  'utf8');

export const head = 'type E = E; effect Log { fn log(n: Int): Unit; }; ';
const handled = ' { fail(error: E) => print(9) }';

export const deferLog =
  'defer must not fail, but it performs Log, whose handler may fail';

// q1 with `nofail` on `prefix` and `run`: I2 and N5 (design §6).
export const q1Nofail = probe('design-review/q1')
  .replace('Handler(Log with Log) with pure',
    'Handler(nofail Log with Log) with pure')
  .replace('Unit with Log + ...e =', 'Unit with nofail Log + ...e =');

export const forwardingIntoFailing = head
  + 'fn main(): Unit with Console = handle { '
  + 'with handler Log { log(n) => fail(E) } { '
  + 'with handler Log { log(n) => log(n + 1) } { defer log(1); () } } }'
  + handled + ';';

export const forwardingFailFree = forwardingIntoFailing
  .replace('log(n) => fail(E)', 'log(n) => print(n)');

export const ambientCallback = head
  + 'fn f(cb: Unit -> Unit): Unit = with handler Log { log(n) => cb(()) } '
  + '{ defer log(1); () }; '
  + 'fn main(): Unit with Console = f(fn(u: Unit) => print(1));';

export const rigidVariable = head
  + 'fn f(): Unit with nofail(k) Log = { defer log(1); () }; '
  + 'fn main(): Int = 0;';

export const nofailCall = head
  + 'fn work(): Unit with nofail Log = (); '
  + 'fn caller(): Unit with Log = work(); fn main(): Int = 0;';

export const failFreeLiteral = head
  + 'fn mk(): Handler(nofail Log with Fail(E)) = '
  + 'handler Log { log(n) => fail(E) }; fn main(): Int = 0;';

export const aroundBoth = head
  + 'fn prefix(): Handler(nofail Log with Log) with pure = '
  + 'handler Log { log(n) => log(n + 100) }; '
  + 'fn around(body: Unit -> Unit with nofail(k) Log + nofail(k) Log + ...e): '
  + 'Unit with nofail(k) Log + ...e = with prefix() { body(()) }; '
  + 'fn main(): Unit with Console = handle { '
  + 'with handler Log { log(n) => print(n) } '
  + '{ around(fn(u: Unit) => { defer log(1); () }) }; '
  + 'with handler Log { log(n) => fail(E) } '
  + '{ around(fn(u: Unit) => log(2)) } }' + handled + ';';

export const consoleCleanup = 'fn f(): Unit with Console = '
  + '{ defer print(1); print(2) }; fn main(): Unit with Console = f();';

const inner = 'with handler Log { log(n) => { defer log(n + 1); () } } '
  + '{ log(1) }';
export const clauseDefer = head + 'fn main(): Unit with Console = '
  + `with handler Log { log(n) => print(n) } { ${inner} };`;
export const clauseDeferFailing = head + 'fn main(): Unit with Console = '
  + `handle with handler Log { log(n) => fail(E) } { ${inner} }` + handled
    + ';';

export const count = head + 'fn count(n: Int): Unit with nofail Log = '
  + 'if n == 0 then () else ({ defer log(n); count(n + -1) }); '
  + 'fn main(): Unit with Console = '
  + 'with handler Log { log(n) => print(n) } { count(3) };';

export const pass = head + 'fn pass(n: Int): Unit with nofail(k) Log = '
  + 'if n == 0 then log(0) else pass2(n + -1); '
  + 'fn pass2(n: Int): Unit with nofail(k) Log = pass(n); '
  + 'fn main(): Unit with Console = '
  + 'with handler Log { log(n) => print(n) } { pass(3) };';

// The same programs with every mark removed, to compare their Go.
export const unmarked = source => source.replace(/nofail(\(\w+\))? /g, '');

const box = 'type Box = Box(Handler(nofail Log with pure)); ';
const using = clause => head + box + 'fn main(): Unit = match '
  + `Box(handler Log { log(n) => ${clause} }) `
  + '{ Box(h) => with h { defer log(1); () } };';
export const boxPlain = using('()');
export const boxOwnFailure = using('handle fail(E) { fail(e: E) => () }');
export const boxCrash = using('crash(1)');
export const boxPlainParameter = head + box
  + 'fn f(h: Handler(Log with pure)): Unit = match Box(h) { Box(x) => () }; '
  + 'fn main(): Int = 0;';

// A local lambda's row takes copies of the first context's remaining labels
// (review I1): were the marks shared, the failing Tick handler of the second
// use would reach the deferred tick of the first.
export const copies = 'type E = E; effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; fn main(): Unit with Console = handle { '
  + 'let k = fn(u: Unit) => log(1); '
  + 'with handler Tick { tick() => print(5) } { '
  + 'with handler Log { log(n) => print(n) } { defer tick(); k(()) } }; '
  + 'with handler Tick { tick() => fail(E) } { '
  + 'with handler Log { log(n) => print(n) } { k(()) } } '
  + '} { fail(error: E) => print(9) };';

// Task 9 review C1: a handler passed through a generic function and
// installed from its result. The result type's C is its own (design §3.4),
// so a clause that fails in the caller's context gives an M frame.
const rest = 'type E = E; effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; ';
const identity = 'fn id(h: Handler(nofail Log with ...e)): '
  + 'Handler(nofail Log with ...e) with pure = h; ';
const under = (clause, body) => 'fn main(): Unit with Console = handle '
  + `with handler Tick { tick() => ${clause} } { ${body} }`
  + ' { fail(error: E) => print(9) };';
const lambda = (parameter, use) => `let run = fn(${parameter}) => ${use}; `;
const via = (parameter, handled) => 'fn main(): Unit with Console = handle { '
  + lambda(parameter, `with ${handled} { defer log(1); () }`)
  + 'with handler Tick { tick() => TICK } { run(handler Log { log(n) => ' +
    'tick() }) } }'
  + ' { fail(error: E) => print(9) };';
const failing = source => source.replace('TICK', 'fail(E)');
export const a1 = rest + identity + via('x: Handler(nofail Log)', 'id(x)')
  .replace('TICK', 'fail(E)');
export const a1Control = rest + identity
  + via('x: Handler(nofail Log)', 'id(x)')
  .replace('TICK', 'print(5)');
export const a4 = rest + identity + failing(via('x', 'id(x)'));
export const a6 = rest + identity + 'fn main(): Unit with Console = handle { '
  + lambda('x: Handler(nofail Log)', 'with id(x) { defer log(1); () }')
  + 'with handler Log { log(n) => fail(E) } { with handler Tick { tick() => ' +
    'log(5) } '
  + '{ run(handler Log { log(n) => tick() }) } } } { fail(error: E) => ' +
    'print(9) };';
export const a8 = rest + 'fn later(h: Handler(nofail Log with ...e)): '
  + 'Unit -> Handler(nofail Log with ...e) with pure = fn(u: Unit) => h; '
  + failing(via('x: Handler(nofail Log)', 'later(x)(())'));
export const a9 = rest + 'type Box(a) = Box(a); '
  + 'fn boxed(h: Handler(nofail Log with ...e)): '
  + 'Box(Handler(nofail Log with ...e)) with pure = Box(h); '
  + failing(via('x: Handler(nofail Log)', 'match boxed(x) { Box(h) => h }'));
export const a3c = rest + 'type Box(a) = Box(a); '
  + 'fn unbox(b: Box(Handler(nofail Log with ...e))): '
  + 'Handler(nofail Log with ...e) with pure = match b { Box(h) => h }; '
  + failing(via('x: Handler(nofail Log)', 'unbox(Box(x))'));
export const a10 = rest + identity
  + 'fn g(x: Handler(nofail Log with ...e)): Unit with ...e = { '
  + lambda('y: Handler(nofail Log)', 'with id(y) { defer log(1); () }')
  + 'run(x) }; fn main(): Unit with Console = handle with handler Tick '
  + '{ tick() => fail(E) } { g(handler Log { log(n) => tick() }) } '
  + '{ fail(error: E) => print(9) };';
// The result's own row mentions the tail: a check of parameters alone
// closes C and accepts this (review C1, "the own row matters").
export const ownRow = rest + 'effect Get(a) { fn get(): a; }; '
  + 'fn mk(): Handler(nofail Log with ...e) with '
  + 'Get(Handler(nofail Log with ...e)) + ...e = get(); '
  + 'fn main(): Unit with Console = handle with handler Tick '
  + '{ tick() => fail(E) } { with handler Get(Handler(nofail Log with Tick '
  + '+ Fail(E) + Console)) { get() => handler Log { log(n) => tick() } } '
  + '{ with mk() { defer log(1); () } } } { fail(error: E) => print(9) };';

// Round 2 (review C2): a result C closed at the use broke programs with no
// `defer` that merge a handler result with another handler value (§6).
// r1, r2 and r9 are accepted with the base build's output.
const stdMain = (value, body) => 'fn main(): Unit with Console = handle with '
  + `handler Tick { tick() => fail(E) } { ${value} } `
  + '{ fail(error: E) => print(9) };';
export const r1 = rest
  + 'fn mk(): Handler(Log with ...e) with pure = handler Log { log(n) => () }; '
  + 'fn pick(b: Bool, x: Handler(Log with ...e)): Handler(Log with ...e) '
  + 'with pure = if b then mk() else x; '
  + 'fn main(): Unit with Console = with handler Log { log(n) => print(n) } '
  + '{ with pick(true, handler Log { log(n) => log(n + 1) }) { log(1) } };';
export const r2 = rest
  + 'fn mk(): Handler(Log with Tick + ...e) with pure = '
  + 'handler Log { log(n) => tick() }; '
  + 'fn run(x: Handler(Log with Tick + ...e)): Unit with Tick + ...e = '
  + '{ let h = if true then mk() else x; with h { log(1) } }; '
  + 'fn main(): Unit with Console = with handler Tick { tick() => print(3) } '
  + '{ run(handler Log { log(n) => tick() }) };';
export const r9 = rest
  + 'fn mk(): Handler(Log with Tick) with pure = handler Log { log(n) => () }; '
  + 'fn main(): Unit with Console = with handler Tick { tick() => print(3) } '
  + '{ let h = if true then handler Log { log(n) => { tick(); print(n) } } '
  + 'else mk(); with h { log(1) } };';
export const r5 = rest
  + 'fn mk(): Handler(nofail Log with ...e) with pure = handler Log { log(n) ' +
    '=> () }; '
  + 'fn g(x: Handler(nofail Log with ...e)): Unit with ...e = '
  + '{ let h = if true then mk() else x; with h { defer log(1); () } }; '
  + stdMain('g(handler Log { log(n) => tick() })');

// Task 10: `count` let-bound lambdas, each installing a forwarding handler
// and calling the previous one; the first defers, under a failing handler.
export const chain = count => head + 'fn main(): Unit with Console = handle '
  + 'with handler Log { log(n) => fail(E) } { '
  + 'let f0 = fn(u: Unit) => { defer log(0); () }; '
  + Array.from({ length: count }, (_, at) => `let f${at + 1} = fn(u: Unit) => `
    + `with handler Log { log(n) => log(n) } { f${at}(()) }; `).join('')
  + `f${count}(()) }` + handled + ';';
