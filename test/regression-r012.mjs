// R012 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-r012.mjs. Each uses only the compiler
// under test, passed in the context.
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

const holder = 'type Holder(...r) = Holder({ x: Int, ...r }); ';
const main = ' fn main(): Int = 0;';
const expect = (context, label, source, wanted) => {
  const found = outcome(context, source);
  if (found !== wanted) fail(`${label}: ${found}`);
};

export const r012Probes = {
  // A record type is a record parameter's argument.
  'r012-record-argument': context => {
    expect(context, 'record argument',
      `${holder}fn f(h: Holder({ y: Bool })): Int = 0;${main}`, 'accepted');
    console.log(`${context.probe} regression detects the defect`);
  },
  // A label the argument shares with the declaration is a duplicate.
  'r012-argument-clash': context => {
    expect(context, 'argument clash',
      `${holder}fn f(h: Holder({ x: Bool })): Int = 0;${main}`,
      'E_DUPLICATE Duplicate field x');
    console.log(`${context.probe} regression detects the defect`);
  },
  // A body type passing a signature tail as a record argument's tail
  // implies the labels the declared type writes beside it.
  'r012-argument-lacks': context => {
    expect(context, 'argument tail',
      `${holder}fn g(p: { y: Int, ...r }): Int = { let f = `
        + 'fn(h: Holder({ y: Int, ...r })) => h; 0 }; '
        + 'fn main(): Int = g({ y: 1, x: true });',
      'E_TYPE r may already have field x');
    console.log(`${context.probe} regression detects the defect`);
  },
  // A record parameter after an effect row parameter: its labels are
  // those of its own place among the declaration's variables.
  'r012-slot-position': context => {
    expect(context, 'slot position',
      'type T(...e, ...r) = T((Int) -> Int with ...e, { x: Int, ...r }); '
        + 'fn g(p: { ...r }, q: (Int) -> Int with ...e): Int = { let f = '
        + 'fn(h: T(...e, ...r)) => h; 0 }; fn id(n: Int): Int = n; '
        + 'fn main(): Int = g({ x: true }, id);',
      'E_TYPE r may already have field x');
    console.log(`${context.probe} regression detects the defect`);
  },
  // `{ ...s }` passes s on as `...s` does, so its sort reaches the callee.
  'r012-spread-argument': context => {
    expect(context, 'spread argument',
      'type Q(...q) = Q(Int); type P(...s) = P(Q({ ...s }), '
        + `{ a: Int, ...s });${main}`, 'accepted');
    console.log(`${context.probe} regression detects the defect`);
  },
  // A row argument growing through recursion is the instantiation rule.
  'r012-nested-row': context => {
    expect(context, 'growing row',
      `type T(...r) = End({ ...r }) | More(T({ a: { ...r } }));${main}`,
      'E_SPECIALIZATION Recursive use of T changes its type arguments');
    console.log(`${context.probe} regression detects the defect`);
  },
  // So is a recursive reference inside a record argument's field.
  'r012-nested-walk': context => {
    expect(context, 'nested reference',
      `${holder}type T(a) = End | More(Holder({ y: T(T(a)) }));${main}`,
      'E_SPECIALIZATION Recursive use of T changes its type arguments');
    console.log(`${context.probe} regression detects the defect`);
  }
};
