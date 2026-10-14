// FX008 whole-branch review M4: the reviewer's `nofail(k)` programs (p01,
// p02, p11, q03), each with the fail-free control that must be accepted.
// The soundness generator has no `nofail(k)` shape, so these stand for it
// (BACKLOG). Every program starts with the reviewer's header.
const header = 'type E = E; effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; };\n';

// A callback is `nofail(k)` in a parameter only; the callee installs a
// failing handler around it, so its defer runs under a failing frame.
const appFailing = header
  + 'fn app(f: Unit -> Unit with nofail(k) Log + Fail(E) + ...e): Unit '
  + 'with ...e = handle with handler Log { log(n) => Fail.fail(E) } '
  + '{ f(()) } { fail(e: E) => () };\n'
  + 'fn main(): Unit with Console = '
  + 'app(fn(u: Unit) => { defer Log.log(1); () });\n';
const appFailFree = header
  + 'fn app(f: Unit -> Unit with nofail(k) Log + ...e): Unit with ...e = '
  + 'with handler Log { log(n) => () } { f(()) };\n'
  + 'fn main(): Unit with Console = '
  + 'app(fn(u: Unit) => { defer Log.log(1); Console.print(5) });\n';

// Two callbacks share k; the defer is in one, the other only logs.
const bothCallbacks = 'fn both(f: Unit -> Unit with nofail(k) Log, '
  + 'g: Unit -> Unit with nofail(k) Log): Unit with nofail(k) Log = '
  + '{ f(()); g(()) };\n';
const twoFailing = header + bothCallbacks
  + 'fn main(): Unit with Console = handle with handler Log '
  + '{ log(n) => Fail.fail(E) } { both(fn(u: Unit) => { defer Log.log(1); () '
  + '}, '
  + 'fn(u: Unit) => Log.log(2)) } { fail(e: E) => Console.print(9) };\n';
const twoFailFree = header + bothCallbacks
  + 'fn main(): Unit with Console = with handler Log '
  + '{ log(n) => Console.print(n) } { both(fn(u: Unit) => { defer Log.log(1); '
  + '() }, '
  + 'fn(u: Unit) => Log.log(2)) };\n';

// A `nofail(k)` callback returned by a higher-order function, then called
// under a fail-free and under a failing handler.
const idK = header + 'fn id2(f: Unit -> Unit with nofail(k) Log + ...e): '
  + 'Unit -> Unit with nofail(k) Log + ...e = f;\n';
const returnedFailing = idK
  + 'fn main(): Unit with Console = handle { '
  + 'let g = id2(fn(u: Unit) => { defer Log.log(1); () }); '
  + 'with handler Log { log(n) => Console.print(n) } { g(()) }; '
  + 'with handler Log { log(n) => Fail.fail(E) } { g(()) } } '
  + '{ fail(e: E) => Console.print(9) };\n';
const returnedFailFree = idK
  + 'fn main(): Unit with Console = handle { '
  + 'let g = id2(fn(u: Unit) => { defer Log.log(1); () }); '
  + 'with handler Log { log(n) => Console.print(n) } { g(()) } } '
  + '{ fail(e: E) => Console.print(9) };\n';

// `nofail(k)` in a parameter handler's clause row; the clause defers.
const instK = header + 'fn inst(h: Handler(nofail Log with nofail(k) Tick '
  + '+ ...e)): Unit with nofail(k) Tick + ...e = with h { Log.log(1) };\n';
const clauseFailing = instK
  + 'fn main(): Unit with Console = handle with handler Tick '
  + '{ tick() => Fail.fail(E) } { inst(handler Log '
  + '{ log(n) => { defer Tick.tick(); () } }) } { fail(e: E) => '
  + 'Console.print(9) };\n';
const clauseFailFree = instK
  + 'fn main(): Unit with Console = handle with handler Tick '
  + '{ tick() => Console.print(7) } { inst(handler Log '
  + '{ log(n) => { defer Tick.tick(); () } }) } { fail(e: E) => '
  + 'Console.print(9) };\n';

export const rejected = [
  ['p01: a nofail(k) callback under a failing handler of the callee',
    appFailing],
  ['p02: two callbacks sharing k, one deferring, under a failing handler',
    twoFailing],
  ['p11: a returned nofail(k) callback called under a failing handler',
    returnedFailing],
  ['q03: nofail(k) in a handler parameter\'s clause row, failing Tick',
    clauseFailing]
];

export const accepted = [
  ['p01c: the callee\'s handler cannot fail', appFailFree, '5\n'],
  ['p02c: two callbacks sharing k, fail-free', twoFailFree, '1\n2\n'],
  ['p11c: a returned nofail(k) callback, fail-free', returnedFailFree, '1\n'],
  ['q03c: nofail(k) in a clause row, fail-free Tick', clauseFailFree, '7\n']
];
