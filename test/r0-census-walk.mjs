// Task 3.5: an explicit walk of resolved syntax for the census's
// erased-row detector (r0-census-erased.mjs). Written from
// Domain.Resolved's constructors, apart from Task 0.7's reference
// reading (r0-erased-criterion.mjs, a generic search by constructor
// name): each constructor's children are listed, and an unknown one
// throws rather than being skipped.
import { load } from './r0-generate-support.mjs';

const R = await load('Domain.Resolved');
const T = await load('Domain.Type');
const Row = await load('Domain.Row');
const { Just } = await load('Data.Maybe');

const none = () => [];
const fieldValues = fields => fields.map(field => field.value);
const item = found => {
  if (found instanceof R.Let) return found.value2;
  if (found instanceof R.Defer) return found.value1;
  if (found instanceof R.Discard) return found.value0;
  throw new Error(`r0-census-walk: not an Item: ${String(found)}`);
};
const literalItem = found => {
  if (found instanceof R.Given) return found.value0.value;
  if (found instanceof R.Spreading) return found.value1;
  throw new Error(`r0-census-walk: not a LiteralItem: ${String(found)}`);
};

// Each Expr constructor: its child expressions.
const children = [
  [R.Integer, none], [R.Boolean, none], [R.Local, none],
  [R.FunctionRef, none], [R.CtorRef, none], [R.UnitValue, none],
  [R.OperationRef, none], [R.PrintRef, none], [R.ShowRef, none],
  [R.CrashRef, none], [R.TextLiteral, none],
  [R.Call, e => e.value2], [R.Construct, e => e.value2],
  [R.Add, e => [e.value1, e.value2]], [R.Concat, e => [e.value1, e.value2]],
  [R.Interpolate, e => e.value1],
  [R.Compare, e => [e.value2, e.value3]],
  [R.If, e => [e.value1, e.value2, e.value3]],
  [R.Match, e => [e.value1, ...e.value2.map(arm => arm.body)]],
  [R.Lambda, e => [e.value2]],
  [R.Apply, e => [e.value1, ...e.value2]],
  [R.Pipe, e => [e.value1, e.value2]],
  [R.Block, e => [...e.value1.map(item), e.value2]],
  [R.Perform, e => e.value3],
  [R.Print, e => e.value1], [R.Show, e => e.value1],
  [R.Crash, e => e.value1],
  [R.Handler, e => e.value2.map(clause => clause.body)],
  [R.With, e => [e.value1, e.value2]],
  [R.Handle, e => [e.value1, ...e.value2.map(clause => clause.body)]],
  [R.Fail, e => [e.value2]],
  [R.RecordLiteral, e => fieldValues(e.value1)],
  [R.FieldAccess, e => [e.value1]],
  [R.RecordUpdate, e => [e.value1, ...fieldValues(e.value2)]],
  [R.RecordExtension, e => e.value1.map(literalItem)],
  [R.RecordRemoval, e => [e.value1]]
];
const childrenOf = expression => {
  const found = children.find(([ctor]) => expression instanceof ctor);
  if (found === undefined)
    throw new Error(`r0-census-walk: not an Expr: ${String(expression)}`);
  return found[1](expression);
};

// Every expression of `body`, dead code included, in pre-order.
export const expressionsOf = body => {
  const found = [];
  const pending = [body];
  while (pending.length > 0) {
    const next = pending.pop();
    found.push(next);
    // A copy: a child list may be the node's own array (Task 4.5).
    pending.push(...[...childrenOf(next)].reverse());
  }
  return found;
};

const subpatterns = pattern => {
  if (pattern instanceof R.Ctor) return pattern.value2;
  if (pattern instanceof R.Record)
    return pattern.value1.map(field => field.pattern);
  if ([R.Wildcard, R.Bind, R.IntLit, R.BoolLit]
    .some(ctor => pattern instanceof ctor)) return [];
  throw new Error(`r0-census-walk: not a Pattern: ${String(pattern)}`);
};

// Every pattern of `body`'s match arms, nested ones included.
export const patternsOf = body => {
  const found = [];
  const pending = expressionsOf(body).filter(e => e instanceof R.Match)
    .flatMap(e => e.value2.map(arm => arm.pattern));
  while (pending.length > 0) {
    const next = pending.pop();
    found.push(next);
    pending.push(...subpatterns(next));
  }
  return found;
};

const rowLabels = row => row.value0;
const handlerRows = rows => [rows.inference,
  ...(rows.clauses instanceof Just ? [rows.clauses.value0] : [])];

// The types and rows directly inside a type (an arrow's spine walked by
// a loop), and the labels written there.
const parts = ty => {
  if (ty instanceof T.TFun) {
    const types = [];
    const rows = [];
    let rest = ty;
    for (; rest instanceof T.TFun; rest = rest.value2) {
      types.push(rest.value0);
      rows.push(rest.value1);
    }
    return { types: [...types, rest], rows, labels: [] };
  }
  if (ty instanceof T.TData)
    return { types: ty.value1, rows: ty.value2, labels: [] };
  if (ty instanceof T.THandler)
    return { types: [], rows: handlerRows(ty.value1), labels: [ty.value0] };
  if (ty instanceof T.TRecord)
    return { types: ty.value0.fields.map(pair => pair.value1), rows: [],
      labels: [] };
  return { types: [], rows: [], labels: [] };
};

// Every label of `ty` at any depth, and every row there.
export const shapeOf = ty => {
  const labels = [];
  const rows = [];
  const pending = [ty];
  const enterLabel = label => {
    labels.push(label);
    pending.push(...label.value1);
  };
  while (pending.length > 0) {
    const found = parts(pending.pop());
    pending.push(...found.types);
    found.labels.forEach(enterLabel);
    for (const row of found.rows) {
      rows.push(row);
      rowLabels(row).forEach(enterLabel);
    }
  }
  return { labels, rows };
};

// Whether `ty`, translated with its effect rows erased (T-R0b §2.2),
// holds a record or a type or record variable.
export const recordOrVariable = ty => {
  if (ty instanceof T.TRecord || ty instanceof T.TVar) return true;
  if (ty instanceof T.THandler) return ty.value0.value1.some(recordOrVariable);
  return parts(ty).types.some(recordOrVariable);
};

export { R, T, Row, Just };
