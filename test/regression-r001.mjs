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

// What the compiler gives: its rejection, or the result of running the Go
// it emitted. A Go compile failure (E_TOOL for the driver) is told from a
// failed run by the header `go run` prints for its package, and carries
// Go's first error, so a proof shows that the build itself failed.
const outcome = (context, source) => {
  const result = context.compile(source);
  if (result instanceof context.Left) {
    const wired = context.wire(result.value0);
    return `${wired.code} ${wired.message}`;
  }
  const run = context.ran(result.value0);
  if (run.status === 0) return 'ran';
  const lines = run.output.split('\n');
  const header = lines.indexOf('# command-line-arguments');
  return header < 0 ? `go run failed: ${run.output}`
    : `E_TOOL: go build failed: ${lines[header + 1]}`;
};

// What a program printed, or its rejection, or how its Go failed.
const shown = (context, source) => {
  const result = context.compile(source);
  if (result instanceof context.Left) {
    const wired = context.wire(result.value0);
    return `${wired.code} ${wired.message}`;
  }
  const run = context.ran(result.value0);
  return run.status === 0 ? run.stdout : `E_TOOL: ${run.output}`;
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
  // parameter, and the program specializes, lowers and runs (R001 Task 7).
  // Since R001 Task 4 unification pairs labels by name, so the order is
  // seen in a diagnostic, which prints the fields as the row keeps them.
  'r001-record-order': context => {
    const found = shown(context, 'fn f(x: { a: Int, b: Bool }): '
      + '{ b: Bool, a: Int } = x; fn main(): Unit with Console = '
      + 'Console.print(f({ b: true, a: 1 }));');
    if (found !== '{ a: 1, b: true }\n') {
      fail(`label order distinguished two records: ${found}`);
    }
    const printed = outcome(context, 'fn g(x: { b: Bool, a: Int }): Int = 1; '
      + 'fn f(y: Int): Int = g(y); fn main(): Int = 0;');
    if (printed !== 'E_TYPE Expected { a: Int, b: Bool }, found Int') {
      fail(`label order kept in a diagnostic: ${printed}`);
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
  },
  // `r` is bound to { b: Int } through field `a`; the tails must follow
  // that binding, so the extra `c` is a mismatch, not a second binding.
  'r001-field-bound-tail': context => {
    const found = outcome(context, 'fn g(x: { a: { ...r }, ...r }): Int = 1; '
      + 'fn f(p: { a: { b: Int }, c: Bool }): Int = g(p); '
      + 'fn main(): Int = 0;');
    if (found !== 'E_TYPE Expected { a: { ..._ }, ..._ }, found '
      + '{ a: { b: Int }, c: Bool }') {
      fail(`a tail bound through a field was rebound: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // `{ b: Int, ...r }` with `r` bound to `{ a: Bool }` is
  // `{ a: Bool, b: Int }`, the caller's record: one layout, one struct.
  'r001-sorted-layout': context => {
    const found = shown(context, 'fn f(x: { b: Int, ...r }): '
      + '{ b: Int, ...r } = x; fn main(): Unit with Console = '
      + 'Console.print(f({ a: true, b: 1 }));');
    if (found !== '{ a: true, b: 1 }\n') {
      fail(`a written-order layout split one record type: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // `r` lacks `a` from k's signature, so it may not be `{ a: Int }`.
  // Since R005 Tranche B Task 4 a lone meta against labels alone is first
  // bounded by them, and the lack prunes the bound (U2, U4), which refuses
  // the label before the bind rule's own check; the argument here,
  // `{ a: Int, ..._ }`, has a meta of its own, so no bound arises and that
  // check is the one guard.
  'r001-lacks': context => {
    const found = outcome(context, 'fn k(y: { ...r }): { a: Int, ...r } = '
      + 'k(y); fn mk(n: Int): { a: Int, ...t } = mk(n); '
      + 'fn f(n: Int): Int = { let u = k(mk(n)); 1 }; fn main(): Int = f(1);');
    if (found !== 'E_TYPE Expected { ..._ }, found { a: Int, ..._ }') {
      fail(`a tail was bound to a label it lacks: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // `same(p, q)` gives p's and q's tails one remainder; h then fixes it as
  // `{ c: Text }` through p, so q cannot be `{ d: Text }` (as in
  // test/r001-unify.test.mjs).
  'r001-shared-remainder': context => {
    const found = outcome(context, 'fn ra(n: Int): { a: Int, ...r } = ra(n); '
      + 'fn rb(n: Int): { b: Bool, ...s } = rb(n); '
      + 'fn same(x: t, y: t): t = x; fn h(x: { a: Int, b: Bool, c: Text }, '
      + 'y: { a: Int, b: Bool, d: Text }): Int = 1; fn f(n: Int): Int = { '
      + 'let p = ra(n); let q = rb(n); let u = same(p, q); h(p, q) }; '
      + 'fn main(): Int = 0;');
    if (found !== 'E_TYPE Expected { a: Int, b: Bool, d: Text }, found '
      + '{ a: Int, b: Bool, c: Text }') {
      fail(`tails extended independently: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // Fields run as written, `b` before `a`, though the struct sorts them.
  'r001-field-order': context => {
    const found = shown(context, 'fn say(s: Text, n: Int): Int with Console '
      + '= { Console.print(s); n }; fn main(): Unit with Console = '
      + 'Console.print({ b: say("b", 2), a: say("a", 1) });');
    if (found !== 'b\na\n{ a: 1, b: 2 }\n') {
      fail(`field order left to Go: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // One label, two field types: two shapes, each built and printed.
  'r001-shape-types': context => {
    const found = shown(context, 'fn a(): { x: Int } = { x: 1 }; '
      + 'fn b(): { x: Text } = { x: "t" }; fn main(): Unit with Console = '
      + '{ Console.print(a()); Console.print(b()) };');
    if (found !== '{ x: 1 }\n{ x: "t" }\n') {
      fail(`shapes told apart by labels, not field types: ${found}`);
    }
    console.log(`${context.probe} regression detects the defect`);
  }
};
