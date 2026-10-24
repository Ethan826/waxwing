// The recorded problem of every corpus declaration, pinned by digest
// (R0 Task 7.1b, D1 spec §3.5: the generator's port onto `Gen` and
// `Elab` keeps every `RecordedProblem` byte-identical). Per resolving
// program of the pinned corpus (test/r0-corpus.mjs), a SHA-256 of each
// declaration's name and its canonical bytes (test/r0-canonical.mjs
// `encodeProblem`, entry arrays in recorded order), or of its
// generation fault's name. Shared by the serial test and the pin script
// (scripts/r0-problem-pin.mjs); the pin was taken from Task 3.2's
// generator before the port.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeProblem } from './r0-canonical.mjs';
import { loadCorpus, repoRoot } from './r0-corpus.mjs';
import { generatedOrThrow, load, resolved }
  from './r0-generate-support.mjs';

export const problemsFile = 'test/fixtures/r0/problems.json';
export const pinCommand = 'node scripts/r0-problem-pin.mjs';

const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const bytesOf = (tables, signatures, decl) => {
  const result = Generate.generate(tables)(signatures)(decl);
  if (result.constructor.name !== 'Right')
    return `fault:${result.value0.constructor.name}`;
  return encodeProblem(generatedOrThrow(result, decl.name));
};

const digestOf = program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  const hash = createHash('sha256');
  for (const decl of program.functions)
    hash.update(`${decl.name}\n${bytesOf(tables, signatures, decl)}\n`);
  return hash.digest('hex');
};

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

export const problemTable = async () => {
  const digests = {};
  let declarations = 0;
  for (const { origin, source } of await loadCorpus()) {
    const program = programOf(source);
    if (program === null) continue;
    declarations += program.functions.length;
    digests[origin] = digestOf(program);
  }
  return { programs: Object.keys(digests).length, declarations, digests };
};

export const pinnedProblems = () =>
  JSON.parse(readFileSync(join(repoRoot, problemsFile), 'utf8'));
