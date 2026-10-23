// The ground evaluator of Task 4.2's EG-oracle
// (docs/plans/r0-entailed-ground.md §6): a recorded type's value under
// an assignment, as a canonical string, or null where a composition is
// undefined (a label twice: T-R0b §5.4, Lean's `evalT`). Written from
// the note, not from Features.Check.Entailed.
const typeValues = ['Int', 'Bool', '(Int->Int)', 'Box(Int)', '{}',
  '{a:Int}'];
const subsets = [[], ['a'], ['b'], ['c'], ['a', 'b'], ['a', 'c'],
  ['b', 'c'], ['a', 'b', 'c']];
const rowValues = [...subsets.map(labels => Object.fromEntries(
  labels.map(label => [label, 'Int']))), { a: 'Bool' }, { b: 'Bool' }];

const named = value => value.constructor.name;

export const evaluate = (ty, assignment) => {
  switch (named(ty)) {
  case 'Base': return named(ty.value0).replace('Base', '');
  case 'TVar': return assignment.get(ty.value0);
  case 'Arrow': {
    const one = evaluate(ty.value0, assignment);
    const other = evaluate(ty.value1, assignment);
    return one === null || other === null ? null : `(${one}->${other})`;
  }
  case 'App': {
    const args = ty.value1.map(arg => evaluate(arg, assignment));
    return args.includes(null) ? null : `Box(${args.join(',')})`;
  }
  case 'Record': return record(ty, assignment);
  }
  throw new Error(`unknown type ${named(ty)}`);
};

const record = (ty, assignment) => {
  const found = {};
  const add = (label, value) => {
    if (label in found || value === null) return false;
    found[label] = value;
    return true;
  };
  for (const field of ty.value0)
    if (!add(field.value0, evaluate(field.value1, assignment))) return null;
  for (const tail of ty.value1)
    for (const [label, value] of Object.entries(assignment.get(tail)))
      if (!add(label, value)) return null;
  return `{${Object.keys(found).sort().map(label =>
    `${label}:${found[label]}`).join(',')}}`;
};

// The variables a type mentions, with their sort.
export const variablesOf = (ty, into = new Map()) => {
  switch (named(ty)) {
  case 'TVar': into.set(ty.value0, 'type'); break;
  case 'Arrow': variablesOf(ty.value0, into); variablesOf(ty.value1, into);
    break;
  case 'App': ty.value1.forEach(arg => variablesOf(arg, into)); break;
  case 'Record':
    ty.value0.forEach(field => variablesOf(field.value1, into));
    ty.value1.forEach(tail => into.set(tail, 'row'));
  }
  return into;
};

// Every assignment of `variables` in the domain that solves every
// equation (both sides defined and equal).
export const solutions = (equations, variables) => {
  const keys = [...variables.keys()];
  const found = [];
  const assign = (index, assignment) => {
    if (index === keys.length) {
      if (equations.every(([one, other]) => {
        const left = evaluate(one, assignment);
        return left !== null && left === evaluate(other, assignment);
      })) found.push(new Map(assignment));
      return;
    }
    const values = variables.get(keys[index]) === 'type'
      ? typeValues : rowValues;
    for (const value of values) {
      assignment.set(keys[index], value);
      assign(index + 1, assignment);
    }
  };
  assign(0, new Map());
  return found;
};
