// A reference reading of docs/plans/r0-erased-rows.md §4 (criterion
// C-erased) and §7 (the part (ii) predicate) over resolved syntax, for
// test/r0-erased.test.mjs. Test-only: it reads the compiled PureScript
// values by constructor name, so it is a check of the fixtures'
// hand-derived answers, not Task 3.5's detector.

// Every value reachable from `value` whose constructor is `name`; a
// `stop` constructor is not entered.
export const nodesNamed = (value, name, stop = null, found = []) => {
  if (value === null || typeof value !== 'object') return found;
  const here = value.constructor?.name;
  if (here === stop) return found;
  if (here === name) found.push(value);
  for (const key of Object.keys(value))
    nodesNamed(value[key], name, stop, found);
  return found;
};

// An argument translated with rows erased holds a record or a variable.
const recordOrVariable = ty => nodesNamed(ty, 'TRecord', 'Row').length > 0
  || nodesNamed(ty, 'TVar', 'Row').length > 0;
const capable = label => label.value1.some(recordOrVariable);
// Some label at any depth of these types is record-capable.
const fires = types => types.some(ty => nodesNamed(ty, 'Label')
  .some(capable));

const signature = f => [f.row, ...f.parameters.map(p => p.ty), f.result];
const typesOf = f => [...f.parameters.map(p => p.ty), f.result];
const clauseTypes = c => [c.result, ...c.parameters.map(p => p.ty)];
const operationOf = (program, node) =>
  program.effects[node.value1].operations[node.value2];
const functionOf = (program, id) => program.functions.find(f => f.id === id);
const handledOperations = (program, node) => {
  const effect = node.value1.value0;
  if (effect.constructor.name !== 'UserEffect') return [];
  const info = program.effects[effect.value0];
  return node.value2.map(c => info.operations[c.operation]);
};

// The firing sources of declaration `f`, in the note's order.
export const firingSources = (program, f) => {
  const all = name => nodesNamed(f.body, name);
  const calls = [...all('FunctionRef'), ...all('Call')];
  const ctors = [...all('CtorRef'), ...all('Construct'), ...all('Ctor')];
  const performs = [...all('OperationRef'), ...all('Perform')];
  const performed = node =>
    program.effects[node.value1].parameters.length > 0
      || fires(typesOf(operationOf(program, node)));
  const failed = node => node.value1.constructor.name === 'Nothing'
    || recordOrVariable(node.value1.value0) || fires([node.value1.value0]);
  const fired = {
    own: fires(signature(f)),
    annotation: fires(all('Lambda').flatMap(n => n.value1.map(p => p.ty))),
    handler: fires(all('Handler').flatMap(n =>
      [n.value1, ...n.value2.flatMap(clauseTypes)]))
      || fires(all('Handle').flatMap(n => n.value2.map(c => c.label))),
    callee: fires(calls.flatMap(n =>
      signature(functionOf(program, n.value1)))),
    constructor: fires(ctors.flatMap(n => program.ctors[n.value1].fields)),
    perform: performs.some(performed),
    clause: fires(all('Handler').flatMap(n =>
      handledOperations(program, n).flatMap(typesOf))),
    fail: all('Fail').some(failed),
  };
  return Object.keys(fired).filter(kind => fired[kind]);
};

// A row whose instance at a use is not written: a tail variable, or a
// label with a variable argument.
const openRows = types => types.some(ty => nodesNamed(ty, 'Row')
  .some(row => row.value1.constructor.name === 'Just'
    || row.value0.some(label => label.value1.some(recordOrVariable))));

// Part (ii)'s predicate: `f`'s checked IR may hold an inferred row.
export const inferredRow = (program, f) => {
  const all = name => nodesNamed(f.body, name);
  const made = ['Lambda', 'Handler', 'CrashRef', 'Crash', 'FunctionRef',
    'CtorRef', 'OperationRef'].some(name => all(name).length > 0);
  const applied = [
    ...all('Call').map(n => typesOf(functionOf(program, n.value1))),
    ...all('Construct').map(n => program.ctors[n.value1].fields),
    ...all('Perform').map(n => typesOf(operationOf(program, n))),
  ];
  return made || applied.some(openRows);
};
