// The 5,000-parameter mixed-body program of FN001 Task 6 (design §13): Int,
// Bool and list parameters, each read twice out of order, called directly
// and used as a staged value. Shared by fn-scale.serial.test.mjs and
// fn-scale.perf.test.mjs so both run the same workload.
const parameterCount = 5000;
const kinds = ['Int', 'Bool', 'List(Int)'];
const stride = 7919;

const kindOf = index => kinds[index % kinds.length];
const indices = Array.from({ length: parameterCount }, (_, index) => index);
// As Task 1's mixed body (scripts/stage-shared.mjs): a Bool is read
// through a helper call.
const term = index => [`p${index}`, `pick(p${index}, ${index})`,
  `head(p${index})`][index % kinds.length];
// Each parameter twice, in a strided order, summed by a balanced tree.
const order = Array.from({ length: 2 * parameterCount },
  (_, step) => (step * stride) % parameterCount);
const balanced = (low, high) => (high - low === 1 ? term(order[low])
  : `(${balanced(low, low + Math.floor((high - low) / 2))} + `
    + `${balanced(low + Math.floor((high - low) / 2), high)})`);

const argument = (index, variant) => [`${(index + variant) % 97}`,
  (index + variant) % 2 === 0 ? 'true' : 'false',
  `Cons(${(index + variant) % 89}, Nil)`][index % kinds.length];
const valueOf = (index, variant) => [(index + variant) % 97,
  (index + variant) % 2 === 0 ? index : 0,
  (index + variant) % 89][index % kinds.length];
const call = variant => indices.map(index => argument(index, variant))
  .join(', ');
export const expected = [0, 1].reduce((total, variant) => total
  + 2 * indices.reduce((sum, index) => sum + valueOf(index, variant), 0), 0);

export const source = 'type List(a) = Nil | Cons(a, List(a)); '
  + 'fn head(xs: List(Int)): Int = match xs { Nil => 0, Cons(x, _) => x }; '
  + 'fn pick(b: Bool, w: Int): Int = if b then w else 0; '
  + `fn f(${indices.map(index => `p${index}: ${kindOf(index)}`).join(', ')})`
  + `: Int = ${balanced(0, order.length)}; `
  + `fn apply(g: (${indices.map(kindOf).join(', ')}) -> Int): Int = `
  + `g(${call(1)}); fn main(): Int = f(${call(0)}) + apply(f);`;
