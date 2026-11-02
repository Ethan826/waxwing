// The generation correction of design §B, as a research hook for the
// `generation` scratch copy (scratch.mjs patches Generate/Control.purs
// `parameterAt`'s `annotated` to pass the marked annotation through
// `globalThis.__t2gen` before `annotationClauses`). It renames, in the
// annotation's marked type, every row tail that is the declaration's
// implicit ambient row variable (the last `VarId`, Resolve/Signature.purs
// and Resolve/Lambda.purs) to the enclosing lambda's own row
// `EffFresh path EffectOf`, as Check/Lambda.purs `annotationRow`
// substitutes the lambda's row for it. Written rows (a declared `...e`,
// `pure`) are other variables or closed, and stay. Research only.
//   T2_SCRATCH=generation node --import ./research/t2-read-back-design/\
//   redirect.mjs --import ./research/t2-read-back-design/\
//   hook-generation.mjs <script>
import { load } from '../../test/r0-generate-support.mjs';

const E = await load('Domain.Recorded.Effect');
const Maps = await load('Data.Map.Internal');
const { ordInt } = await load('Data.Ord');

const implicitOf = context => {
  const found = Maps.lookup(ordInt)(context.decl)(context.signatures);
  if (found.constructor.name !== 'Just')
    throw new Error('hook-generation: no signature for the declaration');
  return found.value0.sorts.length - 1;
};

// A structural copy with the implicit tail renamed; constructors kept.
const renamed = (value, implicit, path) => {
  if (value instanceof E.EffRigid && value.value0 === implicit) {
    globalThis.__t2renamed = (globalThis.__t2renamed ?? 0) + 1;
    return new E.EffFresh(path, E.EffectOf.value);
  }
  if (Array.isArray(value))
    return value.map(each => renamed(each, implicit, path));
  if (value === null || typeof value !== 'object') return value;
  const copy = Object.create(Object.getPrototypeOf(value));
  for (const key of Object.keys(value))
    copy[key] = renamed(value[key], implicit, path);
  return copy;
};

globalThis.__t2gen = (context, path, markedType) =>
  renamed(markedType, implicitOf(context), path);
