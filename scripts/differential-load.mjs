// What scripts/differential.mjs and the FX020 migration scripts share:
// loading a built compiler from a tree's output/, and harvesting every
// source a tree's own test suite parses (scripts/differential-hook.mjs).
import { spawnSync } from 'node:child_process';
import {
  existsSync, readFileSync, readdirSync, rmSync, writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const compiler = async tree => {
  const load = name => import(pathToFileURL(
    resolve(tree, 'output', name, 'index.js')).href);
  const modules = ['Format.Lex', 'Format.Parse', 'Features.Resolve',
    'Features.Check', 'Features.Specialize', 'Format.Go',
    'Format.Diagnostic', 'Data.Either', 'Program.Compile'];
  const [lex, parse, resolution, check, specialize, go, diagnostic,
    either, compile] = await Promise.all(modules.map(load));
  return { lex: lex.lex, isName: lex.isName, parse: parse.parse,
    resolve: resolution.resolve, check: check.check,
    specialize: specialize.specialize, emit: go.emit,
    wire: diagnostic.wire, Left: either.Left, compile: compile.compile };
};

// The suite runs as verify runs it (scripts/verify.mjs): every file but
// the `*.serial.test.mjs` ones in parallel, then those one file at a time,
// since they time heavy work against fixed bounds. Run all at once under
// the parallel runner, 14 of them failed on 2026-10-19 (BACKLOG T005).
export const regenerate = (candidate, file) => {
  rmSync(file, { force: true });
  const serial = name => name.endsWith('.serial.test.mjs');
  const tests = readdirSync(join(candidate, 'test'))
    .filter(name => name.endsWith('.test.mjs')).sort()
    .map(name => `test/${name}`);
  const hook = new URL('./differential-hook.mjs', import.meta.url).href;
  const runOf = args => spawnSync(process.execPath, args, {
    cwd: candidate, encoding: 'utf8',
    env: { ...process.env, WAXWING_HARVEST: file,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${hook}` }
  });
  const runs = [runOf(['--test', ...tests.filter(name => !serial(name))]),
    runOf(['--test', '--test-concurrency=1', ...tests.filter(serial)])];
  // A failing test still harvested its sources; report it rather than
  // discard the corpus, and keep the run's output so the failure can be
  // identified (it was once discarded).
  const log = `${file}.log`;
  const output = runs.map(found => `${found.stdout ?? ''}${found.stderr ?? ''}`)
    .join('');
  writeFileSync(log, output);
  const status = runs.map(found => found.status).join(', ');
  console.log(`harvest: test runs (parallel, serial) exited ${status}; `
    + `log ${log}`);
  const failed = runs.flatMap(found => (found.stdout ?? '').split('\n'))
    .filter(line => line.startsWith('✖ ') && !/failing tests/.test(line));
  for (const line of [...new Set(failed)]) console.log(`  ${line}`);
};

const sourcesIn = (tree, directory) => {
  const path = join(tree, directory);
  return existsSync(path) ? readdirSync(path).sort()
    .map(name => readFileSync(join(path, name), 'utf8')) : [];
};

export const harvested = (candidate, file) => {
  if (!existsSync(file)) {
    throw new Error(`no harvest at ${file}; rerun with --regenerate`);
  }
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return [...new Set([...lines.map(line => JSON.parse(line)),
    ...sourcesIn(candidate, 'examples'),
    ...sourcesIn(candidate, 'negative')])];
};
