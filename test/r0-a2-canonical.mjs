// The canonical comparison for spec §11's owed compatibility property
// (erase of the honest package equals today's read-back substitution),
// approved "up to record field order" (dossier §18.148 (5)). One
// definition, for a substitution (`Map Var RTExpr`) or a package map
// (`Map Var PTy`, `Map Var PRecordRow`, `Map EVar PRow`):
//   - a record's fields are sorted by label, each label keeping its own
//     value (RTExpr `Record`, PTy's `{ fields, tails }`);
//   - a record's tails keep their order, none dropped (the author approved
//     record FIELD order only; controller ruling on review I2,
//     ratified by the author, §18.150);
//   - every other array keeps its order and length: effect labels keep
//     their multiplicity and their occurrence order, same-key and
//     otherwise (the ruling does not permit reordering labels);
//   - variables, holes included, keep their identity: no renaming;
//   - a map is read in its keys' `Ord` order.
// It serves the erased-substitution property only (author, §18.150):
// erasure drops effect rows, so label order never reaches it. Do not
// broaden it to reorder arbitrary arrays; comparing full effect packages
// takes R-A's semantic row equality (distinct keys commute; same-key
// order, multiplicity, arguments, marks and tails stay significant).
// Two values compare equal iff their canonical forms are equal. The
// property itself stays owed until tranche 2's read-back produces honest
// packages; this file defines the comparison only.
// A test helper, not shipped code: it has no restored-defect regression
// row (review M10). Its mutation check was the development RED of its
// unit tests, test/r0-a2-canonical.test.mjs.
import { load } from './r0-generate-support.mjs';

const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');

const isMap = value => ['Leaf', 'Node'].includes(value.constructor.name);
const isTuple = value => value.constructor.name === 'Tuple';
const text = value => JSON.stringify(value);

// Fields as [label, value] pairs sorted by label; tails in order.
const record = (fields, tails) => ({ record: {
  fields: fields.map(field => [field.value0, canonical(field.value1)])
    .sort((left, right) => left[0] < right[0] ? -1
      : left[0] > right[0] ? 1 : 0),
  tails: tails.map(canonical) } });

const constructed = value => {
  const name = value.constructor.name;
  const parts = Object.keys(value).map(key => value[key]);
  if (name === 'Record' && parts.length === 2 && Array.isArray(parts[0])
    && parts[0].every(isTuple))
    return record(parts[0], parts[1]);
  return { [name]: parts.map(canonical) };
};

const plain = value => {
  const keys = Object.keys(value).sort();
  if (keys.length === 2 && keys[0] === 'fields' && keys[1] === 'tails')
    return record(value.fields, value.tails);
  return Object.fromEntries(keys.map(key => [key, canonical(value[key])]));
};

const canonical = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (isMap(value))
    return Maps.toUnfoldable(unfoldableArray)(value)
      .map(pair => [canonical(pair.value0), canonical(pair.value1)]);
  return value.constructor === Object ? plain(value) : constructed(value);
};

export const canonicalSubstitution = canonical;

// Equal up to record field order, nothing else.
export const sameSubstitution = (left, right) =>
  text(canonical(left)) === text(canonical(right));
