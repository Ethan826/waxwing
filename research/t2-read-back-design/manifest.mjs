// The source manifest of design §A (dossier §18.153, reporting
// corrections): the corpus loader's source set (test/r0-corpus.mjs
// `loadCorpus`, what the Task 1 inventory read) against the effect
// pin's (test/r0-effects-pin-run.mjs `sourcesOf`: RT8's sources, that
// is the corpus plus R022's two probes, then the window's two defect
// probes). Per set: entries, programs that parse and resolve,
// declarations; then the sources each has that the other lacks, and
// whether the shared origins carry the same text. Also checks that the
// pin's own count (test/fixtures/r0/effects.json) is reproduced.
// Corpus-observed. Run from the repository root after `npm run build`:
//   node research/t2-read-back-design/manifest.mjs
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { sourcesOf, pinnedEffects } from '../../test/r0-effects-pin-run.mjs';
import { resolved } from '../../test/r0-generate-support.mjs';

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

const summary = entries => {
  let programs = 0;
  let declarations = 0;
  const unresolved = [];
  for (const { origin, source } of entries) {
    const program = programOf(source);
    if (program === null) { unresolved.push(origin); continue; }
    programs += 1;
    declarations += program.functions.length;
  }
  return { entries: entries.length, programs, declarations,
    unresolved: unresolved.length };
};

const byOrigin = entries => new Map(entries.map(e => [e.origin, e.source]));
const declsOf = entries => entries.map(({ origin, source }) => {
  const program = programOf(source);
  return { origin, resolves: program !== null,
    declarations: program === null ? [] : program.functions.map(f => f.name) };
});

const corpus = await loadCorpus();
const pin = await sourcesOf();
const [inCorpus, inPin] = [byOrigin(corpus), byOrigin(pin)];
const onlyPin = pin.filter(e => !inCorpus.has(e.origin));
const onlyCorpus = corpus.filter(e => !inPin.has(e.origin));
const textApart = corpus.filter(e => inPin.has(e.origin)
  && inPin.get(e.origin) !== e.source).map(e => e.origin);
const pinned = pinnedEffects();
const pinnedKeys = Object.keys(pinned.digests);
const pinOrigins = new Set(pinnedKeys.map(key => key.replace(/#[^#]*$/, '')));

console.log(JSON.stringify({
  corpusLoader: summary(corpus),
  effectPinSources: summary(pin),
  effectPinFile: { programs: pinned.programs,
    declarations: pinned.declarations, origins: pinOrigins.size },
  onlyInPinSources: declsOf(onlyPin),
  onlyInCorpusLoader: onlyCorpus.map(e => e.origin),
  sharedOriginsWithDifferentText: textApart,
  pinKeysOutsideCorpusOrigins: pinnedKeys
    .filter(key => !inCorpus.has(key.replace(/#[^#]*$/, ''))).sort()
}, null, 1));

// The pin-only declarations through the inventory's own four-way split
// (research/t2-read-back-inventory/corpus.mjs), so a reader can place
// them; the inventory itself did not read them.
const { declarationsOf, stageOf } =
  await import('../t2-read-back-inventory/corpus.mjs');
const stages = {};
for (const entry of onlyPin) for (const item of declarationsOf(entry))
  stages[item.at] = stageOf(item);
console.log(JSON.stringify({ pinOnlyStages: stages }, null, 1));
