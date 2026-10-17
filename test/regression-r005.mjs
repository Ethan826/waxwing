// R005 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-r005.mjs. Each uses only the compiler
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

const granted = 'fn granted(p: { ...r }): Bool where r lacks { admin } = '
  + '{ ...p, admin: true }.admin; ';
const refused = 'E_TYPE admin is not allowed here: r lacks { admin } @';
const tick = 'fn tick(n: Int): Int with Console = { Console.print(n); n }; ';

export const r005Probes = {
  // A label the spread's type has is an overlap, at the later item.
  'r005-overlap': context => expect(context, 'overlap accepted',
    `fn f(p: { admin: Bool }): Bool = { ...p, admin: true }.admin;${main}`,
    'E_DUPLICATE Duplicate field admin @admin'),
  // Written first, the label is the earlier item: the report is at the
  // spread, noted at the label.
  'r005-overlap-order': context => expect(context, 'overlap order ignored',
    `fn f(p: { admin: Bool }): Bool = { admin: true, ...p }.admin;${main}`,
    'E_DUPLICATE Duplicate field admin @...p'),
  // A written lack is seeded at each use: the argument may not hold it.
  'r005-written-use': context => expect(context, 'written lack not seeded',
    `${granted}fn main(): Int = { let b = granted({ name: 1, admin: false });`
      + ' 0 };', `${refused}{ name: 1, admin: false }`),
  // The violation is the approved text, not the shape mismatch.
  'r005-provenance': context => expect(context, 'provenance lost',
    `${granted}fn main(): Int = { let b = granted({ admin: true }); 0 };`,
    `${refused}{ admin: true }`),
  // The remainder is the matched type without the written labels.
  'r005-rest-type': context => expect(context, 'rest typed as the whole',
    'fn f(p: { name: Text, age: Int }): { age: Int } = match p { '
      + '{ name, ...rest } => rest }; '
      + 'fn main(): Int = f({ name: "Ada", age: 36 }).age;', '36\n'),
  // Items evaluate in written order, the spread among them.
  'r005-go-order': context => expect(context, 'items out of order',
    `${tick}fn mid(): { m: Int } with Console = { Console.print(2); `
      + '{ m: 20 } }; fn main(): Unit with Console = '
      + 'Console.print({ a: tick(1), ...mid(), b: tick(3) });',
    '1\n2\n3\n{ a: 1, b: 3, m: 20 }\n'),
  // `{}` is a record, not Unit.
  'r005-empty-unit': context => expect(context, '{} unified with Unit',
    'fn bare(p: { name: Text }): {} = p without { name }; '
      + 'fn main(): Unit = bare({ name: "Ada" });',
    'E_TYPE Expected Unit, found {} @bare({ name: "Ada" })'),
  // An unused rest, whose remainder shape is nowhere else, still has its
  // struct.
  'r005-rest-layout': context => expect(context, 'rest layout missing',
    'fn first(p: { a: Int, b: Text }): Int = match p { '
      + '{ a, ...unused } => a }; fn main(): Int = first({ a: 1, b: "x" });',
    '1\n')
};
