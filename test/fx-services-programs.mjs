import { readFileSync } from 'node:fs';

// FX001 Task 11 programs (acceptance scenario, design §5).
export const scenario = readFileSync('examples/services.wxw', 'utf8');

// What `main` prints. Live: each audit logs its fetch and stamp, then its
// cleanups in reverse order of the `defer`s (log, then closeLog), then the
// report's sum prints. Fake: stateless Database 7, Clock 0, Log discards.
export const realOutput = '2\n101\n1\n1001\n4\n102\n2\n1002\n206\n'
  + '6\n103\n3\n1003\n8\n104\n4\n1004\n214\n';
export const fakeOutput = '14\n14\n';

// Only the live handlers become fakes: the programs differ in one binding.
export const fake = scenario.replace('let live = true;', 'let live = false;');

// The same scenario with one handler dropped (the Clock one).
export const dropped = scenario
  .replace('with clock { with logger {', 'with logger {')
  .replace('} } }\n};', '} }\n};');

// The effect-free baseline (ruling F6): each operation a plain function
// parameter, each inline handler value inline lambdas of the operations'
// types, passed where the handler was installed. Same declaration names.
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

fn main(): Unit with Console = {
  let live = true;
  let query = if live then fn(id: Int) => id + id else fn(id: Int) => 7;
  let now = if live then fn(u: Unit) => 100 else fn(u: Unit) => 0;
  let log = if live then fn(n: Int) => () else fn(n: Int) => ();
  print(report(query, now, log, 1, 2));
  print(report(query, now, log, 3, 4))
};
`;
