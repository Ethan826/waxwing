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

export const regenerate = (candidate, file) => {
  rmSync(file, { force: true });
  const tests = readdirSync(join(candidate, 'test'))
    .filter(name => name.endsWith('.test.mjs')).map(name => `test/${name}`);
  const hook = new URL('./differential-hook.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: candidate, encoding: 'utf8',
    env: { ...process.env, WAXWING_HARVEST: file,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${hook}` }
  });
  // A failing test (e.g. a timing bound under load) still harvested its
  // sources; report it rather than discard the corpus, and keep the run's
  // output so the failure can be identified (it was once discarded).
  const log = `${file}.log`;
  writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  console.log(`harvest: test run exited ${result.status}; log ${log}`);
  const failed = (result.stdout ?? '').split('\n')
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
