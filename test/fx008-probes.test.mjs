import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from '../output/Program.Compile/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';
import { runGoBatch } from './go-batch.mjs';
import { probes } from './fx008-probe-table.mjs';
import { tableHash } from './fx008-probe-hash.mjs';
import { probeNotes } from './fx008-probe-notes.mjs';

// The FX008 probe gate (plan docs/plans/2026-10-10-abort-tracking-plan.md,
// Task 1). Each probe pins its observed outcome; a task changes only the
// entries the plan lists for it (see docs/engineering.md).
const childTimeoutMs = 20_000;
const sourceOf = probe => readFileSync(`test/fx008-probes/${probe.file}.wxw`,
  'utf8');
const sha256 = text => createHash('sha256').update(text).digest('hex');
const expectedOf = probe => (probe.flipped ? probe.fx008 : probe.today);
const withoutFlipped = ({ flipped, ...rest }) => rest;

// A slow probe may hang, so it compiles in its own process under a timeout
// (ruling F17) and reports the wire diagnostic or the Go it emitted.
const childProgram = `
import { readFileSync } from 'node:fs';
const root = process.argv[2];
const { compile } = await import(root + 'Program.Compile/index.js');
const { Left } = await import(root + 'Data.Either/index.js');
const { wire } = await import(root + 'Format.Diagnostic/index.js');
const result = compile(readFileSync(process.argv[1], 'utf8'));
const shown = result instanceof Left
  ? { accepted: false, diagnostic: wire(result.value0) }
  : { accepted: true, go: result.value0 };
process.stdout.write(JSON.stringify(shown));
`;

const compileInChild = probe => {
  const outputRoot = `${pathToFileURL(resolve('output')).href}/`;
  const child = spawnSync('node', ['--input-type=module', '-e', childProgram,
    resolve(`test/fx008-probes/${probe.file}.wxw`), outputRoot], {
    encoding: 'utf8', timeout: childTimeoutMs, maxBuffer: 1 << 28
  });
  assert.notEqual(child.error?.code, 'ETIMEDOUT', 'timed out');
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
};

const compileInProcess = probe => {
  const result = compile(sourceOf(probe));
  return result instanceof Left
    ? { accepted: false, diagnostic: wire(result.value0) }
    : { accepted: true, go: result.value0 };
};

const spanOf = diagnostic =>
  ({ start: diagnostic.span.start.offset, end: diagnostic.span.end.offset });

const checkRejection = (expected, shown) => {
  assert.equal(shown.accepted, false, 'expected a rejection');
  const { diagnostic } = shown;
  assert.equal(diagnostic.code, expected.code);
  if (expected.pattern === undefined) {
    assert.equal(diagnostic.message, expected.message);
  } else {
    assert.match(diagnostic.message, new RegExp(expected.pattern));
  }
  assert.deepEqual(spanOf(diagnostic), { start: expected.start, end: expected.end });
};

// Task 10: a flipped rejection carries the notes pinned beside the table.
const checkNotes = (probe, diagnostic) => {
  if (probeNotes[probe.file] === undefined) return;
  const source = sourceOf(probe);
  const shown = diagnostic.related.map(note =>
    [source.slice(note.span.start.offset, note.span.end.offset), note.message]);
  assert.deepEqual(shown, probeNotes[probe.file]);
};

const checkGo = (expected, shown) => {
  assert.equal(shown.accepted, true, 'expected acceptance');
  // A pinned hash is required whenever acceptance is asserted: an outcome
  // with `go: null` (gain1 until Task 7) must not pass without a Go check.
  assert.match(String(expected.go), /^[0-9a-f]{64}$/, 'Go hash not pinned');
  assert.equal(sha256(shown.go), expected.go);
};

const checkRun = (expected, run) => {
  assert.deepEqual(
    { status: run.status, stdout: run.stdout, stderr: run.stderr },
    { status: expected.status, stdout: expected.stdout,
      stderr: expected.stderr });
};

// Slow accepted probes are built and run here, outside the shared batch, so
// a hang in their compile stays inside the child's timeout.
const runAlone = go => {
  const work = mkdtempSync(join(tmpdir(), 'waxwing-fx008-'));
  try {
    const main = join(work, 'main.go');
    writeFileSync(main, go);
    const env = { ...process.env, GOCACHE: resolve('.build/go-cache') };
    const built = spawnSync('go', ['build', '-o', join(work, 'program'), main],
      { encoding: 'utf8', timeout: 120_000, env });
    assert.equal(built.status, 0, built.stderr);
    return spawnSync(join(work, 'program'), [],
      { encoding: 'utf8', timeout: 60_000 });
  } finally { rmSync(work, { recursive: true, force: true }); }
};

const batched = probes.filter(
  probe => expectedOf(probe).accepted && !probe.slow);
const batch = runGoBatch(import.meta.url,
  batched.map(probe => [probe.file, sourceOf(probe)]));

const checkProbe = probe => {
  const expected = expectedOf(probe);
  const shown = probe.slow ? compileInChild(probe) : compileInProcess(probe);
  if (!expected.accepted) {
    checkRejection(expected, shown);
    return checkNotes(probe, shown.diagnostic);
  }
  checkGo(expected, shown);
  checkRun(expected, probe.slow ? runAlone(shown.go) : batch.result(probe.file));
  return undefined;
};

for (const probe of probes) {
  test(`probe ${probe.file}`, () => checkProbe(probe));
}

test('a flipped probe names its task and differs from today', () => {
  const flipped = probes.filter(probe => probe.flipped);
  for (const probe of flipped) {
    assert.notEqual(probe.task, undefined, `${probe.file}: no task`);
    assert.notDeepEqual(probe.fx008, probe.today, `${probe.file}: no change`);
  }
});

test('a probe whose fx008 differs from today names its task', () => {
  const changed = probes.filter(
    probe => JSON.stringify(probe.fx008) !== JSON.stringify(probe.today));
  for (const probe of changed) {
    assert.notEqual(probe.task, undefined, `${probe.file}: no task`);
  }
});

test('the probe table is untampered', () => {
  const text = JSON.stringify(probes.map(withoutFlipped));
  assert.equal(sha256(text), tableHash);
});
