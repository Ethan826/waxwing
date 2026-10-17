// Self-tests of the per-file Go batch harness (T001, test/go-batch.mjs).
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { checked, command, runGo } from './support.mjs';
import {
  asCasePackage, batchDirectory, batchId, runGoBatch
} from './go-batch.mjs';

const answer = 'fn main(): Int = 42;';
const nullary = 'type N = A | B; fn main(): N = A;';
// Builds a constructor no Waxwing program can: tag 9 of a two-constructor
// type, so printing main's value panics.
const malformed = go => {
  const ctor = 'return waxwingTy0{tag: 1}';
  assert.equal(go.split(ctor).length, 2, 'one tag-1 constructor');
  return go.replace(ctor, 'return waxwingTy0{tag: 9}');
};
const thrown = action => {
  try { action(); } catch (error) { return error; }
  return assert.fail('expected a throw');
};

test('a rejected case fails alone, with the runGo message', () => {
  const bad = 'fn main(): Int = true;';
  const batch = runGoBatch(import.meta.url,
    [['good', answer], ['bad', bad]], 'reject');
  assert.equal(batch.run('good'), '42\n');
  const expected = thrown(() => runGo(bad));
  const actual = thrown(() => batch.run('bad'));
  assert.equal(actual.constructor, expected.constructor);
  assert.equal(actual.message, expected.message);
});

test('ill-formed generated Go fails the batch, naming its case', () => {
  const broken = {
    source: answer, transform: go => `${go}\nfunc broken() { undefinedName }\n`
  };
  const batch = runGoBatch(import.meta.url,
    [['healthy', answer], ['broken', broken]], 'ill-formed');
  for (const name of ['healthy', 'broken']) {
    const error = thrown(() => batch.run(name));
    assert.match(error.message, /failed to compile/, name);
    assert.match(error.message, /offending case\(s\): "broken"$/m, name);
    assert.match(error.message, /undefinedName/, name);
  }
});

test('a panicking case matches its standalone program', () => {
  const batch = runGoBatch(import.meta.url, [
    ['sibling', answer], ['panics', { source: nullary, transform: malformed }]
  ], 'panic');
  assert.equal(batch.run('sibling'), '42\n');
  const work = mkdtempSync(join(tmpdir(), 'waxwing-batch-test-'));
  try {
    writeFileSync(join(work, 'main.go'), malformed(checked(nullary)));
    command('go', ['build', '-o', join(work, 'program'), 'main.go'],
      { cwd: work });
    const alone = spawnSync(join(work, 'program'), [], { encoding: 'utf8' });
    const batched = batch.result('panics');
    assert.notEqual(alone.status, 0);
    assert.equal(batched.status, alone.status);
    assert.equal(batched.stdout, alone.stdout);
    const first = text => text.split('\n')[0];
    assert.equal(first(alone.stderr), 'panic: waxwing: malformed value');
    assert.equal(first(batched.stderr), first(alone.stderr));
    assert.match(thrown(() => batch.run('panics')).message,
      /panic: waxwing: malformed value/);
  } finally { rmSync(work, { recursive: true, force: true }); }
});

test('the rewrite guard rejects unexpected shapes, naming the case', () => {
  const go = checked(answer);
  assert.match(asCasePackage('fine', 'c0', go), /^package c0$/m);
  const shapes = {
    'two package clauses':
      go.replace('package main', 'package main\npackage main'),
    'another package': go.replace('package main', 'package other'),
    'a second, other package':
      go.replace('package main', 'package main\npackage other'),
    'two mains': `${go}\nfunc main() { fmt.Println(1) }\n`,
    'multiline main': go.replace(/^func main\(\) \{ /m, 'func main() {\n'),
    'a second, multiline main': `${go}\nfunc main() {\nfmt.Println(1)\n}\n`,
    'existing Main': `${go}\nfunc Main() {}\n`
  };
  for (const [name, shape] of Object.entries(shapes)) {
    assert.throws(() => asCasePackage(name, 'c0', shape),
      new RegExp(`case "${name}" has an unexpected shape`), name);
  }
  const batch = runGoBatch(import.meta.url, [['healthy', answer], ['odd', {
    source: answer,
    transform: shape => shape.replace('package main', 'package x')
  }]], 'guard');
  for (const name of ['healthy', 'odd']) {
    assert.match(thrown(() => batch.run(name)).message,
      /case "odd" has an unexpected shape/, name);
  }
});

test('a batch clears only its own per-process directory', () => {
  const id = batchId(import.meta.url, 'own dir');
  assert.equal(id, 'go-batch.test.mjs-own-dir'.replace(/\./g, '-'));
  const root = resolve('.build/go-batches');
  const own = batchDirectory(id);
  assert.equal(own, join(root, `${id}.${process.pid}`));
  // Another process's directory for the same id, and an unrelated batch.
  const neighbours = [batchDirectory(id, 1), join(root, 'neighbour')];
  for (const dir of neighbours) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'marker'), '');
  }
  try {
    mkdirSync(own, { recursive: true });
    writeFileSync(join(own, 'stale'), '');
    const batch = runGoBatch(import.meta.url, [['answer', answer]], 'own dir');
    assert.equal(batch.run('answer'), '42\n');
    assert.ok(existsSync(join(own, 'go.mod')), 'synthetic go.mod');
    assert.ok(!existsSync(join(own, 'stale')), 'own directory cleared');
    for (const dir of neighbours) {
      assert.ok(existsSync(join(dir, 'marker')), `${dir} untouched`);
    }
  } finally {
    for (const dir of [own, ...neighbours]) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  assert.throws(() => runGoBatch(import.meta.url, [['answer', answer]],
    'own dir'),
    /already claimed/);
});

const child = () => new Promise(settle => {
  const process_ = spawn('node', ['test/go-batch-child.mjs'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  process_.stdout.on('data', chunk => { stdout += chunk; });
  process_.stderr.on('data', chunk => { stderr += chunk; });
  process_.on('close', status => settle({ status, stdout, stderr }));
});

test('concurrent processes building one batch id both succeed (T002)',
  async () => {
    const runs = await Promise.all([child(), child(), child()]);
    const reports = runs.map(run => {
      assert.equal(run.status, 0, run.stderr);
      return JSON.parse(run.stdout);
    });
    const expected = ['0', '1', '2', '3', '4', '5'];
    for (const report of reports) assert.deepEqual(report.outputs, expected);
    assert.equal(new Set(reports.map(r => r.directory)).size, 3,
      'each process builds in its own directory');
    for (const { directory } of reports) {
      assert.ok(!existsSync(directory), `${directory} removed on exit`);
    }
  });

test('duplicate case names are refused when the batch is declared', () => {
  const unique = (count, name) =>
    [['other', answer], ...Array.from({ length: count }, () => [name, answer])];
  assert.throws(() => runGoBatch(import.meta.url, unique(2, 'same'), 'dup'),
    /duplicate case name "same"/);
  // Names are compared as run() looks them up, so 1 and '1' collide.
  assert.throws(() => runGoBatch(import.meta.url,
    [[1, answer], ['1', answer]], 'dup numeric'), /duplicate case name "1"/);
  assert.equal(runGoBatch(import.meta.url, unique(1, 'same'), 'no dup')
    .run('same'), '42\n');
});

test('Unit entries batch without printing their result', () => {
  const batch = runGoBatch(import.meta.url, [
    ['quiet', 'fn main(): Unit = ();'],
    ['console', 'fn main(): Unit with Console = Console.print(42);']
  ], 'unit');
  assert.equal(batch.run('quiet'), '');
  assert.equal(batch.run('console'), '42\n');
});
