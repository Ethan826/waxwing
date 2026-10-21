import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = dirname(fileURLToPath(import.meta.url));
const scratch = resolve(folder, '../../../../.build/c001-baseline/sensitivity');
mkdirSync(scratch, { recursive: true });
const healthy = JSON.parse(readFileSync(join(folder,
  'evidence/results.json'), 'utf8'));
const run = (file, options = []) => spawnSync(process.execPath,
  [join(folder, 'run.mjs'), '--replay', file, ...options],
  { encoding: 'utf8' });
const original = join(folder, 'evidence/results.json');
assert.equal(run(original, ['--require-unifrom']).status, 2,
  'unknown flags must not silently omit the uniformity gate');
assert.equal(spawnSync(process.execPath,
  [join(folder, 'run.mjs'), '--replay']).status, 2,
  'replay needs a path');
assert.equal(run(original).status, 0, 'healthy baseline must match');
const property = run(original, ['--require-uniform']);
assert.equal(property.status, 1, 'representative differences must fail gate');
assert.match(property.stdout, /Baseline differences: 0;/);
const row = (report, name) => report.results.find(item => item.name === name);
const mutations = {
  compiler: report => { row(report, 'p2-construction').compiler =
    { kind: 'accepted' }; },
  goOutput: report => { row(report, 'p4-two-operands')
    .representatives.Bool.stdout = 'wrong\n'; },
  oracleError: report => { row(report, 'c7-pure-stages-construction')
    .interpreter.message += ' changed'; },
  missingRepresentative: report => {
    delete row(report, 'a1-discard-dictionary').representatives.Record;
  },
  typeSensitiveOutput: report => { row(report, 'h1-print-empty')
    .representatives.Record.stdout = 'wrong\n'; },
  changedPrintability: report => { row(report, 'h1-print-empty')
    .representatives.Function = { kind: 'executed', stdout: 'Nil\n',
      stderr: '', exit: 0 }; },
  missingCase: report => { report.results.pop(); },
  extraCase: report => { report.results.push({ ...report.results[0],
    name: 'unlisted' }); }
};
const checks = [];
for (const [name, mutate] of Object.entries(mutations)) {
  const changed = structuredClone(healthy);
  mutate(changed);
  const path = join(scratch, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(changed, null, 2)}\n`);
  const checked = run(path);
  assert.equal(checked.status, 1, `${name} must fail baseline gate`);
  checks.push({ name, exit: checked.status });
}
const result = { healthyReplayExit: 0, uniformityGateExit: property.status,
  invalidOptionChecks: 2,
  scope: 'Result-record mutations exercise the real CLI exit gate. They '
    + 'are not source or compiler mutations.', checks };
writeFileSync(join(folder, 'evidence/runner-sensitivity.json'),
  `${JSON.stringify(result, null, 2)}\n`);
console.log(`Healthy replay: 0; uniformity gate: 1; `
  + `${checks.length} result-record mutations rejected`);
