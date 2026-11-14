// RT1's translator: written types (T-R0b §2.2) and a declaration's `D`
// (Sig4-Sig8, §3.1). Reads resolved syntax from the compiled output.
import { arrow, base, record, tvar } from './r0-translator-context.mjs';
import { admittedSet } from './r0-translator-holders.mjs';

const load = name => import(`../output/${name}/index.js`);
export const T = await load('Domain.Type');
export const Syntax = await load('Domain.Syntax');
export const Row = await load('Domain.Row');
export const R = await load('Domain.Resolved');
export const Maybe = await load('Data.Maybe');

// A variable's sort in the problem: an effect row (RowSort) is erased.
export const sortName = sort => {
  if (sort instanceof Syntax.RowSort) return null;
  if (sort instanceof Syntax.RecordSort) return 'row';
  if (sort instanceof Syntax.TypeSort) return 'type';
  throw new Error(`r0-translator: not a Sort: ${String(sort)}`);
};

// A declared type is over records when it has a record-row parameter.
export const dataKind = (program, owner) =>
  program.types[owner].sorts.some(sort => sort instanceof Syntax.RecordSort)
    ? 'DataOverRecords' : 'DataApplication';

const fail = what => { throw new Error(`r0-translator: ${what}`); };

// ⟦T⟧ν (§2.2). `naming` maps a VarId to a problem variable; each `app`
// built pushes its marker on `marks` (pre-order), which the rule emits
// after its listed entries. An arrow's effect row is erased; a spine is
// walked by a loop.
export const translate = (program, type, naming, marks) => {
  const go = found => translate(program, found, naming, marks);
  if (type instanceof T.TInt) return base('Int');
  if (type instanceof T.TBool) return base('Bool');
  if (type instanceof T.TText) return base('Text');
  if (type instanceof T.TUnit) return base('Unit');
  if (type instanceof T.TVar) return tvar(naming(type.value0));
  if (type instanceof T.TRecord) return record(
    type.value0.fields.map(pair => [pair.value0, go(pair.value1)]),
    type.value0.tails.map(naming));
  if (type instanceof T.TFun) {
    const params = [];
    let rest = type;
    for (; rest instanceof T.TFun; rest = rest.value2)
      params.push(go(rest.value0));
    return arrow(params, go(rest));
  }
  if (type instanceof T.TData) return dataType(program, type, go, marks);
  if (type instanceof T.THandler) return handlerType(type, go, marks);
  return fail(`not a Ty: ${String(type)}`);
};

// Scope A (dossier §18.198): an admitted head whose arguments are plain
// (builtins, variables, admitted declared types over plain arguments)
// carries no marker.
const plain = (admitted, type) => (type instanceof T.TData
  ? admitted.has(type.value0) && type.value2.length === 0
    && type.value1.every(arg => plain(admitted, arg))
  : !(type instanceof T.TFun || type instanceof T.THandler
    || type instanceof T.TRecord));

const dataType = (program, type, go, marks) => {
  const [owner, args, rows] = [type.value0, type.value1, type.value2];
  if (args.length === 0 && rows.length === 0) return base({ data: owner });
  const admitted = admittedSet(program);
  if (!(admitted.has(owner) && rows.length === 0
    && args.every(arg => plain(admitted, arg))))
    marks.push(dataKind(program, owner));
  return { app: { head: { data: owner }, args: args.map(go) } };
};

// A builtin effect's handler type (`Handler(Console)`) has no `Head`
// in Task 3.1's types (`HandlerHead EffectId`): the head is written by
// the effect's name, a reading for RT1's comparison to settle (finding).
const handlerHead = effect => (effect instanceof Row.UserEffect
  ? effect.value0 : effect instanceof Row.ConsoleEffect ? 'Console'
    : effect instanceof Row.FailEffect ? 'Fail'
      : fail(`not an EffectRef: ${String(effect)}`));

const handlerType = (type, go, marks) => {
  const label = type.value0;
  marks.push('HandlerType');
  return { app: { head: { handler: handlerHead(label.value0) },
    args: label.value1.map(go) } };
};

// `owner(args)` of a constructor or pattern at an instantiation: each
// non-effect-row parameter as `TData` would hold it (a record-row one as
// `{ ...ρ }`), translated as §2.2 translates `TData`.
export const ownerType = (program, owner, naming, marks) => {
  const info = program.types[owner];
  const args = [];
  info.sorts.forEach((sort, index) => {
    if (sortName(sort) === 'type') args.push(tvar(naming(index)));
    if (sortName(sort) === 'row') args.push(record([], [naming(index)]));
  });
  if (info.sorts.length === 0) return base({ data: owner });
  marks.push(dataKind(program, owner));
  return { app: { head: { data: owner }, args } };
};

// Implied.purs's facts, apart: `beside` (Sig6, a record's own labels)
// and `passed` (Sig8, a declared type's record argument), in its order:
// the type's own, its children's, then its rows' arguments.
export const factsOf = (program, type, out = []) => {
  if (type instanceof T.TRecord) {
    const labels = [...new Set(type.value0.fields.map(pair => pair.value0))]
      .sort();
    type.value0.tails.forEach(tail => out.push({ beside: tail, labels }));
  }
  if (type instanceof T.TData) passed(program, type, out);
  childrenOf(type).forEach(child => factsOf(program, child, out));
  rowsOf(type).forEach(row => row.value0.forEach(label =>
    label.value1.forEach(argument => factsOf(program, argument, out))));
  return out;
};

const childrenOf = type => {
  if (type instanceof T.TData) return type.value1;
  if (type instanceof T.THandler) return type.value0.value1;
  if (type instanceof T.TRecord)
    return type.value0.fields.map(pair => pair.value1);
  if (!(type instanceof T.TFun)) return [];
  const parts = [];
  let rest = type;
  for (; rest instanceof T.TFun; rest = rest.value2) parts.push(rest.value0);
  return [...parts, rest];
};

const rowsOf = type => {
  if (type instanceof T.TData) return type.value2;
  if (type instanceof T.THandler) {
    const rows = type.value1;
    return rows.clauses instanceof Maybe.Just
      ? [rows.inference, rows.clauses.value0] : [rows.inference];
  }
  const rows = [];
  for (let rest = type; rest instanceof T.TFun; rest = rest.value2)
    rows.push(rest.value1);
  return rows;
};

const slotsOf = (program, owner) => program.types[owner].sorts
  .flatMap((sort, index) => (sort instanceof Syntax.RowSort ? [] : [index]));

const passed = (program, type, out) => {
  const slots = slotsOf(program, type.value0);
  type.value1.forEach((argument, at) => {
    if (at < slots.length && argument instanceof T.TRecord)
      argument.value0.tails.forEach(tail => out.push({ passed: tail,
        owner: type.value0, position: slots[at] }));
  });
};

// The labels a declared type's record parameter lacks, over every
// declaration it is passed to (Implied.purs `declared`): a worklist.
export const declared = (program, owner, position) => {
  const pending = [[owner, position]];
  const seen = new Set();
  const labels = new Set();
  while (pending.length > 0) {
    const [type, at] = pending.shift();
    if (seen.has(`${type} ${at}`)) continue;
    seen.add(`${type} ${at}`);
    const facts = program.types[type].ctors.flatMap(ctor =>
      program.ctors[ctor].fields.flatMap(field => factsOf(program, field)));
    for (const fact of facts) {
      if (fact.beside === at) fact.labels.forEach(label => labels.add(label));
      if (fact.passed === at) pending.push([fact.owner, fact.position]);
    }
  }
  return [...labels].sort();
};
