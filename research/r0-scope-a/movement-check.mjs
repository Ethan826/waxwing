// Scope A (dossier §18.200): the full movement report against the two
// allowlists, kept separate. A declaration that moved between the
// baseline and the new results dump (scripts/r0-results-dump.mjs) must
// either belong to one of the 116 programs and become Solved (program
// recoveries), or match its entry in impl1-movements.json exactly, every
// protected field included (declaration movements). Every entry must
// occur, and every declaration of the 116 programs must be Solved. A
// reason-only movement outside the list fails, whether or not the
// program stays refused. Exit 1 on any violation.
// usage: node research/r0-scope-a/movement-check.mjs <baseline-dump>
//          <new-dump> <in-scope-stage0.json> <impl1-movements.json>
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const [baseFile, newFile, scopeFile, listFile] = process.argv.slice(2);
const before = read(baseFile).declarations;
const after = read(newFile).declarations;
const programs = read(scopeFile).origins;
const listed = new Map(read(listFile).declarationMovements
  .map(entry => [entry.at, entry]));
const pick = row => row && ({ verdict: row.r0.verdict,
  attempt: row.r0.attempt, rt8: row.rt8, window: row.window,
  blockers: row.blockers, categories: row.categories });
const programOf = at => programs.find(origin => at.startsWith(`${origin}#`));
const text = value => JSON.stringify(value);

const violations = [];
const seen = new Set();
let recoveries = 0;
for (const at of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const [old, now] = [before[at], after[at]];
  if (text(old) === text(now)) continue;
  if (old === undefined || now === undefined) {
    violations.push(`${at}: added or removed`);
    continue;
  }
  if (listed.has(at)) {
    seen.add(at);
    const entry = listed.get(at);
    if (text(entry.old) !== text(pick(old))
      || text(entry.new) !== text(pick(now)))
      violations.push(`${at}: differs from its listed movement`);
    continue;
  }
  if (programOf(at) !== undefined && now.r0.verdict === 'Solved') {
    recoveries += 1;
    continue;
  }
  violations.push(`${at}: unlisted movement ${old.r0.verdict} -> `
    + `${now.r0.verdict}`);
}
for (const at of listed.keys())
  if (!seen.has(at)) violations.push(`${at}: listed but did not move`);
const unsolved = Object.keys(after).filter(at => programOf(at) !== undefined
  && after[at].r0.verdict !== 'Solved');
for (const at of unsolved) violations.push(`${at}: in-scope, not Solved`);
// Each of the 116 must be in the new dump (review of 2026-11-14).
for (const origin of programs)
  if (!Object.keys(after).some(at => at.startsWith(`${origin}#`)))
    violations.push(`${origin}: no declaration in the new dump`);
console.log(JSON.stringify({ recoveries, listedMovements: seen.size,
  violations }, null, 1));
process.exitCode = violations.length === 0 ? 0 : 1;
