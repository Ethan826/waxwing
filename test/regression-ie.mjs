// FX025, R015, R016, R017 and R010 regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-ie.mjs.
// Each uses only the compiler under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

// The compiler's rejection, or `accepted`.
const outcome = (context, source) => {
  const result = context.compile(source);
  if (!(result instanceof context.Left)) return 'accepted';
  const wired = context.wire(result.value0);
  return `${wired.code} ${wired.message}`;
};

const expect = (context, label, source, wanted) => {
  const found = outcome(context, source);
  if (found !== wanted) fail(`${label}: ${found}`);
  console.log(`${context.probe} regression detects the defect`);
};

const main = ' fn main(): Int = 0;';
const sort = 'E_TYPE Expected a type, found an effect row';
const recursive = name => `E_SPECIALIZATION Recursive call to ${name} `
  + 'changes its type arguments';

export const ieProbes = {
  // An unbound effect row variable is the unbound type variable of a
  // record tail, not an internal error.
  'fx025-unbound-row': context => expect(context, 'unbound row',
    `type W = W((Int) -> Int with ...z);${main}`,
    'E_UNBOUND Unbound type variable z'),
  // An effect row parameter written as a type is the sort error.
  'r015-effect-row': context => expect(context, 'effect row as type',
    `type T(...e) = T(e);${main}`, sort),
  // So is a record row parameter, which otherwise compiles unchecked.
  'r015-record-row': context => expect(context, 'record row as type',
    `type T(...r) = T({ a: Int, ...r }, r);${main}`, sort),
  // A body type reads the signature's effect row as an effect row.
  'r016-effect-as-record': context => expect(context, 'effect row as record',
    'fn g(p: Int): Unit with ...r = { let f = fn(q: { a: Int, ...r }) '
      + `=> q.a; () };${main}`,
    'E_TYPE r is an effect row, not a record row'),
  // And the signature's record row as a record row.
  'r016-record-as-effect': context => expect(context, 'record row as effect',
    'fn g(p: { a: Int, ...r }): Int = { let f = fn(q: (Int) -> Int with '
      + `...r) => 0; 0 };${main}`,
    'E_TYPE r is a record row, not an effect row'),
  // A body type reads the signature's effect row as no type.
  'r017-row-as-type': context => expect(context, 'row as type',
    'fn g(p: Int): Unit with ...r = { let f = fn(q: r) => 0; () };'
      + main, sort),
  // Nor its type variable as a row.
  'r017-type-as-row': context => expect(context, 'type as row',
    'fn g(p: a): Int = { let f = fn(q: { b: Int, ...a }) => q.b; 0 };'
      + main, 'E_TYPE Expected an effect row, found a type'),
  // A recursive call that nests its record row changes its arguments.
  'r010-nested-row': context => expect(context, 'nested row',
    'fn g(x: { ...r }, n: Int): Int = if n == 0 then 0 else '
      + 'g({ inner: x }, n + -1); fn main(): Int = g({ a: 1 }, 3);',
    recursive('g')),
  // Through mutual recursion too.
  'r010-mutual-row': context => expect(context, 'mutual row',
    'fn f(x: { ...r }, n: Int): Int = if n == 0 then 0 else '
      + 'h({ inner: x }, n + -1); fn h(y: { ...s }, n: Int): Int = '
      + 'f(y, n); fn main(): Int = f({ a: 1 }, 3);',
    recursive('h'))
};
