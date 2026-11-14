// RT1's translator: the problem's holder set (ruling K-a, author
// 2026-10-23), computed from the resolved program's constructor tables
// alone. A declared type holds a function when one of its constructors
// has a field whose type mentions an arrow or a handler type, at any
// depth through record fields and type arguments, or mentions a
// declared type that holds one (FN001 design §3; docs/findings.md,
// "G0, `entailedGround` and the two detectors"). Computed as a least
// fixed point by rounds over every constructor, written apart from the
// generator's (Features.Check.Functional's reverse-graph spread).
import { Syntax, T } from './r0-translator-types.mjs';

const mentions = (type, holding) => {
  if (type instanceof T.TFun || type instanceof T.THandler) return true;
  if (type instanceof T.TRecord)
    return type.value0.fields.some(field => mentions(field.value1, holding));
  if (type instanceof T.TData)
    return holding.has(type.value0)
      || type.value1.some(argument => mentions(argument, holding));
  return false;
};

// Scope A (dossier §18.198): the admitted set, written apart from
// Features.Check.Admitted's reverse-graph spread. A declared type is
// admitted when it has no effect-row or record-row parameter, is not a
// holder, and no declared type reachable from it through constructor
// fields (a depth-first walk per type) has a record-row parameter or a
// field with effect-row arguments.
const isRecordRowed = (program, id) => program.types[id].sorts
  .some(sort => sort instanceof Syntax.RecordSort);
const typesIn = type => {
  if (type instanceof T.TData) return [type.value0, ...type.value1
    .flatMap(typesIn)];
  if (type instanceof T.TRecord) return type.value0.fields
    .flatMap(field => typesIn(field.value1));
  if (type instanceof T.TFun) return [...typesIn(type.value0),
    ...typesIn(type.value2)];
  if (type instanceof T.THandler) return type.value0.value1.flatMap(typesIn);
  return [];
};
const rowArguments = type => (type instanceof T.TData
  ? type.value2.length > 0 || type.value1.some(rowArguments)
  : type instanceof T.TRecord
    ? type.value0.fields.some(field => rowArguments(field.value1))
    : type instanceof T.TFun
      ? rowArguments(type.value0) || rowArguments(type.value2) : false);
const admittedOf = (program, holding) => {
  const fieldsOf = id => program.ctors.filter(ctor => ctor.owner === id)
    .flatMap(ctor => ctor.fields);
  const expressible = id => {
    const seen = new Set([id]);
    const stack = [id];
    while (stack.length > 0) {
      const at = stack.pop();
      if (isRecordRowed(program, at) || fieldsOf(at).some(rowArguments))
        return false;
      for (const next of fieldsOf(at).flatMap(typesIn))
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
    return true;
  };
  return program.types.map((_, id) => id).filter(id =>
    program.types[id].rowParameters.length === 0
    && !isRecordRowed(program, id) && !holding.has(id) && expressible(id));
};
const admittedCache = new WeakMap();
export const admittedSet = program => {
  if (!admittedCache.has(program))
    admittedCache.set(program, new Set(holdersOf(program).admitted));
  return admittedCache.get(program);
};

export const holdersOf = program => {
  const holding = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const ctor of program.ctors)
      if (!holding.has(ctor.owner)
        && ctor.fields.some(field => mentions(field, holding))) {
        holding.add(ctor.owner);
        grew = true;
      }
  }
  return { declared: program.types.map((_, index) => index),
    holding: [...holding].sort((a, b) => a - b),
    admitted: admittedOf(program, holding),
    overRecords: program.types.map((_, id) => id)
      .filter(id => isRecordRowed(program, id)) };
};
