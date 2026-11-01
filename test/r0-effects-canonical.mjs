// Canonical form of a recorded effect problem (amin tranche 1, Task 1),
// kept apart from test/r0-canonical.mjs so the pinned problem encoding
// is untouched. Maps are arrays of [key, value] pairs, as `vars` and
// `types` are there; each field has one stable form. Task 1 produces only
// empty fields, so a non-empty value is encoded by its shape (arrays and
// maps recursively, constructors by name and fields) and later tasks
// replace that fallback with per-type arms.
const healthyMaps = await import('../output/Data.Map.Internal/index.js');
const healthyUnfoldable = await import('../output/Data.Unfoldable/index.js');

const names = ['obligations', 'instances', 'annotations', 'nodes',
  'rigidMarks', 'effectRigids', 'arities', 'ambient', 'flexEff',
  'positions', 'signature', 'declarations'];

// The encoder over one build's Data.Map and Data.Unfoldable. A map is
// recognized by that build's own constructors, so a regression probe
// encodes a rebuilt copy's values with the copy's modules.
export const encoderFor = (Maps, Unfoldable) => {
  const pairsOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const isMap = value => value instanceof Maps.Leaf
    || value instanceof Maps.Node;
  const shape = value => {
    if (Array.isArray(value)) return value.map(shape);
    if (isMap(value)) return pairsOf(value).map(([k, v]) =>
      [shape(k), shape(v)]);
    if (value === null || typeof value !== 'object') return value;
    const { constructor } = value;
    const fields = Object.keys(value).map(name => shape(value[name]));
    return constructor === Object ? Object.fromEntries(Object.keys(value)
      .map(name => [name, shape(value[name])]))
      : { [constructor.name]: fields };
  };
  return effects => {
    fieldsAre(effects);
    return Object.fromEntries(names.map(name =>
      [name, shape(effects[name])]));
  };
};

// The effect problem's fields are exactly the encoded `names`, so a field
// added to EffectProblem (Domain/Recorded/Effect.purs) fails loudly
// instead of leaving the pin blind to it.
const fieldsAre = effects => {
  const found = Object.keys(effects).sort();
  if (JSON.stringify(found) !== JSON.stringify([...names].sort()))
    throw new Error(`effect problem fields [${found}] are not the `
      + `encoded [${names}]`);
};

export const effectsOf = encoderFor(healthyMaps, healthyUnfoldable);
