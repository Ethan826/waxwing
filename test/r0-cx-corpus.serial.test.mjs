import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { cxDeclarations } from './r0-cx-run.mjs';
import { BeyondBound, recheck } from './r0-cx-support.mjs';

// Task 5.2 over the pinned corpus (corpus-wide, so serial). CX question 2
// (refute/statements.md §8): is every source-derived `D` scoped? Checked
// here for every declaration that generates and projects: `D` mentions
// no variable outside the rigid list of its sort, so `CXChecked` needs
// no values for flexible variables. Then the shadow refuter's corpus
// certificates: none is for a declaration today's checker accepts, and
// each re-evaluates true by the bounded brute force where the brute
// force can decide within `corpusLimit` assignments; the rest are listed.
const Project = await load('Features.Check.Refute.Project');
const Instance = await load('Features.Check.Refute.Counter.Instance');
const Check = await load('Features.Check.Refute.Counter.Check');
const { Just } = await load('Data.Maybe');

const rows = await cxDeclarations();
const generated = rows.filter(row => row.problem !== null);
const corpusLimit = 200_000;

test('CX question 2: every corpus D is scoped', () => {
  const projected = generated.map(row => Project.toSig(row.problem))
    .filter(sig => sig instanceof Just).map(sig => sig.value0);
  const unscoped = projected.filter(sig => {
    const outside = Instance.unscoped(sig);
    return outside.ty.length + outside.row.length > 0;
  });
  assert.equal(unscoped.length, 0);
  assert.deepEqual({ declarations: rows.length,
    generationFaults: rows.length - generated.length,
    projected: projected.length,
    withD: projected.filter(sig => sig.d.length > 0).length,
    dAtoms: projected.reduce((sum, sig) => sum + sig.d.length, 0) },
  // 3,011 until the ten C001 additions (2026-10-24, dossier §18.73).
  { declarations: 3061, generationFaults: 0, projected: 3061, withD: 444,
    dAtoms: 1393 });
});

const certified = generated.filter(row => row.found instanceof Just);

// Where the brute force passes `corpusLimit` (no claim either way).
const beyondBound = [
  'research/division-campaign/finite-base-followup/generic.wxw#route',
  'research/division-campaign/finite-base-followup/nominal.wxw#route',
  'test/fixtures/r005b/render-d6-neither.json#main',
  'test/fixtures/r005b/render-d6-nested.json#main',
  'test/fixtures/r005b/render-d6-one.json#main',
  'test/fixtures/r005b/render-none-control-annotated.json#main',
  'test/fixtures/r005b/render-none-control.json#main'];

test('no corpus certificate is for a declaration today accepts', () => {
  assert.equal(certified.length, 72);
  assert.deepEqual(certified.filter(row => row.todayAccepts)
    .map(row => row.at), []);
  for (const row of certified) assert.equal(Check.checkCX(row.problem)(
    row.found.value0).constructor.name, 'Right', row.at);
});

test('corpus certificates re-evaluate true by brute force', () => {
  const beyond = [];
  for (const row of certified) {
    const sig = Project.toSig(row.problem).value0;
    let again;
    try { again = recheck(sig, row.found.value0, corpusLimit); } catch (e) {
      if (!(e instanceof BeyondBound)) throw e;
      beyond.push(row.at);
      continue;
    }
    assert.equal(again.dHolds, true, row.at);
    assert.equal(again.solution, null, row.at);
  }
  assert.deepEqual(beyond, beyondBound);
});
