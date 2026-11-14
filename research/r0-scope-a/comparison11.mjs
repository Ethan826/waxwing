// Scope A (dossier §18.200; activation gate criterion 5): comparison 11
// on the Scope A source, composed and checked rather than hand-copied.
// Against the pre-switch baseline (2c5b9e30), every declaration that
// moves must have moved in comparison 10 (its dump unchanged since, and
// the move unchanged), or be a Scope A movement checked by
// movement-check.mjs against comparison 10's dump; no declaration may be
// in both. The record keeps comparison 10's moved rows (the minting
// comparison proper) and adds Scope A's movement as its own section.
// Exit 1 on any violation; writes the record only when it passes.
// usage: node research/r0-scope-a/comparison11.mjs <pre-switch-dump>
//   <comparison10-dump> <final-dump> <movement-check.json> <commit> <out>
import { readFileSync, writeFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const [preFile, tenFile, finalFile, checkFile, commit, out] =
  process.argv.slice(2);
const [pre, ten, now] = [preFile, tenFile, finalFile]
  .map(file => read(file).declarations);
const check = read(checkFile);
const text = value => JSON.stringify(value);

const violations = [...check.violations];
let minting = 0;
let scopeA = 0;
for (const at of new Set([...Object.keys(pre), ...Object.keys(now)])) {
  const mintingMove = text(pre[at]) !== text(ten[at]);
  const scopeMove = text(ten[at]) !== text(now[at]);
  if (mintingMove && scopeMove) violations.push(`${at}: moved in both`);
  else if (mintingMove) minting += 1;
  else if (scopeMove) scopeA += 1;
}
const record = read('test/fixtures/r0/t2-minting-comparison10.json');
const result = {
  ...record,
  ruling: 'dossier §18.200: the repeat on the Scope A source; comparison'
    + ' 10\'s moved rows unchanged, Scope A\'s movement checked against'
    + ' its two allowlists',
  build: `${commit.slice(0, 8)}. Against the pre-switch baseline at`
    + ` 2c5b9e30: ${minting} declarations move as in comparison 10 and`
    + ` ${scopeA} move by Scope A, none in both. Evidence:`
    + ' .build/evidence/2026-11-14-scope-a-impl/.',
  commit,
  scopeA: { baseline: 'comparison 10\'s dump (59e70fdb)',
    recoveries: check.recoveries, listedMovements: check.listedMovements,
    allowlists: ['research/r0-scope-a/in-scope-stage0.json',
      'research/r0-scope-a/impl1-movements.json'],
    check: 'research/r0-scope-a/movement-check.mjs', declarations: scopeA }
};
console.log(JSON.stringify({ minting, scopeA, violations }, null, 1));
if (violations.length === 0)
  writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
process.exitCode = violations.length === 0 ? 0 : 1;
