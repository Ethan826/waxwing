import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';
import { keyOf } from './r0-rules-support.mjs';
import { recheck } from './r0-cx-support.mjs';

// Task 5.2 (T-R0a §5.1; AT17): the CX refuter in the shadow assembly.
// On T-R0c's probes every certificate its check accepts re-evaluates
// true by an independent bounded brute force (test/r0-cx-support.mjs),
// and no verdict differs from the run without the shadow. The check's
// refusals are in test/r0-cx-check.test.mjs, the decider's oracle test
// in test/r0-cx-decide.test.mjs.
const online = await onlineFrom(load);
const Decide = await load('Features.Check.Decide');
const Project = await load('Features.Check.Refute.Project');
const Search = await load('Features.Check.Refute.Counter.Search');
const { SearchHint } = await load('Domain.Verdict.Search');
const { Just } = await load('Data.Maybe');

const probeDir = 'research/division-campaign/r0/probes';
const probeFiles = readdirSync(join(repoRoot, probeDir))
  .filter(name => name.endsWith('.wxw')).sort();

const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');

// The resolved program, or null where Resolve refuses (no catch: any
// other failure fails the test).
const resolvedOrNull = source => {
  const parsed = parse(source);
  assert.equal(parsed.constructor.name, 'Right');
  const found = resolve(parsed.value0);
  return found.constructor.name === 'Right' ? found.value0 : null;
};
const unresolved = ['d02-body-type-lacking.wxw', 'd03-same-disjoint.wxw'];

// Every declaration of every probe that resolves (d02 and d03 are
// Resolve-time refusals, T-R0c §3.12), with both runs of `decide`.
const runs = probeFiles.flatMap(file => {
  const program = resolvedOrNull(
    readFileSync(join(repoRoot, probeDir, file), 'utf8'));
  assert.equal(program === null, unresolved.includes(file), file);
  if (program === null) return [];
  const checking = online.Shadow.shadowChecking(online.legacyText)(budget)(
    program);
  return program.functions.map(decl => {
    const problem = online.problemOf(program, decl.name);
    return { at: `${file.replace(/\.wxw$/, '')}#${decl.name}`, problem,
      checking, decided: Decide.decide(checking)(problem),
      alone: Decide.decide({ ...checking, shadows: [] })(problem) };
  });
});

const shadowsOf = decided => decided.value0.attempts
  .filter(attempt => attempt.constructor.name === 'Shadow')
  .map(attempt => attempt.value0);

// Where the check accepted a certificate: what T-R0c §7.2's bounded
// oracle found invalid among these probes (refusal-audit.md), plus a01,
// a03 and the pattern probes' flexible-only refutations.
const refuted = ['a01-clash-ground#f', 'a02-clash-rigid#f',
  'a03-occurs-type#main', 'a04-occurs-row#main', 'a05-record-homeless#f',
  'b01-overlap-pair#main', 'b02-mayhold-forced#use',
  'b04-share-meta-only#use', 'd01-extend-duplicate#f',
  'e01-pattern-rigid-field#f', 'e02-pattern-order-ab#main',
  'e03-pattern-order-ba#main'];

test('the shadow assembly runs CX as a shadow refuter only', () => {
  assert.ok(runs.length > 30);
  for (const run of runs) {
    assert.deepEqual(run.checking.refuters, [], run.at);
    const [record, ...more] = shadowsOf(run.decided);
    assert.deepEqual(more, [], run.at);
    assert.equal(record.refuter, 'CX', run.at);
    assert.equal(record.awaits, 'CX-KP + CX-PR', run.at);
  }
});

test('each probe certificate re-evaluates true by brute force', () => {
  const found = [];
  for (const run of runs) {
    const [record] = shadowsOf(run.decided);
    if (record.result.constructor.name !== 'Right') continue;
    found.push(run.at);
    const checked = record.result.value0;
    const sig = Project.toSig(run.problem);
    assert.ok(sig instanceof Just, run.at);
    const again = recheck(sig.value0, checked);
    assert.equal(again.dHolds, true, `${run.at}: D fails under rho`);
    assert.equal(again.solution, null,
      `${run.at}: solution ${JSON.stringify(again.solution && [
        ...again.solution])}`);
    assert.ok(checked.patterns >= 1, run.at);
  }
  assert.deepEqual(found, refuted);
});

// T-R0c §7.2 finds b03 and c01 valid in the bounded model (H refuses
// valid programs there): a certificate would contradict that.
test('no certificate where the bounded oracle finds the probe valid', () => {
  for (const at of ['b03-mayhold-share#use', 'c01-h-label#route']) {
    const run = runs.find(found => found.at === at);
    const [record] = shadowsOf(run.decided);
    assert.equal(record.result.constructor.name, 'Left', at);
    assert.equal(record.result.value0.constructor.name, 'NoCounterInstance',
      at);
  }
});

// AT17: the verdict, every other attempt and the search faults are those
// of the run without the shadow.
test('AT17: no probe verdict changes because of a shadow record', () => {
  for (const run of runs) {
    const [withShadow, without] = [run.decided, run.alone].map(describe);
    assert.equal(withShadow.verdict, without.verdict, run.at);
    assert.deepEqual(withShadow.attempts.filter(item =>
      !item.startsWith('Shadow ')), without.attempts, run.at);
    assert.deepEqual(withShadow.searchFaults, without.searchFaults, run.at);
    assert.equal(withShadow.attempts.length, without.attempts.length + 1);
  }
});

// The certificate names original body atoms: its ids are ids of the
// recorded `B`, and the brute force reads exactly those atoms.
test('a certificate body names recorded B atoms', () => {
  for (const run of runs) {
    const [record] = shadowsOf(run.decided);
    if (record.result.constructor.name !== 'Right') continue;
    const ids = new Set(Project.toSig(run.problem).value0.b.map(entry =>
      keyOf(entry.id)));
    for (const id of record.result.value0.body)
      assert.ok(ids.has(keyOf(id)), run.at);
  }
});

// Seeding (T-R0a §5.1): labels a hint names in backticks are tried
// first. Here every one-label instance of `r` refutes `{ ...r } = {}`;
// unseeded, the first written label is taken, seeded with a hint
// naming `b`, `b` is.
test('a hint seeds the search with its labels', () => {
  const program = online.programOf('fn f(p: { ...r }, q: { a: Int, b: Int'
    + ' }): {} = { let x = q.a; p };\nfn main(): Int = 0;\n');
  const problem = online.problemOf(program, 'f');
  const labelOf = hints => {
    const found = Search.searchCX(budget)(hints)(problem);
    assert.ok(found instanceof Just);
    const [row] = found.value0.rho.row;
    return row.value1.map(field => field.value0);
  };
  assert.deepEqual(labelOf([]), ['a']);
  assert.deepEqual(labelOf([new SearchHint('field `b`')]), ['b']);
  // Only the backticked form seeds: a bare `b` in the text does not.
  assert.deepEqual(labelOf([new SearchHint('b, but not quoted')]), ['a']);
});
