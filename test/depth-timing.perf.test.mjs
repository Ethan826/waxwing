// Absolute time bounds moved out of depth.test.mjs. They run only under
// `npm run perf` (scripts/perf.mjs); the routine half is
// depth-timing.serial.test.mjs.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { nestingLimit } from '../output/Format.Parse.Grammar/index.js';
import { work, cli } from './depth-support.mjs';

// E_NESTING (ADR 006), through the CLI: per form, depth = limit compiles,
// builds and runs; depth = limit + 1 is E_NESTING at the token that would
// exceed it. No run may print a raw RangeError or JavaScript stack frames.
const limit = nestingLimit;
after(() => rmSync(work, { recursive: true, force: true }));

// E005 acceptance: a match nested to the limit emits, builds and runs in
// under 10 s (closures: 34.6 s at depth 24, killed at 128). Go's build
// cache may supply the binary on later runs; the bound stays honest because
// closure-form Go for this program never builds within it.
const buildBudgetMs = 10_000;
const goEnv = { ...process.env, GOCACHE: resolve('.build/go-cache') };

// `go build` runs in its own process group, killed as a group on timeout:
// spawnSync's timeout kills only its child, which orphaned the `compile`
// grandchild when this test failed against the closure compiler.
const groupBuild = (go, binary, timeoutMs) => new Promise((done, fail) => {
  const child = spawn('go', ['build', '-o', binary, go],
    { detached: true, stdio: ['ignore', 'ignore', 'pipe'], env: goEnv });
  let errors = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { errors += chunk; });
  const kill = () => {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* group gone */ }
  };
  const timer = setTimeout(kill, Math.max(0, timeoutMs));
  child.on('error', fail);
  child.on('close', (status, signal) => {
    clearTimeout(timer);
    done({ status, signal, errors });
  });
});

test(`a match nested ${limit} deep builds and runs in under 10 s`,
  async () => {
    const source = 'fn main(): Int = ' + 'match 0 { _ => '.repeat(limit)
      + '7' + ' }'.repeat(limit) + ';';
    const own = mkdtempSync(join(tmpdir(), 'waxwing-budget-'));
    try {
      const started = performance.now();
      assert.equal(cli('emit', source, buildBudgetMs).status, 0);
      const binary = join(own, 'program');
      const built = await groupBuild(join(work, 'output.go'), binary,
        buildBudgetMs - (performance.now() - started));
      assert.equal(built.signal,
        null, `go build killed at ${buildBudgetMs} ms`);
      assert.equal(built.status, 0, built.errors);
      const ran = spawnSync(binary, [], { encoding: 'utf8',
        timeout: buildBudgetMs });
      assert.ifError(ran.error);
      assert.equal(ran.stdout, '7\n');
      const elapsed = performance.now() - started;
      assert.ok(elapsed < buildBudgetMs, `took ${elapsed} ms`);
    } finally { rmSync(own, { recursive: true, force: true }); }
  });
