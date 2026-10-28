import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync,
  statSync, writeFileSync } from 'node:fs';
import { exitCodeFor, prove, rowTree, runRegression }
  from '../scripts/regression-run.mjs';
import { r0AminRows } from '../scripts/regression-r0-amin.mjs';
import { runPool } from '../scripts/regression-pool.mjs';
const names = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
const rows = names.map(name => ({ name }));
const pause = () => new Promise(resolve => setTimeout(resolve, 3));
const noBaseline = () => {};
// Mimics the real prover's assertion: the restored defect must fail the
// probe; a defect that does not fail is an assertion error.
const proverWhereDefectSurvives = survivor => async row => {
  await pause();
  assert.equal(row.name === survivor, false,
    `${row.name}: restored defect did not fail`);
};
const passingProver = async () => pause();
// Collects console output for the duration of `run`.
const captured = async (t, run) => {
  const lines = [];
  t.mock.method(console, 'log', line => lines.push(line));
  t.mock.method(console, 'error', line => lines.push(line));
  const result = await run();
  return { result, lines };
};
const options = prove => ({ prove, buildBase: noBaseline });
test('one row whose defect does not fail is the only failure', async t => {
  const { result, lines } = await captured(t, () => runRegression(rows, [],
    4, options(proverWhereDefectSurvives('charlie'))));
  assert.deepEqual(result, ['charlie']);
  assert.ok(lines.includes(
    'Regression proofs: 4 of 5 passed (jobs 4).'), lines.join('\n'));
  assert.ok(lines.some(line => line.includes('FAILED: charlie')),
    lines.join('\n'));
  assert.equal(exitCodeFor(result), 1);
});
test('a row rejecting without a reason is counted as failed',
  async t => {
    const prove = async row => {
      await pause();
      if (row.name === 'delta') return Promise.reject();
    };
    const { result, lines } = await captured(t, () => runRegression(rows,
      [], 4, options(prove)));
    assert.deepEqual(result, ['delta']);
    assert.ok(lines.includes('Regression proofs: 4 of 5 passed (jobs 4).'),
      lines.join('\n'));
    assert.equal(exitCodeFor(result), 1);
  });
test('all rows passing gives no failures and exit code 0', async t => {
  const { result, lines } = await captured(t, () => runRegression(rows, [],
    4, options(passingProver)));
  assert.deepEqual(result, []);
  assert.ok(lines.includes('Regression proofs: 5 of 5 passed (jobs 4).'));
  assert.ok(!lines.some(line => line.includes('FAILED')));
  assert.equal(exitCodeFor(result), 0);
});
test('an unknown row name fails and names the unknown name', async t => {
  let proved = 0;
  const prove = async () => { proved++; };
  await captured(t, async () => {
    await assert.rejects(() => runRegression(rows, ['bravo', 'no-such-row'],
      4, options(prove)), /no-such-row/);
  });
  assert.equal(proved, 0);
});
test('fewer than one job is refused', async () => {
  await assert.rejects(() => runRegression(rows, [], 0, options(passingProver)),
    /jobs/);
  await assert.rejects(() => runPool([1], 0, async () => {}), /jobs/);
});
const sha = file => createHash('sha256').update(readFileSync(file))
  .digest('hex');
const testRow = (edits, extra = {}) => ({ name: 'unit-test-tree',
  tree: 'test', edits, probe: 'r0-amin-cohort-pin-readonly',
  message: /a moved cohort passed/, ...extra });
const compare = 'test/r0-fail-only-compare.mjs';
const rowRoot = '.build/regression/unit-test-tree';
const links = dir => readdirSync(dir, { recursive: true })
  .filter(name => lstatSync(`${dir}/${name}`).isSymbolicLink());
const pin = 'test/fixtures/r0/effects-fail-only.json';
const marker = 'output/marker.js';
// A stand-in baseline with one output file: the harness clones it, as it
// does the real one. Running this file while scripts/regression.mjs runs
// would remove that run's baseline (verify runs them in turn).
const withBaseline = async run => {
  rmSync('.build/regression', { recursive: true, force: true });
  mkdirSync('.build/regression/baseline/output', { recursive: true });
  writeFileSync(`.build/regression/baseline/${marker}`, 'baseline\n');
  try {
    await run();
  } finally {
    rmSync('.build/regression', { recursive: true, force: true });
  }
};
test('a test-tree row whose needle is missing is an error, and its '
  + 'isolated copy has no links and leaves the real test/ alone',
async () => withBaseline(async () => {
  const row = testRow([{ file: compare, needle: 'no such needle',
    replacement: 'x' }]);
  const before = [sha(compare), sha(pin)];
  await assert.rejects(() => prove(row), /exactly one target/);
  assert.deepEqual(links(rowRoot), []);
  assert.equal(statSync(`${rowRoot}/${compare}`).nlink, 1);
  assert.deepEqual([sha(compare), sha(pin)], before);
}));
// The edit applies; the unknown probe then fails the healthy run, so the
// row stops with its copy edited and in place to inspect.
test('a test-tree row edits only its own independent copy',
  async () => withBaseline(async () => {
    const needle = "import { readFileSync } from 'node:fs';\n";
    const row = testRow([{ file: compare, needle,
      replacement: `${needle}// edited in the copy\n` }],
    { probe: 'no-such-probe' });
    const before = [sha(compare), sha(pin)];
    await assert.rejects(() => prove(row));
    assert.match(readFileSync(`${rowRoot}/${compare}`, 'utf8'),
      /edited in the copy/);
    assert.deepEqual([sha(compare), sha(pin)], before);
    assert.deepEqual(links(rowRoot), []);
    for (const file of [compare, marker]) {
      assert.equal(statSync(`${rowRoot}/${file}`).nlink, 1, file);
    }
    writeFileSync(`${rowRoot}/${marker}`, 'clone\n');
    assert.equal(readFileSync(`.build/regression/baseline/${marker}`,
      'utf8'), 'baseline\n');
  }));
test('a row whose edit path leaves its root is rejected', async () => {
  for (const file of ['test/../src/Main.purs', '/tmp/x', './test/a.mjs',
    'test//a.mjs']) {
    await assert.rejects(() => prove(testRow([{ file, needle: 'a',
      replacement: 'b' }])), /relative and normalized/, file);
  }
});
test('a row needs exactly one form of edit', async () => {
  await assert.rejects(() => prove(testRow([])), /needs an edit/);
  await assert.rejects(() => prove(testRow([{ file: compare, needle: 'a',
    replacement: 'b' }], { file: compare })), /either edits or a file/);
});
test('a row mixing src and test edits is rejected', async () => {
  const edits = [{ file: compare, needle: 'a', replacement: 'b' },
    { file: 'src/Main.purs', needle: 'a', replacement: 'b' }];
  await assert.rejects(() => prove(testRow(edits)), /only files under test/);
  await assert.rejects(() => prove(testRow(edits, { tree: undefined })),
    /need tree: 'test'/);
  await assert.rejects(() => prove(testRow(edits, { tree: 'src' })),
    /unknown tree/);
});
test('the real pin row is a test-tree row', () => {
  const row = r0AminRows.find(r => r.name === 'r0-amin-cohort-pin-readonly');
  assert.equal(rowTree(row), 'test');
});
