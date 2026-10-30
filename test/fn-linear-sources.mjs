// FN001 Task 8 Step 1b: the function forms of the Task 4 review's
// linear-cost table, as Waxwing source at any width. A named callee's
// parameters stay an array when called directly; the curried arrow is built
// only for a value reference or a partial application, and every pass walks
// its result spine with a loop (plan, Global Constraint "Linear cost").
// No compiled module is imported, so regression probes can use the forms
// with the compiler they are given.

const ints = count => Array(count).fill('Int').join(', ');
const numbers = (low, high) => Array.from({ length: high - low },
  (_, index) => low + index + 1).join(', ');
const declaration = count => `fn f(${Array.from({ length: count },
  (_, index) => `p${index}: Int`).join(', ')}): Int = p0 + p${count - 1}; `;

// Each form maps a width to a source; `mismatch` is rejected (E_TYPE), the
// others are accepted.
export const forms = {
  value: count => `${declaration(count)}fn g(h: (${ints(count)}) -> Int)`
    + ': Int = 0; fn main(): Int = g(f);',
  over: count => `${declaration(count)}fn id(x: a): a = x; `
    + `fn main(): Int = id(f, ${numbers(0, count)});`,
  lambda: count => `fn main(): Int = (fn(${Array.from({ length: count },
    (_, index) => `x${index}`).join(', ')}) => x0)(${numbers(0, count)});`,
  mismatch: count => `${declaration(count)}fn main(): Int = f(1);`,
  partialFirst: count => `${declaration(count)}fn g(h: (${ints(count - 1)})`
    + ' -> Int): Int = 0; fn main(): Int = g(f(1));',
  partialAll: count => `${declaration(count)}fn g(h: Int -> Int): Int = `
    + `h(5); fn main(): Int = g(f(${numbers(0, count - 1)}));`,
  parenthesized: count => `${declaration(count)}fn main(): Int = `
    + `(f)(${numbers(0, count)});`,
  pipe: count => `${declaration(count)}fn main(): Int = `
    + `1 |> f(${numbers(1, count)});`
};

export const expectedOutcome = name => name === 'mismatch' ? 'E_TYPE' : 'ok';

// The partialFirst growth check (fn-linear-growth.serial.test.mjs and the
// regression row partialfirst-growth): t(large) / t(small) must not exceed
// the threshold. Linear time doubles and quadratic quadruples. The
// threshold is reviewed, not machine-checked (docs/engineering.md).
export const partialFirstGrowth = { small: 10000, large: 20000,
  threshold: 3.0 };
