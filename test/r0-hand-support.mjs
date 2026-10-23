// RT4's normalization (T-R0b §9 item 4; R0 tranche Task 3.4): eliminate
// defining equations from a set of atoms in test/r0-canonical.mjs's form
// (a hand translation's flexible variables are `{ flex: name }`, read by
// test/r0-hand-notation.mjs). Test-only.
//
// Normalization, applied alike to both sides (the "defining equations"
// T-R0b §9 item 4 eliminates; the forms are §5.3's defining atoms and
// a flexible variable equated with a type):
//   (c) an equation between two arrows of one arity is its parts';
//   (d) two records of the same labels and tails: their fields'
//       equations (added after the first run: an amendment, see
//       docs/findings.md, Task 3.4);
//   (a) `v = t`, v flexible and not in t: v := t;
//   (b) `L = { l̄: ū, ...ρ }`, ρ flexible, alone, not in L or ū, and L a
//       record holding every l: ρ := L without l̄, and the atom becomes
//       `u_i = L.l_i`.
// An eliminated equation whose other side holds a record of two or more
// parts leaves `t = t` (its definedness). At the end every `t = t` is
// the definedness of each such record in t, dropped where the record
// occurs in another equation (which presupposes it) and where none has
// two parts (recorder-spec §5.3, as RT1 normalizes). Atoms are compared
// as sets: conjunction is idempotent, and written and implied clauses
// repeat (argued).
import { stableStringify } from './r0-canonical.mjs';

const key = stableStringify;
const flexible = variable => !('rigid' in variable);
const sameVar = (a, b) => key(a) === key(b);

// The canonical form: fields by label, tails by key, arrow spines flat.
const tidy = type => {
  if (type.record) return { record: {
    fields: type.record.fields.map(([label, field]) => [label, tidy(field)])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    tails: [...type.record.tails].sort((a, b) =>
      (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)) } };
  if (type.fun) {
    const result = tidy(type.fun.result);
    const params = type.fun.params.map(tidy);
    return result.fun ? { fun: { params: [...params, ...result.fun.params],
      result: result.fun.result } } : { fun: { params, result } };
  }
  return type;
};

const varsIn = (value, found = []) => {
  if (Array.isArray(value)) value.forEach(item => varsIn(item, found));
  else if (value && typeof value === 'object') {
    if ('rigid' in value || 'fresh' in value || 'flex' in value)
      found.push(key(value));
    else Object.values(value).forEach(item => varsIn(item, found));
  }
  return found;
};
const occurs = (variable, value) => varsIn(value).includes(key(variable));
const parts = record => record.fields.length + record.tails.length;
const records = (type, found = []) => {
  if (Array.isArray(type)) type.forEach(item => records(item, found));
  else if (type && typeof type === 'object') {
    if (type.record) found.push(type);
    Object.values(type).forEach(item => records(item, found));
  }
  return found;
};
const composite = type => records(type).some(item => parts(item.record) > 1);

// `variable := value` in a type: a type variable replaced, a tail spliced.
const substType = (type, variable, value) => {
  if (type.tvar) return sameVar(type.tvar, variable) ? value : type;
  if (type.fun) return tidy({ fun: {
    params: type.fun.params.map(item => substType(item, variable, value)),
    result: substType(type.fun.result, variable, value) } });
  if (!type.record) return type;
  const kept = type.record.tails.filter(tail => !sameVar(tail, variable));
  const spliced = kept.length < type.record.tails.length;
  const fields = type.record.fields.map(([label, field]) =>
    [label, substType(field, variable, value)]);
  return tidy({ record: {
    fields: spliced ? [...fields, ...value.record.fields] : fields,
    tails: spliced ? [...kept, ...value.record.tails] : kept } });
};

// The atoms `variable := value` makes of one atom.
const substAtom = (atom, variable, value) => {
  if (atom.eq) return [{ eq: atom.eq.map(side =>
    substType(side, variable, value)) }];
  const row = item => (sameVar(item, variable) ? value.record
    : { fields: [], tails: [item] });
  if (atom.lacks) {
    const { fields, tails } = row(atom.lacks[0]);
    return [...tails.map(tail => ({ lacks: [tail, atom.lacks[1]] })),
      ...fields.filter(([label]) => label === atom.lacks[1]).map(() => 'ff')];
  }
  if (!atom.disjoint) return [atom];
  const [left, right] = atom.disjoint.map(row);
  return [...left.tails.flatMap(a => right.tails.map(b =>
    ({ disjoint: [a, b] }))),
  ...left.fields.flatMap(([label]) =>
    right.tails.map(tail => ({ lacks: [tail, label] }))),
  ...right.fields.flatMap(([label]) =>
    left.tails.map(tail => ({ lacks: [tail, label] }))),
  ...left.fields.filter(([label]) => right.fields.some(([other]) =>
    other === label)).map(() => 'ff')];
};

