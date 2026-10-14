// Text v1 regression probes, imported through test/regression-probes.mjs;
// the rows are in scripts/regression-text.mjs. Each uses only the compiler
// under test, passed in the context.
const fail = message => {
  console.error(message);
  process.exit(1);
};

const detected = context =>
  console.log(`${context.probe} regression detects the defect`);

// A mutant may emit Go that fails to build; the reason is then printed.
const prints = (source, expected, failure) => context => {
  let output;
  try { output = context.printed(source); } catch (error) {
    output = error.message;
  }
  if (output !== expected) fail(`${failure}: ${JSON.stringify(output)}`);
  detected(context);
};

// The wire form of a rejection, or null when the program was accepted.
const rejects = (source, message, failure) => context => {
  const result = context.compile(source);
  const found = result instanceof context.Left
    ? context.wire(result.value0) : null;
  if (found === null || found.code !== 'E_SYNTAX'
    || found.message !== message) {
    fail(`${failure}: ${JSON.stringify(found)}`);
  }
  detected(context);
};

const noisy = 'fn a(): Text with Console = { Console.print(1); "x" }; '
  + 'fn b(): Text with Console = { Console.print(2); "y" }; ';
const box = 'type Box = Box(Text); ';

export const textProbes = {
  'text-order': prints(noisy + 'fn main(): Unit with Console = '
    + 'Console.print("${a()}${b()}");', '1\n2\nxy\n', 'holes evaluated right to left'),
  'text-nested-raw': prints(box + 'fn main(): Box = Box("a b\\n");',
    'Box("a b\\n")\n', 'nested Text printed raw'),
  // Two spaces close the block; the content line is indented by two tabs.
  'text-indent-count': rejects(
    'fn main(): Text = """\n  ok\n\t\tbad\n  """;',
    'This line is indented less than the closing """',
    'mixed indent was accepted'),
  'text-dollar': prints(
    'fn main(): Text = { let x = "a"; "\\${x}" };', '${x}\n',
    'escaped dollar interpolated'),
  'text-hash-mismatch': rejects('fn main(): Text = ##"x"###;',
    'Expected "##, found "###', 'hash mismatch not diagnosed'),
  'text-surrogate': rejects('fn main(): Text = "\\u{D800}";',
    'Invalid Unicode escape \\u{D800}', 'surrogate escape accepted'),
  // U+1F600 is above U+FFFD by code point, below it by UTF-16 unit.
  'text-utf16-order': prints(box + 'fn main(): Bool = '
    + 'Box("\\u{1F600}") > Box("\\u{FFFD}");', 'true\n',
    'Text ordered by UTF-16 order')
};
