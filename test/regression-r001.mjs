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
  }
};
