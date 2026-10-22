// Helpers for the R0 characterization probes (tranche 1, Task 0.1).
// `phaseOf` runs parse, resolve, check, specialize and compile directly,
// so a stage's diagnostic is read, never caught as an assertion error.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Left, Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import { specializationKeys } from '../output/Features.Specialize/index.js';
import { compile } from '../output/Program.Compile/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

const stopped = (phase, result) => {
  const { code, message } = wire(result.value0);
  return { phase, code, text: message };
};
const compiled = { phase: 'compiled', code: null, text: null };

// The stages in order; `stop` reads the stage that refused.
const stages = (source, stop, done) => {
  const parsed = parse(source);
  if (parsed instanceof Left) return stop('parse', parsed);
  const named = resolve(parsed.value0);
  if (named instanceof Left) return stop('resolve', named);
  const typed = check(named.value0);
  if (typed instanceof Left) return stop('check', typed);
  const keys = specializationKeys(typed.value0);
  if (keys instanceof Left) return stop('specialize', keys);
  const built = compile(source);
  if (built instanceof Left) return stop('compile', built);
  return done;
};

// The stage that stopped `source`, with its code and exact text; phase
// 'compiled' (code and text null) when every stage accepted it.
export const phaseOf = source => stages(source, stopped, compiled);

// `phaseOf` with where the refusal is (Task 0.5): `at`, the source text
// its span covers, and `notes`, each [covered text, message].
export const refusalOf = source => {
  const covered = span => source.slice(span.start.offset, span.end.offset);
  const note = found => [covered(found.span), found.message];
  const placed = (phase, result) => {
    const found = wire(result.value0);
    return { ...stopped(phase, result), at: covered(found.span),
      notes: found.related.map(note) };
  };
  return stages(source, placed, { ...compiled, at: null, notes: [] });
};

const here = dirname(fileURLToPath(import.meta.url));

// Every .json fixture in test/fixtures/<dir>, sorted by file name.
export const fixturesIn = dir => {
  const root = join(here, 'fixtures', dir);
  return readdirSync(root).filter(name => name.endsWith('.json')).sort()
    .map(name => JSON.parse(readFileSync(join(root, name), 'utf8')));
};
