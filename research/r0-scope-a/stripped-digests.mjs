// Scope A (proposal §8, Pins): test/fixtures/r0/problems.json moves
// wholesale because every problem now encodes `holders.admitted` and
// `holders.overRecords`. This recomputes each program's digest as the
// pin does, with those two fields removed, and compares it with the
// digest pinned before Scope A (git show <ref>:test/fixtures/r0/
// problems.json). A program may differ only if it is one of the 116 or
// holds a declaration of impl1-movements.json. Exit 1 otherwise.
// usage: node research/r0-scope-a/stripped-digests.mjs <old-problems.json>
//          <in-scope-stage0.json> <impl1-movements.json>
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonicalOf } from '../../test/r0-canonical-decode.mjs';
import { stableStringify } from '../../test/r0-canonical.mjs';
import { generatedOrThrow, load, resolved }
  from '../../test/r0-generate-support.mjs';
import { rt8Sources } from '../../test/r0-rt8-run.mjs';
import { defectProbes } from '../../test/r0-shadow-known.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const [oldFile, scopeFile, listFile] = process.argv.slice(2);
const old = read(oldFile).digests;
const allowed = new Set([...read(scopeFile).origins,
  ...read(listFile).declarationMovements.map(entry =>
    entry.at.slice(0, entry.at.lastIndexOf('#')))]);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const bytesOf = (tables, signatures, decl) => {
  const result = Generate.generate(tables)(signatures)(decl);
  if (result.constructor.name !== 'Right')
    return `fault:${result.value0.constructor.name}`;
  const problem = canonicalOf(generatedOrThrow(result, decl.name));
  delete problem.holders.admitted;
  delete problem.holders.overRecords;
  return stableStringify(problem);
};
const digestOf = program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  const hash = createHash('sha256');
  for (const decl of program.functions)
    hash.update(`${decl.name}\n${bytesOf(tables, signatures, decl)}\n`);
  return hash.digest('hex');
};

const unexpected = [];
const visited = new Set();
let same = 0;
let moved = 0;
for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
  let program;
  try { program = resolved(source); } catch { continue; }
  visited.add(origin);
  if (digestOf(program) === old[origin]) { same += 1; continue; }
  moved += 1;
  if (!allowed.has(origin)) unexpected.push(origin);
}
// The visited programs are exactly the old pin's (review of
// 2026-11-14), so no pinned program is skipped.
for (const origin of Object.keys(old))
  if (!visited.has(origin)) unexpected.push(`${origin}: not visited`);
for (const origin of visited)
  if (!(origin in old)) unexpected.push(`${origin}: not in the old pin`);
console.log(JSON.stringify({ same, moved, unexpected }, null, 1));
process.exitCode = unexpected.length === 0 ? 0 : 1;
