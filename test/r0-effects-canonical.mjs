// Canonical form of a recorded effect problem (amin tranche 1, Task 1),
// kept apart from test/r0-canonical.mjs so the pinned problem encoding
// is untouched. Maps are arrays of [key, value] pairs, as `vars` and
// `types` are there; each field has one stable form. Task 1 produces only
// empty fields, so a non-empty value is encoded by its shape (arrays and
// maps recursively, constructors by name and fields) and later tasks
// replace that fallback with per-type arms.
const Maps = await import('../output/Data.Map.Internal/index.js');
const Unfoldable = await import('../output/Data.Unfoldable/index.js');

const pairsOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const isMap = value => value instanceof Object
  && ['Leaf', 'Node'].includes(value.constructor.name);

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

const names = ['obligations', 'instances', 'annotations', 'nodes',
  'rigidMarks', 'effectRigids', 'arities', 'ambient', 'flexEff',
  'positions'];

export const effectsOf = effects =>
  Object.fromEntries(names.map(name => [name, shape(effects[name])]));
