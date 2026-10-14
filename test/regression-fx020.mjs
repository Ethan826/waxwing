// FX020 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-fx020.mjs. Each uses only the compiler
// under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

const detected = context =>
  console.log(`${context.probe} regression detects the defect`);

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const audit = 'effect Audit { fn log(n: Int): Unit; }; ';

// The wire form of a rejection, or null when the program was accepted.
const wired = (context, source) => {
  const result = context.compile(source);
  return result instanceof context.Left ? context.wire(result.value0) : null;
};

const bareRefused = (source, message, failure) => context => {
  const found = wired(context, source);
  if (found === null || found.code !== 'E_UNBOUND'
    || found.message !== message) {
    fail(`${failure}: ${JSON.stringify(found)}`);
  }
  detected(context);
};

// A mutant may emit Go that fails to build; the reason is then printed.
const prints = (source, expected, failure) => context => {
  let output;
  try { output = context.printed(source); } catch (error) {
    output = error.message;
  }
  if (output !== expected) fail(`${failure}: ${JSON.stringify(output)}`);
  detected(context);
};

export const fx020Probes = {
  // `log(1)` in a function `with Log` must not reach Audit, nor anything.
  'fx020-first-declaration': bareRefused(
    audit + log + 'fn work(): Unit with Log = log(1); '
    + 'fn main(): Int = 0;',
    'Unbound function log; use Audit.log or Log.log, or import one with '
    + 'Audit { log } or Log { log }', 'bare operation resolved'),
  // `fn log` beside `Log.log`: each name reaches its own declaration.
  'fx020-function-wins': prints(
    log + 'fn log(n: Int): Int = n + 1; fn main(): Unit with Console = '
    + 'with handler Log { log(n) => Console.print(n + 10) } '
    + '{ Console.print(log(1)); Log.log(2) };',
    '2\n12\n', 'function won over operation'),
  // `Database.query` resolves whether or not the row names Database.
  'fx020-row-dependent': context => {
    const source = 'effect Database { fn query(id: Int): Int; }; '
      + 'fn f(): Int = Database.query(1); fn main(): Int = 0;';
    const found = wired(context, source);
    if (found === null || found.code !== 'E_EFFECT' || found.message
      !== 'f performs Database, which its signature does not allow') {
      fail(`operation resolved by the row: ${JSON.stringify(found)}`);
    }
    detected(context);
  }
};
