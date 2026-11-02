// Collection's cost (tranche 2 Task 7; dossier §18.155 (4)), reported
// apart from functional acceptance and gated by nothing. Compares two
// builds over the pinned R0 corpus (test/r0-corpus.mjs): `compile` on
// every program, and `recheck` on every declaration (what `compile`
// reaches through Check/Outcomes and Check/Inspect, plus `finish` and
// the second `numbering` in checkFunction). Each (build, workload) runs
// in its own fresh node process, so its peak resident set (maxRSS) is
// its own; rounds alternate builds to spread drift from load.
//   node scripts/r0-t2-trace-cost.mjs <collecting output> <removed output>
//     [rounds]
// The second build is the first with collection removed, made in a
// scratch copy outside the worktree (record functions' callers left the
// state unchanged, checkFunction's finish and second `numbering` gone).
import { spawnSync } from 'node:child_process';
import { loadavg, cpus } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRounds = 5;
const kibibyte = 1024;
const millisecondsPerNanosecond = 1e-6;

const worker = async (outputDir, workload) => {
  const { loadCorpus } = await import('../test/r0-corpus.mjs');
  const load = name =>
    import(pathToFileURL(resolve(outputDir, name, 'index.js')).href);
  const corpus = await loadCorpus();
  const { compile } = await load('Program.Compile');
  const { parse } = await load('Format.Parse');
  const { resolve: resolveProgram } = await load('Features.Resolve');
  const { recheck } = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const programs = corpus.map(entry => parse(entry.source))
    .filter(result => result.constructor.name === 'Right')
    .map(result => resolveProgram(result.value0))
    .filter(result => result.constructor.name === 'Right')
    .map(result => result.value0);
  const rechecked = program => {
    const holders = functional(program.ctors);
    program.functions.forEach(decl => recheck(holders)(program)(decl));
  };
  const run = workload === 'compile'
    ? () => corpus.forEach(entry => compile(entry.source))
    : () => programs.forEach(rechecked);
  const start = process.hrtime.bigint();
  run();
  const elapsed = Number(process.hrtime.bigint() - start)
    * millisecondsPerNanosecond;
  console.log(JSON.stringify({ ms: elapsed,
    maxRssMiB: process.resourceUsage().maxRSS / kibibyte }));
};

const measured = (outputDir, workload) => {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url),
    '--worker', outputDir, workload], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
};

const median = values => [...values].sort((a, b) => a - b)[
  Math.floor(values.length / 2)];

const compared = (builds, rounds) => Object.fromEntries(
  ['compile', 'recheck'].map(workload => {
    const samples = builds.map(() => []);
    for (let round = 0; round < rounds; round += 1)
      builds.forEach((dir, at) => samples[at].push(measured(dir, workload)));
    return [workload, builds.map((dir, at) => ({ build: dir,
      medianMs: Math.round(median(samples[at].map(item => item.ms))),
      msRuns: samples[at].map(item => Math.round(item.ms)),
      medianMaxRssMiB: Math.round(median(samples[at].map(item =>
        item.maxRssMiB))) }))];
  }));

if (process.argv[2] === '--worker')
  await worker(process.argv[3], process.argv[4]);
else {
  const [collecting, removed, rounds = defaultRounds] =
    process.argv.slice(2);
  const conditions = () => ({ loadavg: loadavg().map(value =>
    Number(value.toFixed(2))), cores: cpus().length,
  node: process.version });
  const before = conditions();
  const result = compared([collecting, removed], Number(rounds));
  console.log(JSON.stringify({ before, after: conditions(), rounds:
    Number(rounds), ...result }, null, 1));
}
