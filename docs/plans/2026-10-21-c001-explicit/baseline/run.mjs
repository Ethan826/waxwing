import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compiler } from '../../../../scripts/differential-load.mjs';
import { outcome } from '../../../../test/fx-oracle.mjs';
import { representatives } from './representatives.mjs';
import { compareReport, uniformity } from './check-baseline.mjs';

const folder = dirname(fileURLToPath(import.meta.url));
const root = resolve(folder, '../../../..');
const build = resolve(root, '.build/c001-baseline');
const output = join(build, 'output');
const args = process.argv.slice(2);
const options = { uniform: false };
const usage = message => {
  console.error(message);
  process.exit(2);
};
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--replay') {
    if (options.replay || !args[index + 1] ||
        args[index + 1].startsWith('-')) usage('Expected one replay path');
    options.replay = args[++index];
  } else if (argument === '--require-uniform') {
    if (options.uniform) usage('Duplicate uniformity option');
    options.uniform = true;
  } else if (argument.startsWith('-')) usage(`Unknown option: ${argument}`);
  else if (options.destination) usage('Expected one output path');
  else options.destination = argument;
}
if (options.replay && options.destination) usage('Replay takes no output path');
const manifest = JSON.parse(readFileSync(join(folder, 'cases.json'), 'utf8'));
const sha256 = text => createHash('sha256').update(text).digest('hex');
const env = { ...process.env, GOCACHE: join(build, 'go-cache'),
  GOMODCACHE: join(build, 'go-mod-cache'), GOTOOLCHAIN: 'local',
  GOWORK: 'off' };
const finish = report => {
  const differences = compareReport(manifest, report);
  const nonuniform = uniformity(report);
  report.baselineDifferences = differences;
  report.nonuniformRepresentatives = nonuniform;
  for (const row of report.results) console.log(`${row.name}: `
    + `${differences.some(item => item.name === row.name) ? 'DIFF' : 'match'}; `
    + `compiler ${row.compiler.kind}; interpreter ${row.interpreter.kind}; `
    + `Go ${Object.values(row.representatives).filter(value =>
      value.kind === 'executed' && value.exit === 0).length}`);
  console.log(`Baseline differences: ${differences.length}; `
    + `nonuniform representative cases: ${nonuniform.join(', ') || 'none'}`);
  const differs = differences.length > 0;
  const failsUniformity = options.uniform && nonuniform.length > 0;
  process.exitCode = differs || failsUniformity ? 1 : 0;
  return report;
};
if (options.replay) {
  finish(JSON.parse(readFileSync(options.replay, 'utf8')));
} else {
  const destination = options.destination ?? join(build, 'results.json');
  const load = name => import(pathToFileURL(join(output, name, 'index.js')));
  const [c, specialization, reps] = await Promise.all([
    compiler(build), load('Features.Specialize'), representatives(load)
  ]);
  const rejected = result => ({ kind: 'rejected',
    problem: result.value0.problem.constructor.name,
    diagnostic: c.wire(result.value0) });
  const requireRight = result => {
    if (result instanceof c.Left) throw new Error(JSON.stringify(
      c.wire(result.value0)));
    return result.value0;
  };
  mkdirSync(build, { recursive: true });
  const runGo = (name, source) => {
    const path = join(build, `${name}.go`);
    writeFileSync(path, source);
    const run = spawnSync('go', ['run', path], { cwd: root, env,
      encoding: 'utf8', timeout: 60_000 });
    if (run.error) throw run.error;
    return { kind: 'executed', stdout: run.stdout, stderr: run.stderr,
      exit: run.status, goSha256: sha256(source) };
  };
  const interpreter = (source, expected) => {
    if (expected.kind === 'not-run') return { kind: 'not-run' };
    try {
      const result = outcome(source);
      return { kind: 'executed', stdout: result.stdout,
        stderr: result.stderr, status: result.status };
    } catch (error) {
      return { kind: 'error', message: error.message };
    }
  };
  const inspectTypes = object => {
    let typeHoleOccurrences = 0;
    const visit = value => {
      if (value === null || typeof value !== 'object') return;
      if (value.constructor.name === 'TVar' &&
          value.value0.constructor.name === 'Hole') typeHoleOccurrences++;
      Object.values(value).forEach(visit);
    };
    visit(object);
    return { typeHoleOccurrences };
  };
  const infrastructureErrors = [];
  const snapshot = JSON.parse(readFileSync(join(folder,
    'evidence/compiler-manifest.json'), 'utf8'));
  for (const [path, digest] of Object.entries(snapshot.source_sha256)) {
    if (sha256(readFileSync(join(root, path))) !== digest) {
      infrastructureErrors.push(`compiler source drift: ${path}`);
    }
  }
  for (const [path, digest] of Object.entries(
    snapshot.compiled_javascript_sha256)) {
    if (sha256(readFileSync(join(output, path))) !== digest) {
      infrastructureErrors.push(`private build drift: ${path}`);
    }
  }
  const buildDiagnostics = JSON.parse(readFileSync(join(build,
    'compiler-build.json'), 'utf8'));
  if (buildDiagnostics.errors.length || buildDiagnostics.warnings.length) {
    infrastructureErrors.push('compiler build warnings/errors');
  }
  const results = [];
  for (const [name, expected] of Object.entries(manifest.cases)) {
    const source = readFileSync(join(folder, `${name}.wxw`), 'utf8');
    const row = { name, sourceSha256: sha256(source), representatives: {},
      interpreter: interpreter(source, expected.interpreter) };
    try {
      const compiled = c.compile(source);
      row.compiler = compiled instanceof c.Left ? rejected(compiled)
        : { kind: 'accepted' };
      if (!(compiled instanceof c.Left)) {
        const checked = requireRight(c.check(requireRight(c.resolve(
          requireRight(c.parse(source))))));
        row.checkedTypes = inspectTypes(checked);
        row.functionKeys = requireRight(
          specialization.specializationKeys(checked))
          .filter(key => key.function).map(key => ({
            name: checked.functions[key.declaration].name,
            arguments: key.arguments.map(type => type.constructor.name)
          }));
        for (const [kind, type] of Object.entries(reps)) {
          try {
            const specialized = specialization.specializeWith(type)(checked);
            row.representatives[kind] = specialized instanceof c.Left
              ? rejected(specialized)
              : runGo(`${name}-${kind}`, kind === 'Int' ? compiled.value0
                : c.emit(specialized.value0));
          } catch (error) {
            row.representatives[kind] = { kind: 'tool-error',
              message: error.message };
          }
        }
      }
    } catch (error) {
      row.compiler = { kind: 'tool-error', message: error.message };
    }
    results.push(row);
  }
  const version = (command, arguments_) => {
    const found = spawnSync(command, arguments_, { encoding: 'utf8' });
    if (found.status !== 0) infrastructureErrors.push(`${command} version`);
    return found.stdout?.trim();
  };
  const report = finish({ node: process.version,
    purs: version('purs', ['--version']), go: version('go', ['version']),
    buildDiagnostics, scope: manifest.scope, infrastructureErrors, results });
  writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
}
