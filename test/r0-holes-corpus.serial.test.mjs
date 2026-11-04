import { captured } from './r0-holes-capture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Dossier §18.161 (6), corpus-wide detection: for every corpus-loader
// declaration that `recheck` accepts (every function of every program
// that parses and resolves), the settled body that `holes` receives is
// captured (test/r0-holes-capture.mjs) and checked by
// test/r0-holes-walks.mjs: E, T, H1 (no meta anywhere in the body is
// outside the numbering, so the renamed body holds no raw meta) and H2.
// The planted must-fail drops one meta per body from the numbering and
// must fail H1 on every body that has a meta: a wiring check (the corpus
// bodies reach the checks, and H1 reads them), not evidence that a
// diverging walk is seen; test/r0-holes-walks.test.mjs carries that.
// Corpus-observed; the argument from the code is in
// docs/plans/2026-11-04-holes-numbering-findings.md.
const { load } = await import('./r0-generate-support.mjs');
const { loadCorpus } = await import('./r0-corpus.mjs');
const { bodyChecks, metasOf, missingMeta, modulesOf, productionWalks } =
  await import('./r0-holes-walks.mjs');
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { recheck } = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const M = await modulesOf(load);
const check = bodyChecks(M, productionWalks(M));

const run = { declarations: 0, bodies: 0, withMetas: 0, metas: 0,
  failures: [], planted: 0, plantedMissed: [] };
for (const { origin, source } of await loadCorpus()) {
  const parsed = parse(source);
  if (parsed.constructor.name !== 'Right') continue;
  const resolved = resolve(parsed.value0);
  if (resolved.constructor.name !== 'Right') continue;
  const program = resolved.value0;
  const holders = functional(program.ctors);
  for (const decl of program.functions) {
    const at = `${origin}#${decl.name}`;
    captured.length = 0;
    recheck(holders)(program)(decl);
    run.declarations += 1;
    for (const body of captured.splice(0)) {
      run.bodies += 1;
      const found = check(body);
      const failed = Object.entries(found)
        .filter(([, list]) => list.length > 0);
      if (failed.length > 0) run.failures.push({ at, failed });
      const metas = metasOf(M.Open, body);
      run.metas += metas.length;
      if (metas.length === 0) continue;
      run.withMetas += 1;
      const planted = bodyChecks(M, missingMeta(M, metas[0]))(body);
      if (planted.H1.length > 0) run.planted += 1;
      else run.plantedMissed.push(at);
    }
  }
}

test('every captured corpus body: collection and renaming agree', () => {
  assert.ok(run.bodies > 1000, `${run.bodies} bodies`);
  // Floors, not pins: 2,823 bodies, 280 with a meta on 2026-11-04.
  assert.ok(run.withMetas > 200, `${run.withMetas} bodies with a meta`);
  assert.deepEqual(run.failures, []);
});

test('planted: a numbering missing a meta fails H1 on every such body', () => {
  assert.deepEqual(run.plantedMissed, []);
  assert.equal(run.planted, run.withMetas);
});

test('the run is reported', () => {
  console.log(JSON.stringify({ declarations: run.declarations,
    bodies: run.bodies, withMetas: run.withMetas, metas: run.metas }));
});
