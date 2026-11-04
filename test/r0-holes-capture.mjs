// Records every body Features.Check.Holes's `holes` receives, for the
// corpus walk agreement test (test/r0-holes-corpus.serial.test.mjs).
// Importing this module registers a load hook that instruments that
// module's compiled text in this process only, as
// scripts/differential-hook.mjs does for `parse`; compiler output on disk
// is never changed. It must be imported before anything loads the
// compiler. A changed definition fails the load rather than capturing
// nothing.
import { registerHooks } from 'node:module';

export const captured = [];
const entry = 'var holes = function (body) {';

const instrumented = text => {
  if (!text.includes(entry))
    throw new Error('r0-holes-capture: Features.Check.Holes no longer '
      + 'defines `holes` as expected; update the hook');
  return text.replace(entry,
    `${entry}\n    globalThis.waxwingHolesCaptured.push(body);`);
};

const load = (url, context, nextLoad) => {
  const loaded = nextLoad(url, context);
  if (!url.endsWith('/output/Features.Check.Holes/index.js')) return loaded;
  return { ...loaded, source: instrumented(String(loaded.source)) };
};

globalThis.waxwingHolesCaptured = captured;
registerHooks({ load });
