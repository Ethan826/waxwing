// FX001 Task 12 regression probes for the emitted Go, imported by
// test/regression-fx.mjs; the rows are in scripts/regression-fx-go.mjs. Each
// compiles and runs a program with the compiler under test only.
const fail = message => {
  console.error(message);
  process.exit(1);
};

// The program must print exactly `expected`; a rejection or a Go build
// failure is reported under the same label.
const prints = (source, expected, label) => context => {
  let output;
  try {
    output = context.printed(source);
  } catch (error) {
    fail(`${label}: ${String(error.message).split('\n')[0]}`);
  }
  if (output !== expected) fail(`${label}: ${JSON.stringify(output)}`);
  console.log(`${context.probe} regression detects the defect`);
};

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const unit = 'type E = E; ';
const db = 'type DbError = DbError; ';

// The inner clause forwards to the next outer Log handler (printing n - 1
// there); in its own context it would count down to 0 and print 7.
const clauseContext = log + 'fn main(): Unit with Console = '
  + 'with handler Log { log(n) => Console.print(n) } { with handler Log '
  + '{ log(n) => match n { 0 => Console.print(7), _ => Log.log(n + -1) } } { '
  + 'Log.log(2) } };';

// The outer `handle` takes an abort raised by a clause, past the inner one.
const abortTarget = db + log + 'fn main(): Unit with Console = handle '
  + '{ with handler Log { log(n) => Fail.fail(DbError) } { handle Log.log(1) '
  + '{ fail(error: DbError) => Console.print(1) } } } '
  + '{ fail(error: DbError) => Console.print(2) };';

const clauseOrder = 'type Error(a) = Error(a); fn main(): Int = '
  + 'handle Fail.fail(Error(5)) { fail(e: Error(Int)) => match e { Error(n) '
  + '=> n }, '
  + 'fail(e: Error(Bool)) => 2 };';

const cleanupContext = unit + log + 'fn main(): Unit with Console = '
  + 'with handler Log { log(n) => Console.print(n) } { handle { { defer '
  + 'Log.log(1); '
  + 'with handler Log { log(n) => Console.print(n + 100) } { Fail.fail(E) } } '
  + '} '
  + '{ fail(error: E) => Console.print(9) } };';

// An abort with a crashing cleanup: the abort heads the report and the
// cleanup defect keeps the exit status at 1 (its `handle` would print 7).
const abortThenCrash = db + 'type Why = Busy; fn work(): Unit with '
  + 'Fail(DbError) = { defer crash(Busy); Fail.fail(DbError) }; '
  + 'fn main(): Unit with Console = handle work() '
  + '{ fail(error: DbError) => Console.print(7) };';
const abortReport = 'fail(DbError): DbError\ncleanup failed: crash: Busy\n';

const reported = context => {
  const result = context.compile(abortThenCrash);
  if (!(result instanceof context.Right)) fail('cleanup report: rejected');
  const run = context.ran(result.value0);
  if (run.status !== 1) {
    fail(`abort delivered despite a cleanup defect: ${JSON.stringify(run)}`);
  }
  // `go run` appends its own `exit status 1` line.
  const report = run.output.replace(/exit status 1\n$/, '');
  if (report !== abortReport) {
    fail(`pending cause dropped: ${JSON.stringify(report)}`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

export const goProbes = {
  'fx-clause-context': prints(clauseContext, '1\n', 'clause context'),
  'fx-abort-target': prints(abortTarget, '2\n', 'abort target'),
  'fx-clause-order': prints(clauseOrder, '5\n', 'clause order'),
  'fx-cleanup-context': prints(cleanupContext, '1\n9\n', 'cleanup context'),
  'fx-cleanup-cause': reported,
  'fx-cleanup-defect': reported,
  'fx-ctx-reachable': prints(log + 'fn unused(): Unit with Log = Log.log(1); '
    + 'fn main(): Int = 7;', '7\n', 'ctx mode by reachability')
};
