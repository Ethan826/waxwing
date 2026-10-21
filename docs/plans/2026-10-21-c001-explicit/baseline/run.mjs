import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compiler } from '../../../../scripts/differential-load.mjs';
import { outcome } from '../../../../test/fx-oracle.mjs';

const folder = dirname(fileURLToPath(import.meta.url));
const root = resolve(folder, '../../../..');
const build = resolve(root, '.build/c001-baseline');
const output = join(build, 'output');
const destination = process.argv[2] ?? join(build, 'results.json');
const cases = JSON.parse(readFileSync(join(folder, 'cases.json'), 'utf8'));
const load = name => import(pathToFileURL(join(output, name, 'index.js')));
const [c, specialization, types] = await Promise.all([
  compiler(build), load('Features.Specialize'), load('Domain.Type')
]);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const env = { ...process.env, GOCACHE: join(build, 'go-cache'),
  GOMODCACHE: join(build, 'go-mod-cache'), GOTOOLCHAIN: 'local',
  GOWORK: 'off' };
mkdirSync(build, { recursive: true });
const errors = [];
const requireRight = result => {
  if (result instanceof c.Left) throw new Error(JSON.stringify(
    c.wire(result.value0)));
  return result.value0;
};
const runGo = (name, source) => {
  const path = join(build, `${name}.go`);
  writeFileSync(path, source);
  const run = spawnSync('go', ['run', path], { cwd: root, env,
    encoding: 'utf8', timeout: 60_000 });
  if (run.error) throw run.error;
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, '');
  return run.stdout;
};
const version = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  assert.equal(result.status, 0);
  return result.stdout.trim();
};
const inspectTypes = object => {
  const census = {};
  const visit = value => {
    if (value === null || typeof value !== 'object') return;
    const name = value.constructor.name;
    if (/^(T|Hole)/.test(name)) census[name] = (census[name] ?? 0) + 1;
    if (name === 'TVar' && value.value0.constructor.name === 'Hole') {
      census.typeHoleOccurrences = (census.typeHoleOccurrences ?? 0) + 1;
    }
    Object.values(value).forEach(visit);
  };
  visit(object);
  return census;
};
const results = [];
const positives = { ...cases.positive, ...cases.follow_up.positive,
  ...cases.stage_follow_up.positive, ...cases.order_follow_up.positive };
for (const [name, expected] of Object.entries(positives)) {
  const source = readFileSync(join(folder, `${name}.wxw`), 'utf8');
  const row = { name, expected, sha256: sha256(source) };
  try {
    try {
      const oracle = outcome(source);
      row.interpreter = { stdout: oracle.stdout, stderr: oracle.stderr,
        status: oracle.status };
      assert.equal(oracle.status, 0, oracle.stderr);
      assert.equal(oracle.stdout, expected);
    } catch (error) {
      row.interpreterError = error.message;
    }
    const checked = requireRight(c.check(requireRight(c.resolve(
      requireRight(c.parse(source))))));
    row.checkedTypes = inspectTypes(checked);
    const keys = requireRight(specialization.specializationKeys(checked));
    row.functionKeys = keys.filter(key => key.function).map(key => ({
      name: checked.functions[key.declaration].name,
      arguments: key.arguments.map(type => type.constructor.name)
    }));
    const generated = requireRight(c.compile(source));
    row.goSha256 = sha256(generated);
    row.go = runGo(name, generated);
    assert.equal(row.go, expected);
    const alternate = requireRight(specialization.specializeWith(
      types.TBool.value)(checked));
    row.boolRepresentative = runGo(`${name}-bool`, c.emit(alternate));
    assert.equal(row.boolRepresentative, expected);
    if (row.interpreterError) throw new Error(row.interpreterError);
    row.status = 'pass';
  } catch (error) {
    row.status = 'unexpected';
    row.error = error.message;
    errors.push(name);
  }
  results.push(row);
  console.log(`${name}: ${row.status}`);
}
for (const [name, expectedProblem] of Object.entries(cases.negative)) {
  const source = readFileSync(join(folder, `${name}.wxw`), 'utf8');
  const result = c.compile(source);
  const row = { name, expectedProblem, sha256: sha256(source) };
  if (result instanceof c.Left) {
    row.problem = result.value0.problem.constructor.name;
    row.diagnostic = c.wire(result.value0);
    row.status = row.problem === expectedProblem ? 'pass' : 'unexpected';
  } else row.status = 'unexpected';
  if (row.status !== 'pass') errors.push(name);
  results.push(row);
  console.log(`${name}: ${row.status}`);
}
const report = { node: process.version, purs: version('purs', ['--version']),
  go: version('go', ['version']), grammar: cases.grammar,
  amendments: [cases.follow_up.reason, cases.stage_follow_up.reason,
    cases.order_follow_up.reason],
  buildDiagnostics: JSON.parse(readFileSync(join(build,
    'compiler-build.json'), 'utf8')), results, unexpected: errors };
writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
process.exitCode = errors.length === 0 ? 0 : 1;
