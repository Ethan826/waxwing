// R0 a-min tranche 1 regression probe for the effect pin (Task 14),
// spread into test/regression-r0-amin.mjs. It computes the pin's own
// digests (test/r0-effects-pin-run.mjs `effectsTable`) for the programs
// of the pinned corpus that mention `fail`, with the compiler under
// test, and compares them to test/fixtures/r0/effects.json, as the
// serial pin test does for the whole corpus. The pin is only read.
// The pin helpers load lazily: they read the corpus module under
// research/ (test/r0-corpus.mjs), which a test-tree row's clone does not
// hold (scripts/regression-run.mjs `testTreeInputs`), and this module is
// loaded with every other probe.
import { encoderFor } from './r0-effects-canonical.mjs';
import { fail, passed, shape, toolkit }
  from './regression-r0-amin-support.mjs';

const sampleSize = 12;

const buildOf = async context => {
  const { load } = await toolkit(context);
  const Parse = await load('Format.Parse');
  const Resolve = await load('Features.Resolve');
  const Maps = await load('Data.Map.Internal');
  const Unfoldable = await load('Data.Unfoldable');
  const program = source => {
    const parsed = Parse.parse(source);
    if (parsed.constructor.name !== 'Right') return null;
    const named = Resolve.resolve(parsed.value0);
    return named.constructor.name === 'Right' ? named.value0 : null;
  };
  return { program,
    Generate: await load('Features.Check.Generate'),
    Inputs: await load('Features.Check.Generate.Inputs'),
    Recorded: await load('Domain.Recorded'),
    Elaborating: await load('Domain.Elaborating'),
    encode: encoderFor(Maps, Unfoldable) };
};

export const effectsPinProbes = {
  'r0-amin-effects-pin-obligation': async context => {
    const { effectsTable, movedKeys, pinnedEffects, sourcesOf } =
      await import('./r0-effects-pin-run.mjs');
    const sources = (await sourcesOf())
      .filter(({ source }) => source.includes('fail')).slice(0, sampleSize);
    if (sources.length < sampleSize) fail(`only ${sources.length} samples`);
    const found = await effectsTable(await buildOf(context), sources);
    // The pin's rows for the sampled programs, so a declaration dropped
    // from one of them counts as removed.
    const sampled = key => sources.some(({ origin }) =>
      key.startsWith(`${origin}#`));
    const pinned = Object.fromEntries(Object.entries(pinnedEffects()
      .digests).filter(([key]) => sampled(key)));
    const { added, removed, changed } = movedKeys(pinned, found.digests);
    const moved = [...added, ...removed, ...changed];
    if (moved.length > 0)
      fail(`effect pin: ${moved.length} of ${found.declarations} sampled `
        + `declarations moved, the first ${shape(moved[0])}`);
    passed(context);
  }
};
