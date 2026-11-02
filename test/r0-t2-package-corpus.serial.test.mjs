import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus } from './r0-corpus.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';
import { sameSubstitution } from './r0-a2-canonical.mjs';
import { packageCases } from './r0-t2-package-cases.mjs';

// Tranche 2 Task 11 (design §C.6, §C.7; dossier §18.155 (3), (5), (6)),
// corpus-observed: over the corpus loader's online candidates,
// `readEffects` gives a package or a fault; the faults are exactly the
// `Declined UnframedInstall` declarations and the two statsEvidence
// `UnreadImage`s. Every package keeps one sort per hole number, and its
// erasure is today's σ by the canonical comparison. Corpus-wide, hence
// serial.
const online = await onlineFrom(load);
const cases = await packageCases(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const Function = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const RB = await load('Features.Check.Strategy.ReadBack');
const Package = await load('Features.Check.Strategy.ReadBack.Package');
const Erase = await load('Features.Check.Strategy.Effects.Package');
const Maps = await load('Data.Map.Internal');

const { named } = cases;
const baseline = 'docs/plans/2026-10-21-c001-explicit/baseline/';

const tally = async () => {
  const out = { candidates: 0, packages: 0, faults: [], sortClashes: [],
    erasure: [], holeBindings: 0, shared: 0 };
  const declaration = (program, inputs, origin) => decl => {
    const generated = Generate.generate(inputs.tables)(inputs.signatures)(
      decl);
    if (named(generated) !== 'Right') return;
    const problem = Elaborating.problem(generated.value0);
    const found = Online.onlineSearch(online.contextOf(program))(budget)(
      problem);
    if (named(found) !== 'Candidate') return;
    out.candidates += 1;
    const where = `${origin}#${decl.name}`;
    const live = Function.recheck(functional(program.ctors))(program)(decl)
      .value0;
    const readBack = RB.readBack(problem)(live.function).value0;
    out.holeBindings += Maps.size(readBack.holeBindings);
    const read = Package.readEffects(problem)(readBack)(live.function)(
      live.state.subst.marks)(live.trace);
    if (named(read) === 'Left') {
      const fault = read.value0;
      const detail = named(fault) === 'Declined' ? named(fault.value0) : '';
      out.faults.push(`${where} ${named(fault)} ${detail}`.trim());
      return;
    }
    out.packages += 1;
    const pkg = read.value0;
    if (cases.sortClashes(pkg).length > 0) out.sortClashes.push(where);
    if (!sameSubstitution(Erase.erase(pkg), readBack.unsettled))
      out.erasure.push(where);
    const maps = new Map();
    for (const { map, n } of cases.holesOf(pkg))
      maps.set(n, new Set([...maps.get(n) ?? [], map]));
    out.shared += [...maps.values()].filter(each => each.size > 1).length;
  };
  for (const { origin, source } of await loadCorpus()) {
    let program;
    try { program = resolved(source); } catch { continue; }
    const inputs = Inputs.generationInputs(program);
    program.functions.forEach(declaration(program, inputs, origin));
  }
  return out;
};

// The 9 problems recording `Unsupported UnframedInstall` (§18.155 (7)).
const unframed = ['test/fx008-probes/f3.wxw#main',
  'test/fx008-probes/rev7/late1.wxw#main',
  'test/fx008-probes/rev7/late2.wxw#main',
  'test/fx008-probes/rev8/one3.wxw#main',
  'test/fx008-probes/rev8/two3.wxw#main',
  'test/fx008-probes/rigid.wxw#main',
  'test/fixtures/r0/audit/expected-handler.pinned-selection.json#k',
  'test/fx008-defer-programs.mjs:r2#1#run',
  'test/fx008-defer-programs.mjs:r9#1#main'];

test('every candidate reads a package or a stated fault', async () => {
  const out = await tally();
  console.log(`${out.candidates} candidates, ${out.packages} packages, `
    + `${out.faults.length} faults; ${out.shared} hole numbers met in `
    + `two maps of one package; θ bound ${out.holeBindings} holes`);
  assert.deepEqual(out.faults, [
    `${baseline}c7-pure-stages-construction.wxw#statsEvidence UnreadImage`,
    `${baseline}q7-pure-construction.wxw#statsEvidence UnreadImage`,
    ...unframed.map(each => `${each} Declined UnframedInstall`)]);
  assert.equal(out.candidates, 2823);
  assert.equal(out.packages, 2812);
  assert.deepEqual(out.sortClashes, []);
  assert.deepEqual(out.erasure, []);
  assert.equal(out.holeBindings, 0);
  // Corpus-observed drift pin, not a property: the hole numbers met in
  // two maps of one package (shared identity in use), counted on this
  // corpus on 2026-11-02. A change is explained, never silently re-pinned.
  assert.equal(out.shared, 47);
});
