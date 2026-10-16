// R004 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-r004.mjs. Each uses only the compiler
// under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

// The compiler's rejection with the text its span covers, or the Go
// program's stdout, or how it failed to run.
const seen = (context, source) => {
  const result = context.compile(source);
  if (result instanceof context.Left) {
    const wired = context.wire(result.value0);
    const { start, end } = wired.span;
    return `${wired.code} ${wired.message} @${
      source.slice(start.offset, end.offset)}`;
  }
  const run = context.ran(result.value0);
  return run.status === 0 ? run.stdout : `failed: ${run.output}`;
};

const main = ' fn main(): Int = 0;';
const expect = (context, label, source, wanted) => {
  const found = seen(context, source);
  if (found !== wanted) fail(`${label}: ${found}`);
  console.log(`${context.probe} regression detects the defect`);
};

export const r004Probes = {
  // A pattern must name every field or end with `...`.
  'r004-missing-field': context => expect(context, 'missing field accepted',
    `fn f(p: { a: Int, b: Bool }): Int = match p { { a: x } => x };${main}`,
    'E_TYPE Pattern is missing field b; add it or end the pattern with ...'
      + ' @{ a: x }'),
  // An unknown label is reported at the label, not at its pattern.
  'r004-label-span': context => expect(context, 'label span lost',
    `fn f(p: { a: Int }): Int = match p { { zz: 1, a: x } => x };${main}`,
    'E_TYPE zz is not a field of { a: Int } @zz'),
  // A record pattern is widened to every label of its type, `_` for those
  // under `...`: `{ a: true, ... }` is a row of two columns here.
  'r004-widening': context => expect(context, 'widening lost',
    'fn f(p: { a: Bool, b: Bool }): Int = match p { '
      + '{ a: true, ... } => 1, { a: false, ... } => 2 }; '
      + 'fn main(): Int = f({ a: false, b: true });', '2\n'),
  // Settlement reaches the patterns inside record fields: `Cons(h, _)`
  // has a hole type until the call fixes it, and lowering needs its type.
  'r004-walk-binders': context => expect(context, 'record fields skipped',
    'type L = Nil | Cons(Int, L); fn main(): Int = (fn(q) => match q { '
      + '{ next: Cons(h, _) } => h, { next: Nil } => 0 })'
      + '({ next: Cons(7, Nil) });', '7\n'),
  // A record is inhabited exactly when every field is: `Wrap` is not, so
  // `Some(Wrap)` is not, and `Nada` alone is exhaustive.
  'r004-inhabitation': context => expect(context, 'record read as Int',
    'type Void = Void(Void); type Wrap = Wrap({ v: Void }); '
      + 'type Opt = Nada | Some(Wrap); '
      + `fn f(o: Opt): Int = match o { Nada => 0 };${main}`, '0\n'),
  // The lowered test reads each named field.
  'r004-go-fields': context => expect(context, 'record fields ignored',
    'fn tag(p: { name: Text, admin: Bool }): Text = match p { '
      + '{ name, admin: true } => "admin ${name}", '
      + '{ name, admin: false } => name }; '
      + 'fn main(): Unit with Console = '
      + 'Console.print(tag({ name: "Bo", admin: false }));', 'Bo\n'),
  // An unknown tail grows by the labels a later arm names, so the arms
  // may come in either order (user decision 2026-10-16).
  'r004-hole-tail': context => expect(context, 'hole tail not extended',
    'fn main(): Int = (fn(p) => match p { { fk: true, ... } => 1, '
      + '{ fk: vk, fm: vm } => vm })({ fk: true, fm: 2 });', '1\n')
};
