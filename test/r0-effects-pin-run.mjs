// The recorded effect problem of every corpus declaration, pinned by
// digest (amin tranche 1, Task 14 Step 1; the sibling of
// test/r0-problem-pin-run.mjs, which pins the atoms and stays
// untouched). Per declaration of every resolving program of the same
// source set as the problem pin (RT8's sources and the window's defect
// probes): a SHA-256 of its canonical `effects` encoding
// (test/r0-effects-canonical.mjs), or of its generation fault's name.
// Keys are `origin#declaration`. Shared by the serial test and the pin
// script (scripts/r0-effects-pin.mjs); the test only reads the pin.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectsOf as healthyEncoder } from './r0-effects-canonical.mjs';
import { repoRoot } from './r0-corpus.mjs';
import { load, resolved }
  from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';

export const effectsFile = 'test/fixtures/r0/effects.json';
export const pinCommand = 'node scripts/r0-effects-pin.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');

const healthyProgram = source => {
  try { return resolved(source); } catch { return null; }
};

// Resolution, generation, inputs, the problem reader and the encoder of
// one build: the healthy output/, or a rebuilt copy under a regression
// probe (its constructors differ from the healthy build's, so nothing
// crosses between builds). `program` gives null for a source that does
// not resolve.
export const healthyBuild = async () => ({
  program: healthyProgram,
  Generate: await load('Features.Check.Generate'),
  Inputs: await load('Features.Check.Generate.Inputs'),
  Recorded: await load('Domain.Recorded'),
  Elaborating: await load('Domain.Elaborating'),
  encode: healthyEncoder
});

const digestOf = (build, tables, signatures, decl) => {
  const result = build.Generate.generate(tables)(signatures)(decl);
  if (result.constructor.name !== 'Right')
    return sha(`fault:${result.value0.constructor.name}`);
  const problem = build.Elaborating.problem(result.value0);
  return sha(JSON.stringify(build.encode(
    build.Recorded.fields(problem).effects)));
};

export const digestsOfProgram = (build, program) => {
  const { tables, signatures } = build.Inputs.generationInputs(program);
  return program.functions.map(decl =>
    [decl.name, digestOf(build, tables, signatures, decl)]);
};

export const sourcesOf = async () =>
  [...await rt8Sources(), ...defectProbes];

export const effectsTable = async (build, sources) => {
  const digests = {};
  let programs = 0;
  for (const { origin, source } of sources) {
    const program = build.program(source);
    if (program === null) continue;
    programs += 1;
    for (const [name, digest] of digestsOfProgram(build, program))
      digests[`${origin}#${name}`] = digest;
  }
  return { programs, declarations: Object.keys(digests).length, digests };
};

// The keys that moved between two digest tables (`origin#declaration`
// to digest): in `found` only, in `pinned` only, and in both with
// different digests, each sorted. Shared by the serial pin test and the
// pin's regression probe (test/regression-r0-amin-effects-pin.mjs).
export const movedKeys = (pinned, found) => ({
  added: Object.keys(found).filter(key => !(key in pinned)).sort(),
  removed: Object.keys(pinned).filter(key => !(key in found)).sort(),
  changed: Object.keys(found).filter(key => key in pinned
    && pinned[key] !== found[key]).sort()
});

export const pinnedEffects = () =>
  JSON.parse(readFileSync(join(repoRoot, effectsFile), 'utf8'));
