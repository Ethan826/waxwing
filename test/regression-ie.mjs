// FX025 regression probes, imported through
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

export const ieProbes = {
  // An unbound effect row variable is the unbound type variable of a
  // record tail, not an internal error.
  'fx025-unbound-row': context => expect(context, 'unbound row',
    `type W = W((Int) -> Int with ...z);${main}`,
    'E_UNBOUND Unbound type variable z')
};
