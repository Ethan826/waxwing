// Design §C.7's probe (review finding I2): how often the type
// read-back's completion unifier θ (ReadBack.purs step 2, `completing`)
// binds a hole, and so changes a positioned value the effect side would
// also read from the checked body. Over the corpus loader's candidates,
// with the `theta` scratch copy (scratch.mjs) handing θ and the
// positioned values to a hook. Corpus-observed, research only.
//   node research/t2-read-back-design/scratch.mjs theta
//   T2_SCRATCH=theta node --import ./research/t2-read-back-design/\
//   redirect.mjs research/t2-read-back-design/theta.mjs
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';
import { budget, onlineFrom } from '../../test/r0-online-support.mjs';
import { keyOf, named, pairs } from '../t2-read-back-inventory/shape.mjs';

const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Online = await load('Features.Check.Strategy.Online');
const { holeIndex } = await load('Domain.Recorded.Hole');

let seen = null;
globalThis.__t2theta = (theta, values) => {
  seen = { theta, values };
  return theta;
};

const out = { candidates: 0, completed: 0, unified: 0, thetaBindsHole: 0,
  holesBound: 0, imageKinds: {}, positionedChanged: 0,
  declarationsChanged: 0, examples: [], rowfulImages: {},
  auxiliaryAt: [] };

// An image with an arrow or a handler head somewhere (image-rows.mjs).
const rowful = image => {
  const stack = [image];
  while (stack.length > 0) {
    const t = stack.pop();
    const kind = named(t);
    if (kind === 'Arrow') return true;
    if (kind === 'App') {
      if (named(t.value0) === 'HandlerHead') return true;
      stack.push(...t.value1);
    } else if (kind === 'Record') stack.push(...t.value0.map(p => p.value1));
  }
  return false;
};
const bump = (key) => { out.imageKinds[key] = (out.imageKinds[key] ?? 0)
  + 1; };

const declaration = (program, inputs, origin) => decl => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return;
  seen = null;
  const found = Online.onlineSearch(online.contextOf(program))(budget)(
    Elaborating.problem(generated.value0));
  if (named(found) !== 'Candidate') return;
  out.candidates += 1;
  if (seen === null) return;
  out.completed += 1;
  if (named(seen.theta) !== 'Just') return;
  out.unified += 1;
  const bound = pairs(seen.theta.value0).filter(([v]) =>
    named(holeIndex(v)) === 'Just');
  if (bound.length > 0) out.thetaBindsHole += 1;
  out.holesBound += bound.length;
  for (const [, image] of bound) bump(named(image));
  const unsettled = new Map(pairs(found.value0.unsettled)
    .map(([v, t]) => [keyOf(v), keyOf(t)]));
  const changed = seen.values.filter(pair =>
    unsettled.get(keyOf(pair.value0)) !== keyOf(pair.value1)).length;
  out.positionedChanged += changed;
  // Images needing rows or marks (review finding I1), positioned or
  // completed by θ (an auxiliary, which no live type positions).
  const positioned = new Set(seen.values.map(pair => keyOf(pair.value0)));
  for (const [v, image] of pairs(found.value0.unsettled))
    if (rowful(image)) {
      const key = positioned.has(keyOf(v)) ? 'positioned' : 'auxiliary';
      out.rowfulImages[key] = (out.rowfulImages[key] ?? 0) + 1;
      if (key === 'auxiliary' && !out.auxiliaryAt.includes(
        `${origin}#${decl.name}`)) out.auxiliaryAt.push(
        `${origin}#${decl.name}`);
    }
  if (changed > 0) {
    out.declarationsChanged += 1;
    if (out.examples.length < 5) out.examples.push(`${origin}#${decl.name}`);
  }
};

for (const { origin, source } of await loadCorpus()) {
  let program;
  try { program = resolved(source); } catch { continue; }
  const inputs = Inputs.generationInputs(program);
  program.functions.forEach(declaration(program, inputs, origin));
}
console.log(JSON.stringify(out, null, 1));
