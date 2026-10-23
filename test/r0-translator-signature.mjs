// RT1's translator: a signature's `D` (T-R0b §3.1, Sig4-Sig8), as
// atoms over the declaration's own VarIds. The declaration emits them in
// `d`; a reference to it (E3, E5) renames them by its instantiation.
import { Maybe, R, Syntax, declared, factsOf }
  from './r0-translator-types.mjs';

// The span of a written parameter or result type, or the declaration's.
export const typeSpan = (decl, at) => (at < decl.syntax.length
  ? Syntax.typeRefSpan(decl.syntax[at]) : decl.span);

// Each typed position of a signature: its path and span (§6), and its
// type. The effect row's label arguments sit under the result's path,
// at step `row` (an amendment: §6 names no root for `f.row`).
const positionsOf = decl => [
  ...decl.parameters.map((parameter, index) => ({ type: parameter.ty,
    path: { root: 'parameters', steps: [index] }, span: parameter.span })),
  { type: decl.result, path: { root: 'result', steps: [] },
    span: typeSpan(decl, decl.parameters.length) },
  ...decl.row.value0.flatMap(label => label.value1).map(type => ({ type,
    path: { root: 'result', steps: ['row'] },
    span: decl.rowSpan instanceof Maybe.Just ? decl.rowSpan.value0
      : decl.span }))
];

const lacks = (variable, label) => ({ lacks: [{ rigid: variable }, label] });
const disjoint = pair =>
  ({ disjoint: [{ rigid: pair.value0 }, { rigid: pair.value1 }] });

// Sig4 per label (the label's span), Sig5 per constraint.
const written = decl => decl.constraints.flatMap((constraint, index) => {
  const path = { root: 'constraints', steps: [index] };
  const found = constraint.value0;
  if (constraint instanceof R.Lacks) return found.labels.map(label =>
    ({ rule: 4, path, span: label.span, value: lacks(found.variable,
      label.name) }));
  if (constraint instanceof R.Disjoint) return [{ rule: 5, path,
    span: found.span, value: disjoint(found.variables) }];
  throw new Error(`r0-translator: not a Requirement: ${constraint}`);
});

// Sig6 (a record's own labels) and Sig8 (a declared type's record
// argument), per label, in Implied.purs's order.
const implied = (program, decl) => positionsOf(decl).flatMap(position =>
  factsOf(program, position.type).flatMap(fact => {
    const sig6 = 'beside' in fact;
    const labels = sig6 ? fact.labels
      : declared(program, fact.owner, fact.position);
    const tail = sig6 ? fact.beside : fact.passed;
    return labels.map(label => ({ rule: sig6 ? 6 : 8, path: position.path,
      span: position.span, value: lacks(tail, label) }));
  }));

// Sig7, per written pair.
const joined = decl => decl.joined.map((pair, index) => ({ rule: 7,
  path: { root: 'joined', steps: [index] }, span: pair.span,
  value: disjoint(pair.variables) }));

// D_g in order Sig4/Sig5, Sig6/Sig8, Sig7.
export const signatureD = (program, decl) =>
  [...written(decl), ...implied(program, decl), ...joined(decl)];

export const sigRows = { 4: 'A1', 5: 'A2', 6: 'A3', 7: 'A4', 8: 'A5' };
export const sigKinds = { 4: 'contract', 5: 'contract', 6: 'types',
  7: 'types', 8: 'types' };

// θ(atom): a rigid variable renamed by the instantiation's naming.
export const renamed = (value, naming) => {
  const name = variable => naming(variable.rigid);
  if (value.lacks) return { lacks: [name(value.lacks[0]), value.lacks[1]] };
  return { disjoint: value.disjoint.map(name) };
};
