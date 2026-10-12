// Programs for test/fx008-scale.serial.test.mjs (FX008 Task 9, P11).
const head = 'effect Log { fn log(n: Int): Unit; }; ';
const numbers = (count, make) => Array.from({ length: count },
  (_, index) => make(index + 1));

// `count` defers in one fail-free function.
export const manyDefers = count => head + 'fn work(): Unit with nofail Log = { '
  + 'defer log(0); '.repeat(count) + '() }; fn main(): Int = 0;';

// `count` sequential installations in one declaration.
export const manyInstallations = count => head
  + 'effect Tick { fn tick(): Unit; }; '
  + 'fn main(): Unit with Console = with handler Log { log(n) => print(n) } { '
  + 'defer log(0); '
  + 'with handler Tick { tick() => log(1) } { tick() }; '.repeat(count)
  + '() };';

// A chain of `count` functions, each installing a forwarding handler.
export const forwardingChain = count => head
  + numbers(count - 1, index => `fn f${index}(): Unit with nofail Log = `
    + `with handler Log { log(n) => log(n) } { f${index + 1}() }; `).join('')
  + `fn f${count}(): Unit with nofail Log = { defer log(0); () }; `
  + 'fn main(): Unit with Console = '
  + 'with handler Log { log(n) => print(n) } { f1() };';

// Two functions over `count` mark variables each.
export const markVariables = count => {
  const row = prefix => numbers(count, index => `nofail(${prefix}${index}) Log`)
    .join(' + ');
  return head + `fn wide(): Unit with ${row('k')} = wide2(); `
    + `fn wide2(): Unit with ${row('j')} = (); fn main(): Int = 0;`;
};
