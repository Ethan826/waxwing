// RT1's translator: the problem's holder set (ruling K-a, author
// 2026-10-23), computed from the resolved program's constructor tables
// alone. A declared type holds a function when one of its constructors
// has a field whose type mentions an arrow or a handler type, at any
// depth through record fields and type arguments, or mentions a
// declared type that holds one (FN001 design §3; docs/findings.md,
// "G0, `entailedGround` and the two detectors"). Computed as a least
// fixed point by rounds over every constructor, written apart from the
// generator's (Features.Check.Functional's reverse-graph spread).
import { T } from './r0-translator-types.mjs';

const mentions = (type, holding) => {
  if (type instanceof T.TFun || type instanceof T.THandler) return true;
  if (type instanceof T.TRecord)
    return type.value0.fields.some(field => mentions(field.value1, holding));
  if (type instanceof T.TData)
    return holding.has(type.value0)
      || type.value1.some(argument => mentions(argument, holding));
  return false;
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
    holding: [...holding].sort((a, b) => a - b) };
};
