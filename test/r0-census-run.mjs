// Task 3.5: the census over the pinned corpus (test/r0-corpus.mjs),
// shared by the census test and the pin script, so both compute it
// one way. `classifiedCorpus` keeps each program's classification;
// `corpusCensus` is what test/fixtures/r0/census.json pins.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCorpus, repoRoot } from './r0-corpus.mjs';
import { classifyProgram } from './r0-census-classify.mjs';
import { censusOf } from './r0-census-tally.mjs';

export const censusFile = 'test/fixtures/r0/census.json';
export const pinCommand = 'node scripts/r0-census-pin.mjs';

const classified = ({ origin, source }) =>
  ({ origin, ...classifyProgram(source) });

export const classifiedCorpus = async () =>
  (await loadCorpus()).map(classified);

export const corpusCensus = async (found = null) =>
  censusOf(found ?? await classifiedCorpus());

export const pinnedCensus = () =>
  JSON.parse(readFileSync(join(repoRoot, censusFile), 'utf8'));
