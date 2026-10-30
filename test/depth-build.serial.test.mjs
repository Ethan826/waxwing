// Routine half of the E005 acceptance (the 10 s budget is in
// depth-timing.perf.test.mjs, npm run perf). The 100 s kill below is a
// termination safeguard, about ten times the budget: a review guideline,
// not a guarantee, since a slow machine can also reach it.
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

// E005 acceptance: a match nested to the limit emits, builds and runs
// (closures: 34.6 s at depth 24, killed at 128).
const terminationMs = 100_000;
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

test(`a match nested ${limit} deep builds and runs`,
  async () => {
    const source = 'fn main(): Int = ' + 'match 0 { _ => '.repeat(limit)
      + '7' + ' }'.repeat(limit) + ';';
    const own = mkdtempSync(join(tmpdir(), 'waxwing-budget-'));
    try {
      assert.equal(cli('emit', source, terminationMs).status, 0);
      const binary = join(own, 'program');
      const built = await groupBuild(join(work, 'output.go'), binary,
        terminationMs);
      assert.equal(built.signal,
        null, `go build killed at ${terminationMs} ms`);
      assert.equal(built.status, 0, built.errors);
      const ran = spawnSync(binary, [], { encoding: 'utf8',
        timeout: terminationMs });
      assert.ifError(ran.error);
      assert.equal(ran.stdout, '7\n');
    } finally { rmSync(own, { recursive: true, force: true }); }
  });
