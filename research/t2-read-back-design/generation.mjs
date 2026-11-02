// Design §B's probe: the generation correction's effect on the pins and
// on the inventory's annotation reads. Healthy (`node generation.mjs`):
// the candidates where a recorded annotation row tail `EffRigid` meets a
// live value other than that rigid (the inventory's 11). Under the
// `generation` scratch copy with hook-generation.mjs: per pin source and
// declaration, whether the hook renamed a tail (the prediction), the
// effect pin's moved keys (test/r0-effects-pin-run.mjs, the pinned
// file only read), the problem pin's moved programs, and the same
// annotation reads as in the healthy run. Corpus-observed.
import { sourcesOf, pinnedEffects, movedKeys, healthyBuild,
  digestsOfProgram } from '../../test/r0-effects-pin-run.mjs';
import { problemTable, pinnedProblems }
  from '../../test/r0-problem-pin-run.mjs';
import { declarationsOf, stageOf } from '../t2-read-back-inventory/corpus.mjs';
import { factsOf } from '../t2-read-back-inventory/sources.mjs';

const scratch = globalThis.__t2gen !== undefined;
const out = { scratch };

// Annotation reads: a rigid tail read where the rigid is not what the
// live checker holds, and annotation variables met by two live values.
const annotationReads = async sources => {
  const apart = [];
  const split = [];
  for (const entry of sources) for (const item of declarationsOf(entry)) {
    if (!stageOf(item).startsWith('candidate')) continue;
    if (item.live.rebuiltApart) continue;
    const facts = factsOf(item);
    if (facts.some(f => f.kind === 'rigid' && f.where === 'annotation param'
      && f.text !== `[|rigid:${f.id}]`)) apart.push(item.at);
    const texts = new Map();
    for (const f of facts) if (f.kind === 'var'
      && f.variable.value1?.constructor.name === 'EffectOf') {
      const key = JSON.stringify(f.variable.value0);
      if (!texts.has(key)) texts.set(key, new Set());
      texts.get(key).add(f.text);
    }
    if ([...texts.values()].some(set => set.size > 1)) split.push(item.at);
  }
  return { rigidApart: apart, effectOfSplit: split };
};

const sources = await sourcesOf();
if (scratch) {
  const build = await healthyBuild();
  const predicted = [];
  const digests = {};
  for (const { origin, source } of sources) {
    const program = build.program(source);
    if (program === null) continue;
    for (const [name, digest] of digestsOfProgram(build, program))
      digests[`${origin}#${name}`] = digest;
    const { tables, signatures } = build.Inputs.generationInputs(program);
    for (const decl of program.functions) {
      globalThis.__t2renamed = 0;
      build.Generate.generate(tables)(signatures)(decl);
      if (globalThis.__t2renamed > 0) predicted.push(`${origin}#${decl.name}`);
    }
  }
  const moved = movedKeys(pinnedEffects().digests, digests);
  const changed = new Set(moved.changed);
  out.effectPin = { ...moved, predicted,
    predictedNotMoved: predicted.filter(key => !changed.has(key)),
    movedNotPredicted: moved.changed.filter(k => !predicted.includes(k)) };
  const problems = await problemTable();
  const pinned = pinnedProblems().digests;
  out.problemPin = Object.keys(pinned).filter(origin =>
    pinned[origin] !== problems.digests[origin]);
}
out.reads = await annotationReads(sources);
// Each moved declaration's place in the inventory's four-way split.
if (scratch) {
  const stages = {};
  const moved = new Set(out.effectPin.changed);
  for (const entry of sources) for (const item of declarationsOf(entry))
    if (moved.has(item.at)) {
      const key = stageOf(item);
      stages[key] = (stages[key] ?? 0) + 1;
      if (key.startsWith('candidate')) (out.movedCandidates ??= [])
        .push(item.at);
    }
  out.movedByStage = stages;
}
console.log(JSON.stringify(out, null, 1));
