// FX001 Task 11 scale programs (design §5, "Scale, attributed separately").
// Each prints one checked number, so the run folds its results into output.
export const installs = 1000000;
export const performs = 1000000;
export const depth = 100;
export const frames = 1000;
export const caughtFailures = 100000;

const tick = 'effect Tick { fn tick(): Int; }; ';
const boom = 'type Boom = Boom; type Other = Other; ';

// Installation: shallow `with` installs, none nested in another.
export const installation = tick
  + 'fn step(n: Int): Int = with handler Tick { tick() => 1 } { tick() }; '
  + 'fn install(n: Int, acc: Int): Int = '
  + 'if n == 0 then acc else install(n + -1, acc + step(n)); '
  + `fn main(): Int = install(${installs}, 0);`;

// Lookup: one context `depth` frames deep, built once; `measure` then
// performs `performs` operations that all resolve to the outermost frame.
export const lookup = 'effect Target { fn get(): Int; }; '
  + 'effect Noise { fn noise(): Int; }; '
  + 'fn measure(n: Int, acc: Int): Int with Target = '
  + 'if n == 0 then acc else measure(n + -1, acc + get()); '
  + 'fn deep(n: Int): Int with Target = if n == 0 then measure(' + performs
  + ', 0) else with handler Noise { noise() => n } { deep(n + -1) }; '
  + `fn main(): Int = with handler Target { get() => 1 } { deep(${depth}) };`;

// Unwinding: one `fail` through `frames` unrelated `handle` frames ...
export const unwinding = boom
  + 'fn nest(n: Int): Int with Fail(Boom) = if n == 0 then fail(Boom) '
  + 'else handle nest(n + -1) { fail(error: Other) => 0 }; '
  + `fn main(): Int = handle nest(${frames}) { fail(error: Boom) => 7 };`;

// ... separately from many caught failures, each across no frames.
export const caught = boom
  + 'fn catch(n: Int, acc: Int): Int = if n == 0 then acc else '
  + 'catch(n + -1, acc + (handle fail(Boom) { fail(error: Boom) => 1 })); '
  + `fn main(): Int = catch(${caughtFailures}, 0);`;

export const expected = new Map([[installation, installs],
  [lookup, performs], [unwinding, 7], [caught, caughtFailures]]);
