// A generic shape of compiled PureScript values for reading and
// printing: maps as [key, value] pairs, constructors by name. Research
// support only (test/r0-effects-canonical.mjs's encoder, generalized).
import { load } from '../../test/r0-generate-support.mjs';

const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');

export const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
export const isMap = value => value instanceof Maps.Leaf
  || value instanceof Maps.Node;
export const named = value => value.constructor.name;

// Stacks (Features.Check.Search) are kept as arrays, oldest first.
export const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (isMap(value)) return pairs(value).map(([k, v]) =>
    [shape(k), shape(v)]);
  if (value === null || typeof value !== 'object') return value;
  if (named(value) === 'Push' || named(value) === 'Bottom')
    return stack(value).map(shape);
  if (value.constructor === Object) return Object.fromEntries(
    Object.keys(value).map(name => [name, shape(value[name])]));
  const fields = Object.keys(value).map(name => shape(value[name]));
  return fields.length === 0 ? named(value) : { [named(value)]: fields };
};

export const stack = value => {
  const items = [];
  for (let at = value; named(at) === 'Push'; at = at.value1)
    items.push(at.value0);
  return items.reverse();
};

// A stable text key for any value.
export const keyOf = value => JSON.stringify(shape(value));
