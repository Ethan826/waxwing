// R001 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-r001.mjs. Each uses only the compiler
// under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

const sites = [
  ['show', 'Text', 'show(item)'],
  ['Console.print', 'Unit with Console', 'Console.print(item)'],
  ['crash', 'Unit', 'crash(item)']
];

// What the compiler gives: its rejection, or the result of building the
// Go it emitted (a build failure is E_TOOL for the driver).
const outcome = (context, source) => {
  const result = context.compile(source);
  if (result instanceof context.Left) {
    const wired = context.wire(result.value0);
    return `${wired.code} ${wired.message}`;
  }
  const run = context.ran(result.value0);
  return run.status === 0 ? 'ran' : 'E_TOOL: go failed to build';
};

export const r001Probes = {
  // A generic printer reached with a function is E_TYPE at the site.
  'r001-print-ground': context => {
    for (const [name, result, site] of sites) {
      const found = outcome(context, `fn p(item: a): ${result} = ${site}; `
        + `fn main(): ${result} = p(fn(n: Int) => n);`);
      if (found !== 'E_TYPE Expected a printable value, found Int -> Int') {
        fail(`${name} site not checked at the ground type: ${found}`);
      }
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // `{ a, b }` and `{ b, a }` are one type: the result unifies with the
  // parameter. (The type variable keeps `f` out of the specializer.)
  'r001-record-order': context => {
    const found = outcome(context, 'fn f(x: { a: Int, b: Bool }, y: c): '
      + '{ b: Bool, a: Int } = x; fn main(): Int = 0;');
    if (found !== 'ran') {
      fail(`label order distinguished two records: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // A row passed to a record parameter is a record row, so `with ...e` on
  // the same variable is the row-sort error.
  'r001-row-sort-propagation': context => {
    const found = outcome(context, 'type Box(...r) = Box({ a: Int, ...r }); '
      + 'fn f(x: Box(...e)): Unit with ...e = (); fn main(): Int = 0;');
    if (found !== 'E_TYPE e is a record row, not an effect row') {
      fail(`row sort propagation lost: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  'r001-duplicate-field': context => {
    const found = outcome(context, 'fn f(x: { name: Int, name: Bool }, '
      + 'y: c): Int = 1; fn main(): Int = 0;');
    if (found !== 'E_DUPLICATE Duplicate field name') {
      fail(`duplicate field accepted: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // A parameter passed only to a record parameter is record sort, so
  // using it as an effect row is the row-sort error.
  'r001-callee-to-caller': context => {
    const found = outcome(context, 'type Outer(...s) = Outer(Inner(...s)); '
      + 'type Inner(...r) = Inner({ a: Int, ...r }); '
      + 'fn f(x: Outer(...e)): Unit with ...e = (); fn main(): Int = 0;');
    if (found !== 'E_TYPE e is a record row, not an effect row') {
      fail(`callee to caller propagation lost: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // The caller is the row-sort error when it uses a row as an effect row
  // that it also passes to a record parameter.
  'r001-settled-sort': context => {
    const found = outcome(context, 'type B(...s) = B((Unit) -> Unit with '
      + '...s, X(...s)); type X(...p) = X({ a: Int, ...p }); '
      + 'fn main(): Int = 0;');
    if (found !== 'E_TYPE s is an effect row, not a record row') {
      fail(`settled sort not enforced: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  'r001-caller-conflict': context => {
    const found = outcome(context, 'type C1(...a) = C1({ x: Int, ...a }, '
      + 'P(...a)); type C2(...b) = C2((Unit) -> Unit with ...b, P(...b)); '
      + 'type P(...p) = P(Int); fn main(): Int = 0;');
    if (found !== 'E_TYPE b is an effect row, not a record row') {
      fail(`caller conflict accepted: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // P takes record sort from C1, so C2, which only passes its row to P, is
  // record sort too, and using it as an effect row is the sort error.
  'r001-sort-feedback': context => {
    const found = outcome(context, 'type C1(...a) = C1({ x: Int, ...a }, '
      + 'P(...a)); type C2(...b) = C2(P(...b)); type P(...p) = P(Int); '
      + 'fn f(x: C2(...e)): Unit with ...e = (); fn main(): Int = 0;');
    if (found !== 'E_TYPE e is a record row, not an effect row') {
      fail(`sort feedback to callers lost: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  }
};
