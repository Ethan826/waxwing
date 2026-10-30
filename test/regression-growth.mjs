import { forms, partialFirstGrowth } from './fn-linear-sources.mjs';
import { assertGrowth } from './growth.mjs';

// The partialFirst growth check (test/fn-linear-growth.serial.test.mjs)
// against the compiler it is given, never the healthy build. A constructed
// quadratic mutant must fail the ratio assertion itself.
const partialFirstGrowthCheck = async ({ load, Right, wire }) => {
  const { parse } = await load('Format.Parse');
  const { resolve: resolveNames } = await load('Features.Resolve');
  const { check } = await load('Features.Check');
  const { specialize } = await load('Features.Specialize');
  const { small, large, threshold } = partialFirstGrowth;
  const run = source => {
    let result = parse(source);
    for (const phase of [resolveNames, check, specialize]) {
      if (result instanceof Right) result = phase(result.value0);
    }
    return result instanceof Right ? 'ok' : wire(result.value0).code;
  };
  assertGrowth({ label: 'partialFirst', threshold, expected: 'ok', small,
    large, prepare: forms.partialFirst, run,
    log: line => console.error(line) });
};

export const growthProbes = {
  'partialfirst-growth': partialFirstGrowthCheck
};
