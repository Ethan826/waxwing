// The effect-erased projection T2 and T8 compare (D1 spec §9, §10,
// §12.1's fallback; R0 Task 7.1b): a compiled checked value as plain
// JSON in which every type keeps its structure but no effect row (a
// `TFun`'s row, a data type's row arguments, a handler's rows and its
// label's mark), the declaration's own row is left out, and holes are
// renumbered in order of first occurrence after erasure. Two values
// equal up to a renaming of holes give equal projections, and only
// they: renumbering by first occurrence in one fixed walk is a canonical
// form under renaming, the same equivalence as renumbering by `holes`
// (Features.Check.Holes), whose walk differs only in its order.
const name = value => value.constructor.name;
const tyNames = new Set(['TInt', 'TBool', 'TData', 'TVar', 'TFun', 'TUnit',
  'THandler', 'TText', 'TRecord']);
const bases = { TInt: 'Int', TBool: 'Bool', TUnit: 'Unit', TText: 'Text' };

const byKey = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);

const open = variable => (name(variable) === 'Rigid'
  ? { rigid: variable.value0 } : { hole: variable.value0 });

// One type, rows erased; `hole` maps each hole number as it is met.
export const erasedType = (ty, hole = open) => {
  const go = found => {
    switch (name(found)) {
      case 'TVar': return name(found.value0) === 'Rigid'
        ? { rigid: found.value0.value0 } : hole(found.value0);
      case 'TFun': return { fun: [go(found.value0), go(found.value2)] };
      case 'TData': return { data: [found.value0, found.value1.map(go)] };
      case 'THandler': return { handler: [plain(found.value0.value0),
        found.value0.value1.map(go)] };
      case 'TRecord': return { record: [found.value0.fields.map(field =>
        [field.value0, go(field.value1)]), found.value0.tails.map(tail =>
        (name(tail) === 'Rigid' ? { rigid: tail.value0 } : hole(tail)))] };
      default: return base(found);
    }
  };
  return go(ty);
};

// Fails closed (BACKLOG R027): `undefined` for an unknown constructor
// would equal any other unknown one and hide a difference.
const base = found => {
  if (!(name(found) in bases))
    throw new Error(`erasedType: unknown type constructor ${name(found)}`);
  return bases[name(found)];
};

// Any compiled value as JSON, each type through `typeOf` (`null`: as
// it stands, rows and holes included). A record's fields are taken in
// sorted order, so two values built in different orders read, and
// number their holes, alike.
export const plain = (value, typeOf = erasedType) => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => plain(item, typeOf));
  if (typeOf !== null && tyNames.has(name(value))) return typeOf(value);
  const fields = Object.fromEntries(Object.entries(value).sort(byKey)
    .map(([field, part]) => [field, plain(part, typeOf)]));
  return name(value) === 'Object' ? fields : { [name(value)]: fields };
};

// A renumbering of holes by first occurrence, shared across calls.
export const renumbering = () => {
  const seen = new Map();
  return variable => {
    if (!seen.has(variable.value0)) seen.set(variable.value0, seen.size);
    return { hole: seen.get(variable.value0) };
  };
};

// T2's whole-declaration projection: rows erased, the declaration's row
// left out, holes renumbered after erasure.
export const erasedDecl = decl => {
  const hole = renumbering();
  const { row: _row, ...rest } = decl;
  return JSON.stringify(plain(rest, ty => erasedType(ty, hole)));
};

// AI-IR: the declaration's structure, every type left out.
export const skeletonOf = decl => {
  const { row: _row, ...rest } = decl;
  return JSON.stringify(plain(rest, () => 'τ'));
};

// Holes in a compiled type, by number, for T8's count.
export const holeCount = decl => (erasedDecl(decl).match(/"hole"/g) ?? [])
  .length;
