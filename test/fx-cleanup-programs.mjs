// FX001 Task 8's executable cleanup programs, shared by
// test/fx-cleanup.test.mjs
// (Go) and test/fx-oracle.test.mjs (the reference interpreter):
// [name, prelude, body, exit status, stdout, stderr].
export const log = 'effect Log { fn log(n: Int): Unit; }; ';
export const ok = 0;
export const failed = 1;
export const unit = 'type E = E; ';
export const why = 'type Why = Busy | Slow; ';
export const db = 'type DbError = Timeout(Int) | Dead; ';

export const cases = [
  ['LIFO order', '', 'fn main(): Unit with Console = '
    + '{ defer Console.print(1); defer Console.print(2); Console.print(3) };',
  ok, '3\n2\n1\n', ''],
  ['an unreached defer never runs', unit,
    'fn work(): Unit with Fail(E) + Console = '
    + '{ defer Console.print(1); Fail.fail(E); defer Console.print(2); () }; '
    + 'fn main(): Unit with Console = '
    + 'handle work() { fail(error: E) => Console.print(9) };',
  ok, '1\n9\n', ''],
  ['two crashing defers on normal exit', why,
    'fn main(): Unit = { defer crash(Busy); defer crash(Slow); () };',
  failed, '', 'crash: Slow\ncleanup failed: crash: Busy\n'],
  ['abort with crashing cleanup', db + why,
    'fn work(): Unit with Fail(DbError) = '
    + '{ defer crash(Busy); Fail.fail(Timeout(3)) }; '
    + 'fn main(): Unit with Console = '
    + 'handle work() { fail(error: DbError) => Console.print(7) };',
  failed, '', 'fail(DbError): Timeout(3)\ncleanup failed: crash: Busy\n'],
  ['multiple recoverable defects in order', '',
    'fn inner(): Unit = { defer crash(1); defer crash(2); crash(3) }; '
    + 'fn main(): Unit = { defer crash(4); inner() };',
  failed, '', 'crash: 3\ncleanup failed: crash: 2\n'
    + 'cleanup failed: crash: 1\ncleanup failed: crash: 4\n'],
  ['cleanup handling its own failure while an abort is pending', unit
    + 'type F = F; ',
  'fn clean(): Unit with Console = '
    + 'handle Fail.fail(F) { fail(error: F) => Console.print(2) }; '
    + 'fn work(): Unit with Fail(E) + Console = '
    + '{ defer clean(); Console.print(1); Fail.fail(E) }; '
    + 'fn main(): Unit with Console = '
    + 'handle work() { fail(error: E) => Console.print(3) };',
  ok, '1\n2\n3\n', ''],
  ['cleanup uses the registration context during an abort', unit + log,
    'fn main(): Unit with Console = '
    + 'with handler Log { log(n) => Console.print(n) } { handle { { defer Log.log(1); '
    + 'with handler Log { log(n) => Console.print(n + 100) } { Fail.fail(E) } } } '
    + '{ fail(error: E) => Console.print(9) } };',
  ok, '1\n9\n', ''],
  ['crash is not caught by handle', unit,
    'fn main(): Unit with Console = '
    + '{ Console.print(0); handle crash(1) { fail(error: E) => Console.print(2) } };',
  failed, '0\n', 'crash: 1\n'],
  ['a payload holding a function is not printable',
    'type Boxed = Boxed(Int -> Int); ' + why,
    'fn work(): Unit with Fail(Boxed) = '
    + '{ defer crash(Busy); Fail.fail(Boxed(fn(x) => x)) }; '
    + 'fn main(): Unit = handle work() { fail(error: Boxed) => () };',
  failed, '', 'fail(Boxed): <not printable>\ncleanup failed: crash: Busy\n'],
  ['the payload type is printed with its arguments',
    'type Error(a) = Error(a); ' + why,
    'fn work(): Unit with Fail(Error(Int)) = '
    + '{ defer crash(Busy); Fail.fail(Error(5)) }; '
    + 'fn main(): Unit = handle work() { fail(error: Error(Int)) => () };',
  failed, '', 'fail(Error(Int)): Error(5)\ncleanup failed: crash: Busy\n'],
  ['a defer handling its own failure', unit,
    'fn main(): Unit with Console = { defer handle Fail.fail(E) '
    + '{ fail(error: E) => Console.print(1) }; Console.print(2) };',
  ok, '2\n1\n', ''],
  ['a defer performing a non-Fail effect', log,
    'fn work(): Unit with nofail Log = { defer Log.log(1); Log.log(2) }; '
    + 'fn main(): Unit with Console = '
    + 'with handler Log { log(n) => Console.print(n) } { work() };',
  ok, '2\n1\n', ''],
  ['a defer in a block of a function value', '',
    'fn main(): Unit with Console = '
    + '{ let f = fn(x) => { defer Console.print(x + 1); Console.print(x) }; f(1); f(5) };',
  ok, '1\n2\n5\n6\n', '']
];
