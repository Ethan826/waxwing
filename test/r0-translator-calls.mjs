// RT1's translator: references and calls of functions and constructors
// (T-R0b §3.2: E3-E6) and their instantiations (§2.3 `inst i`).
import { arrow, emit, eq, fresh, tvar } from './r0-translator-context.mjs';
import { ownerType, sortName, translate } from './r0-translator-types.mjs';
import { renamed, signatureD } from './r0-translator-signature.mjs';

// `⟨p, inst i⟩` per non-effect-row variable, positioned at `Slot p i`
// (§5.2); returns the naming θ and the variables in VarId order.
export const instantiate = (cx, site, sorts) => {
  const made = new Map();
  sorts.forEach((sort, index) => {
    const name = sortName(sort);
    if (name !== null) made.set(index, fresh(cx, site, { inst: index }, name,
      { slot: [site.path, index] }));
  });
  const naming = index => {
    if (!made.has(index))
      throw new Error(`r0-translator: no instance of variable ${index}`);
    return made.get(index);
  };
  return { naming, made };
};

// §2.2's markers' rows, one per kind a translation builds (O5, recorder-
// spec F8's `DataApplication`, O3), under every rule; no default arm.
const markerRows = { DataOverRecords: 'O5', DataApplication: 'F8',
  HandlerType: 'O3' };

export const flush = (cx, site, marks, kind) => marks.forEach(mark => {
  if (!(mark in markerRows))
    throw new Error(`r0-translator: not a type marker: ${mark}`);
  emit(cx, site, 'outside', markerRows[mark], mark, { kind });
});

// E3/E5's shared entries: θ(D_g) (written F2, implied F3), θ(Q_g) (empty,
// Sig9), the `adm` site, the `split` site if `g` has a record-row
// variable; the markers of θ(⟦g⟧) are returned, emitted last (reading 4).
const reference = (cx, site, id) => {
  const callee = cx.program.functions[id];
  const { naming, made } = instantiate(cx, site, callee.sorts);
  const marks = [];
  const params = callee.parameters.map(parameter =>
    translate(cx.program, parameter.ty, naming, marks));
  const result = translate(cx.program, callee.result, naming, marks);
  signatureD(cx.program, callee).forEach(item => emit(cx, site, 'b',
    item.rule <= 5 ? 'F2' : 'F3', renamed(item.value, naming),
    { kind: 'inst' }));
  const slots = [...made.values()];
  emit(cx, site, 'adm', 'F7', { callee: { function: id }, slots },
    { kind: 'inst' });
  const rows = [...made.entries()].filter(([index]) =>
    sortName(callee.sorts[index]) === 'row').map(([, found]) => found);
  if (rows.length > 0) emit(cx, site, 'split', 'H2',
    { callee: { function: id }, slots: rows }, { kind: 'inst' });
  return { params, result, marks };
};

// E4/E6's shared entries: θ(c.joined); θ(⟦c⟧)'s markers returned.
const construction = (cx, site, id) => {
  const ctor = cx.program.ctors[id];
  const { naming } = instantiate(cx, site,
    cx.program.types[ctor.owner].sorts);
  const marks = [];
  const params = ctor.fields.map(field =>
    translate(cx.program, field, naming, marks));
  const result = ownerType(cx.program, ctor.owner, naming, marks);
  ctor.joined.forEach(pair => emit(cx, site, 'b', 'F8', { disjoint:
    [naming(pair.variables.value0), naming(pair.variables.value1)] },
    { kind: 'inst' }));
  return { params, result, marks };
};

// E5/E6's argument equations (F1), then over-application: `⟨p, res⟩` and
// `eq θ(⟦R⟧) (τ_{e_{n+1}} → … → ⟨p, res⟩)` (B1).
const applied = (cx, site, typeOf, args) => {
  const n = typeOf.params.length;
  args.forEach((argument, index) => {
    if (index < n)
      emit(cx, site, 'b', 'F1', eq(argument, typeOf.params[index]));
  });
  if (args.length <= n) return arrow(typeOf.params.slice(args.length),
    typeOf.result);
  const res = tvar(fresh(cx, site, 'res', 'type', { nodeType: site.path }));
  emit(cx, site, 'b', 'B1', eq(typeOf.result, arrow(args.slice(n), res)));
  return res;
};

// Markers after every listed entry, the argument equations included.
const referenced = (cx, site, found) => {
  flush(cx, site, found.marks, 'inst');
  return arrow(found.params, found.result);
};

const called = (cx, site, found, args) => {
  const type = applied(cx, site, found, args);
  flush(cx, site, found.marks, 'inst');
  return type;
};

export const functionRef = (cx, site, id) =>
  referenced(cx, site, reference(cx, site, id));

export const call = (cx, site, id, args) =>
  called(cx, site, reference(cx, site, id), args);

export const ctorRef = (cx, site, id) =>
  referenced(cx, site, construction(cx, site, id));

export const construct = (cx, site, id, args) =>
  called(cx, site, construction(cx, site, id), args);
