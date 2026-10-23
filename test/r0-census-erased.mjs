// Task 3.5's erased-row detector, test-only (ruling R11): criterion
// C-erased (docs/plans/r0-erased-rows.md §4) and, for the census's
// informational count only, part (ii)'s predicate P-ii (§7; superseded
// as a validation trigger by §7.1). It reads resolved syntax and the
// tables (callee signatures, constructors, effects) through the
// explicit walk of r0-census-walk.mjs, and is checked against the 34
// fixtures' hand-derived answers (r0-census-detectors.test.mjs) and,
// corpus-wide, against Task 0.7's reference reading
// (r0-census.serial.test.mjs). It marks nothing in src: no `ErasedRow`
// constructor exists (the author's ruling, §7.1).
import { R, Row, Just, expressionsOf, patternsOf, recordOrVariable,
  shapeOf } from './r0-census-walk.mjs';

// §4's sources, in the note's order.
export const sourceOrder = ['own', 'annotation', 'handler', 'callee',
  'constructor', 'perform', 'clause', 'fail'];

const capable = label => label.value1.some(recordOrVariable);
// Some label at any depth of these types, or one of these labels, is
// record-capable.
const typesFire = types => types.some(ty =>
  shapeOf(ty).labels.some(capable));
const labelsFire = labels => labels.some(label => capable(label)
  || typesFire(label.value1));
const rowFires = row => labelsFire(row.value0);

const signatureFires = decl => rowFires(decl.row)
  || typesFire([...decl.parameters.map(p => p.ty), decl.result]);
const operationTypes = operation =>
  [...operation.parameters.map(p => p.ty), operation.result];

const tablesOf = program => ({
  functions: new Map(program.functions.map(decl => [decl.id, decl])),
  ctor: id => program.ctors[id],
  operation: (effect, index) => program.effects[effect].operations[index],
  parameterized: effect => program.effects[effect].parameters.length > 0
});

const of = (nodes, ctors) => nodes.filter(node =>
  ctors.some(ctor => node instanceof ctor));
// A Handler literal's clauses' declared operation types (`clause`).
const handledTypes = (tables, handler) => {
  const effect = handler.value1.value0;
  if (!(effect instanceof Row.UserEffect)) return [];
  return handler.value2.flatMap(clause => operationTypes(
    tables.operation(effect.value0, clause.operation)));
};
const clauseTypes = clause =>
  [clause.result, ...clause.parameters.map(p => p.ty)];
// A `fail`'s label is record-capable unless its family is written and
// holds no record and no variable; the family's own labels count too.
const failFires = fail => !(fail.value1 instanceof Just)
  || recordOrVariable(fail.value1.value0) || typesFire([fail.value1.value0]);

// The sources of §4's table that fire for declaration `f`.
export const erasedSources = (program, f) => {
  const tables = tablesOf(program);
  const nodes = expressionsOf(f.body);
  const handlers = of(nodes, [R.Handler]);
  const performs = of(nodes, [R.OperationRef, R.Perform]);
  const ctorIds = [...of(nodes, [R.CtorRef, R.Construct]),
    ...of(patternsOf(f.body), [R.Ctor])].map(node => node.value1);
  const annotations = of(nodes, [R.Lambda]).flatMap(lambda =>
    lambda.value1.filter(p => p.ty instanceof Just).map(p => p.ty.value0));
  const fired = {
    own: signatureFires(f),
    annotation: typesFire(annotations),
    handler: labelsFire(handlers.map(h => h.value1))
      || typesFire(handlers.flatMap(h => h.value2.flatMap(clauseTypes)))
      || labelsFire(of(nodes, [R.Handle]).flatMap(h =>
        h.value2.map(clause => clause.label))),
    callee: of(nodes, [R.FunctionRef, R.Call]).some(node =>
      signatureFires(tables.functions.get(node.value1))),
    constructor: typesFire(ctorIds.flatMap(id => tables.ctor(id).fields)),
    perform: performs.some(node => tables.parameterized(node.value1)
      || typesFire(operationTypes(tables.operation(node.value1,
        node.value2)))),
    clause: typesFire(handlers.flatMap(h => handledTypes(tables, h))),
    fail: of(nodes, [R.Fail]).some(failFires)
  };
  return sourceOrder.filter(source => fired[source]);
};

// P-ii's "row whose instance at a use is not written": a row with a
// tail variable, or a label with a variable argument (rows erased).
const openRow = row => row.value1 instanceof Just
  || row.value0.some(label => label.value1.some(recordOrVariable));
const holdsOpenRow = types => types.some(ty => shapeOf(ty).rows
  .some(openRow));

// Forms each of which makes an inferred row (§7's first disjuncts).
const making = [R.Lambda, R.Handler, R.CrashRef, R.Crash, R.ShowRef,
  R.FunctionRef, R.CtorRef, R.OperationRef, R.Apply, R.Pipe];

// P-ii(`f`): `f`'s checked IR may hold an inferred effect row.
export const inferredRows = (program, f) => {
  const tables = tablesOf(program);
  const nodes = expressionsOf(f.body);
  const use = (types, given, declared) =>
    given < declared || holdsOpenRow(types);
  const call = node => {
    const callee = tables.functions.get(node.value1);
    return use([...callee.parameters.map(p => p.ty), callee.result],
      node.value2.length, callee.parameters.length);
  };
  const construct = node => {
    const fields = tables.ctor(node.value1).fields;
    return use(fields, node.value2.length, fields.length);
  };
  const perform = node => {
    const operation = tables.operation(node.value1, node.value2);
    return use(operationTypes(operation), node.value3.length,
      operation.parameters.length);
  };
  const pattern = node => holdsOpenRow(tables.ctor(node.value1).fields);
  return of(nodes, making).length > 0
    || of(nodes, [R.Call]).some(call)
    || of(nodes, [R.Construct]).some(construct)
    || of(nodes, [R.Perform]).some(perform)
    || of(patternsOf(f.body), [R.Ctor]).some(pattern);
};
