// Today's whole-program diagnostic for each named origin (dossier
// §18.184): the first diagnostic `compile` reports, as the CLI prints it.
// usage: node research/r0-replacement-losses/today.mjs <origin>...
import { sourcesOf } from '../../test/r0-effects-pin-run.mjs';
import { compile } from '../../output/Program.Compile/index.js';
import { wire } from '../../output/Format.Diagnostic/index.js';
const wanted = new Set(process.argv.slice(2));
for (const entry of await sourcesOf()) {
  if (!wanted.has(entry.origin)) continue;
  const result = compile(entry.source);
  const shown = result.constructor.name === 'Left'
    ? wire(result.value0) : 'compiles';
  console.log(JSON.stringify({ origin: entry.origin, today: shown }));
}