const tailUses = (atoms, variable) => atoms.some(atom =>
  records(atom).some(item => item.record.tails.some(tail =>
    sameVar(tail, variable))) || (atom.lacks && sameVar(atom.lacks[0],
    variable)) || (atom.disjoint && atom.disjoint.some(item =>
    sameVar(item, variable))));

const definedness = type => (composite(type) ? [{ eq: [type, type] }] : []);
const equations = (lefts, rights) =>
  lefts.map((item, at) => ({ eq: [item, rights[at]] }));
const fieldTypes = record => record.fields.map(([, field]) => field);

// (c): two arrows of one arity.
const arrowParts = (left, right, rest) => (left.fun && right.fun
  && left.fun.params.length === right.fun.params.length
  ? [...rest, ...equations([...left.fun.params, left.fun.result],
    [...right.fun.params, right.fun.result])]
  : null);

// Two records of the same labels and tails: their fields' equations (the
// composition is cancellative), with the record's definedness.
const cancelled = (left, right, rest) => {
  const shape = type => key([type.record.fields.map(([label]) => label),
    type.record.tails]);
  return left.record && right.record && key(left) !== key(right)
    && shape(left) === shape(right)
    ? [...rest, ...equations(fieldTypes(left.record),
      fieldTypes(right.record)), ...definedness(left)]
    : null;
};

const bind = (rest, variable, value, made) => [...rest, ...made]
  .flatMap(item => substAtom(item, variable, value));

// (a): a flexible type variable equated with a type it is not in.
const boundVar = (left, right, rest) => (right.tvar && flexible(right.tvar)
  && !occurs(right.tvar, left) && (left.record || !tailUses(rest,
  right.tvar)) ? bind(rest, right.tvar, left, []).concat(definedness(left))
  : null);

// (b): a record with one flexible tail, against a record holding its
// labels.
const boundRow = (left, right, rest) => {
  const target = right.record;
  if (!(target && left.record && target.tails.length === 1)) return null;
  const [row] = target.tails;
  const labels = new Map(left.record.fields);
  const own = ([label]) => target.fields.some(([mine]) => mine === label);
  if (!(flexible(row) && !occurs(row, left) && !occurs(row, target.fields)
    && target.fields.every(([label]) => labels.has(label)))) return null;
  return bind(rest, row, { record: { fields: left.record.fields
    .filter(field => !own(field)), tails: left.record.tails } },
  target.fields.map(([label, field]) =>
    ({ eq: [field, labels.get(label)] })))
    .concat(definedness(left));
};

const rules = [arrowParts, cancelled, boundVar, boundRow];

// One elimination step on `atoms`, or null.
const stepOf = atoms => {
  for (const [at, atom] of atoms.entries()) {
    if (!atom.eq) continue;
    const rest = atoms.filter((_, other) => other !== at);
    for (const rule of rules) for (const [left, right] of
      [atom.eq, [...atom.eq].reverse()]) {
      const made = rule(left, right, rest);
      if (made !== null) return made;
    }
  }
  return null;
};

// The normal form: a deduplicated array of atoms.
export const normalized = input => {
  let atoms = input.map(atom => (atom.eq ? { eq: atom.eq.map(tidy) } : atom));
  for (let next = stepOf(atoms); next !== null; next = stepOf(atoms))
    atoms = next;
  const same = atom => atom.eq && key(atom.eq[0]) === key(atom.eq[1]);
  const others = atoms.filter(atom => !same(atom));
  const presupposed = others.flatMap(atom => records(atom)).map(key);
  const defined = atoms.filter(same).flatMap(atom => records(atom.eq[0]))
    .filter(item => parts(item.record) > 1
      && !presupposed.includes(key(item)))
    .map(item => ({ eq: [item, item] }));
  const unique = new Map([...others, ...defined].map(atom => [key(atom),
    atom]));
  return [...unique.values()];
};
