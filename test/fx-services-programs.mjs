import { readFileSync } from 'node:fs';

// FX001 Task 11 programs (acceptance scenario, design §5).
export const scenario = readFileSync('examples/services.wxw', 'utf8');

// What `main` prints. Live: each audit logs its fetch and stamp, then its
// cleanups in reverse order of the `defer`s (log, then closeLog), then the
// report's sum prints. Fake: stateless Database 7, Clock 0, Log discards.
export const realOutput = '2\n101\n1\n1001\n4\n102\n2\n1002\n206\n'
  + '6\n103\n3\n1003\n8\n104\n4\n1004\n214\n';
export const fakeOutput = '14\n14\n';

// Fakes are constructed here and injected by their own `main`; the
// declarations are the example's, up to its first constructor.
const declarations = scenario.slice(0, scenario.indexOf('fn liveDatabase'));
const fakes = `fn fakeDatabase(): Handler(Database with pure) =
  handler Database { query(id) => 7 };

fn fixedClock(): Handler(Clock with pure) =
  handler Clock { now() => 0 };

fn silentLogger(): Handler(nofail Log with Console + ...e) =
  handler Log { log(n) => () };

`;
const injected = scenario.slice(scenario.indexOf('fn main'));
export const fake = declarations + fakes + injected
  .replace('liveDatabase', 'fakeDatabase').replace('systemClock', 'fixedClock')
  .replace('consoleLogger', 'silentLogger');

// The same scenario with one handler dropped (the Clock one).
export const dropped = scenario
  .replace('    with systemClock() {\n', '')
  .replace('      with consoleLogger() {', '    with consoleLogger() {')
  .replace('      }\n    }\n  };', '    }\n  };');

// The effect-free baseline (ruling F6): each operation a plain function
// parameter. Named constructors build the lambdas, and `main` passes them
// where the handlers were installed. Declaration names are the same.
// Every callback is `with pure`: a deferred callback of an open row (an
// ambient one, or `with Console`, which keeps a rigid tail) is rejected by
// the mark check, so the baseline's log lambda cannot print. Only its keys
// are compared with the scenario's, not its output.
export const baseline = `
fn closeLog(log: Int -> Unit with pure, id: Int): Unit with pure =
  log(id + 1000);

fn fetch(query: Int -> Int with pure, log: Int -> Unit with pure,
    id: Int): Int with pure = {
  let row = query(id);
  log(row);
  row
};

fn stamp(now: Unit -> Int with pure, log: Int -> Unit with pure,
    id: Int): Int with pure = {
  let at = now(());
  log(at + id);
  at
};

fn audited(query: Int -> Int with pure, now: Unit -> Int with pure,
    log: Int -> Unit with pure, id: Int): Int with pure = {
  defer closeLog(log, id);
  defer log(id);
  fetch(query, log, id) + stamp(now, log, id)
};

fn report(query: Int -> Int with pure, now: Unit -> Int with pure,
    log: Int -> Unit with pure, first: Int, second: Int): Int with pure =
  audited(query, now, log, first) + audited(query, now, log, second);

fn liveDatabase(): Int -> Int with pure = fn(id: Int) => id + id;

fn systemClock(): Unit -> Int with pure = fn(u: Unit) => 100;

fn consoleLogger(): Int -> Unit with pure = fn(n: Int) => ();

fn main(): Unit with Console = {
  let query = liveDatabase();
  let now = systemClock();
  let log = consoleLogger();
  print(report(query, now, log, 1, 2));
  print(report(query, now, log, 3, 4))
};
`;
