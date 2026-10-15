// The record scenario of the FX001 corpus (R001, records design §8): a
// Unit block of record literals, accesses, updates, comparisons, printing,
// generic functions over open records and Fail payloads keyed by label
// set. Each program draws a label universe in which a label has one type
// (so any two shapes with a label agree on it, and one label set is one
// family); a nested shape uses labels of its own. Shapes are { fields:
// [[label, type]] }, a type a name or a shape. Literals and types are
// written in shuffled order, and Int fields often perform `arg(n)`, so
// evaluation order and sorted printing are both observable. The generic
// functions go to ctx.shared.extra (test/fx-gen-record-fns.mjs).
import {
  access, call, compare, doItem, err, fail, handle, letItem, lit, local,
  print, record, str, truth, unit, update, block
} from './fx-gen-ast.mjs';
import { fresh, intExpr } from './fx-gen-expr.mjs';
import { genericFns, typeText } from './fx-gen-record-fns.mjs';
import { literal, randomText } from './text-literal-gen.mjs';

export const cellType = 'type Cell = Cell({ t: Text, n: Int }) | Empty; ';
const labels = ['a', 'aB', 'a_', 'a1', 'b', 'code', 'id', 'msg', 'x', 'zz'];
const innerLabels = ['u', 'v', 'w2'];
const scalars = ['Int', 'Int', 'Bool', 'Text', 'Text', 'Unit', 'Err',
  'Cell'];
const operators = ['==', '!=', '<', '<=', '>', '>='];
const cell = { fields: [['n', 'Int'], ['t', 'Text']] };
const falsity = { k: 'lit', text: 'false', ty: 'Bool' };

const byLabel = ([left], [right]) => (left < right ? -1 : 1);
const shapeOf = fields => ({ fields: [...fields].sort(byLabel) });
const keyOf = shape => shape.fields.map(([label]) => label).join(',');
const has = (shape, label) => shape.fields.some(([name]) => name === label);

// The program's labels, their types and two or three distinct shapes;
// the first label is Int and in most shapes (the generic functions'
// label).
const universe = ctx => {
  const { r } = ctx;
  const chosen = r.shuffle(labels).slice(0, 5);
  const nested = shapeOf(r.shuffle(innerLabels).slice(0, 1 + r.int(2))
    .map(label => [label, r.pick(scalars)]));
  const types = new Map(chosen.map((label, index) => [label, index === 0
    ? 'Int' : r.chance(15) ? nested : r.pick(scalars)]));
  const shapes = new Map();
  for (let count = 0; count < 3; count++) {
    const rest = r.shuffle(chosen.slice(1)).slice(0, r.int(4));
    const keyed = count < 2 || r.chance(50) || rest.length === 0;
    const shape = shapeOf((keyed ? [chosen[0], ...rest] : rest)
      .map(label => [label, types.get(label)]));
    shapes.set(keyOf(shape), shape);
  }
  return { key: chosen[0], shapes: [...shapes.values()], nested,
    locals: [] };
};

const textValue = r => str(literal(r, [randomText(r, 4)],
  { hashes: r.chance(30) ? 1 : 0 }));

const intValue = (ctx, st, depth) => {
  const { r } = ctx;
  const options = [() => lit(r.number()), () => intExpr(ctx, 1),
    () => call('arg', [lit(r.number())], 'Int')];
  const keyed = st.shapes.filter(shape => has(shape, st.key));
  if (depth > 0 && st.fns) {
    const { get, mix } = st.fns;
    options.push(() => access(recordValue(ctx, st, r.pick(keyed), depth - 1),
      st.key, 'Int'),
    () => call(get, [recordValue(ctx, st, r.pick(keyed), depth - 1)], 'Int'),
    () => call(mix, [recordValue(ctx, st, r.pick(keyed), depth - 1),
      recordValue(ctx, st, r.pick(keyed), depth - 1)], 'Int'));
  }
  return r.pick(options)();
};

const scalarValue = (ctx, st, type, depth) => {
  const { r } = ctx;
  if (type === 'Int') return intValue(ctx, st, depth);
  if (type === 'Bool') return r.chance(30) ? compare(r.pick(operators),
    intExpr(ctx, 1), intExpr(ctx, 1)) : r.pick([truth, falsity]);
  if (type === 'Unit') return unit;
  if (type === 'Err') return err(r.number());
  if (type === 'Cell') return r.chance(25) ? call('Empty', [], 'Cell')
    : call('Cell', [recordValue(ctx, st, cell, depth)], 'Cell');
  const shown = st.fns?.shown;
  if (depth > 0 && shown && r.chance(20)) {
    const shape = r.pick(st.shapes.filter(one => has(one, shown.label)));
    return call(shown.name, [recordValue(ctx, st, shape, depth - 1)], 'Text');
  }
  return r.chance(25) ? call('show', [intExpr(ctx, 1)], 'Text')
    : textValue(r);
};

export const valueOf = (ctx, st, type, depth) => (typeof type === 'string'
  ? scalarValue(ctx, st, type, depth) : recordValue(ctx, st, type, depth));

const literalOf = (ctx, st, shape, depth) => record(ctx.r.shuffle(
  shape.fields).map(([label, type]) =>
  [label, valueOf(ctx, st, type, Math.max(depth - 1, 0))]), shape);

const updateOf = (ctx, st, shape, depth) => {
  const { r } = ctx;
  const chosen = r.shuffle(shape.fields).slice(0, 1 + r.int(2));
  return update(recordValue(ctx, st, shape, depth - 1), chosen.map(
    ([label, type]) => [label, valueOf(ctx, st, type, depth - 1)]));
};

// A value of `shape`: a literal, a local, an update, a generic call, a
// closed-record function, or a nested field.
export const recordValue = (ctx, st, shape, depth) => {
  const { r } = ctx;
  const options = [() => literalOf(ctx, st, shape, depth)];
  const locals = st.locals.filter(found => found.shape === shape);
  if (locals.length) {
    options.push(() => local(r.pick(locals).name, shape));
  }
  if (depth <= 0) return r.pick(options)();
  options.push(() => updateOf(ctx, st, shape, depth));
  if (st.fns && has(shape, st.key) && st.shapes.includes(shape)) {
    options.push(() => call(r.pick(st.fns.keep), [recordValue(ctx, st, shape,
      depth - 1)], shape));
  }
  if (st.fns?.made.shape === shape) {
    options.push(() => call(st.fns.made.name, [intExpr(ctx, 1)], shape));
  }
  const holders = st.shapes.flatMap(one => one.fields
    .filter(([, type]) => type === shape).map(([label]) => [one, label]));
  if (holders.length) {
    const [holder, label] = r.pick(holders);
    options.push(() => access(recordValue(ctx, st, holder, depth - 1), label,
      shape));
  }
  return r.pick(options)();
};

// A handle of one or two label-set families around a block that raises
// one of them; sometimes the abort crosses an inner handle of the other.
const failing = (ctx, st) => {
  const { r } = ctx;
  const [one, two = one] = r.shuffle(st.shapes);
  const raised = r.pick([one, two]);
  const other = raised === one ? two : one;
  const clause = shape => {
    const [label, type] = r.pick(shape.fields);
    const shown = r.chance(50) ? local('e', shape)
      : access(local('e', shape), label, type);
    return { family: typeText(r, shape), name: 'e', body: print(shown) };
  };
  const body = block([doItem(print(intValue(ctx, st, 1))),
    doItem(fail(recordValue(ctx, st, raised, 1))), doItem(print(lit(0)))]);
  if (other !== raised && r.chance(40)) {
    return handle(block([doItem(handle(body, [clause(other)]))]),
      [clause(raised)]);
  }
  return handle(body, other === raised ? [clause(raised)]
    : r.shuffle([clause(raised), clause(other)]));
};

const randomItem = (ctx, st) => {
  const { r } = ctx;
  const shape = r.pick(st.shapes);
  const value = depth => recordValue(ctx, st, shape, depth);
  const [label, type] = r.pick(shape.fields);
  const options = [() => doItem(print(value(2))),
    () => doItem(print(call('show', [value(2)], 'Text'))),
    () => doItem(print(access(value(2), label, type))),
    () => doItem(print(compare(r.pick(operators), value(1), value(1)))),
    () => doItem(print(intValue(ctx, st, 2)))];
  const picked = st.fns.picked;
  if (has(shape, picked.label)) {
    options.push(() => doItem(print(call(picked.name, [value(1)],
      picked.type))));
  }
  if (r.chance(30)) {
    const name = fresh(ctx, 'rec');
    const item = letItem(name, value(2));
    st.locals.push({ name, shape });
    return item;
  }
  return r.pick(options)();
};

// Fixed items guarantee the census (a literal with effectful fields, an
// update, a generic call, an access, a comparison, a Fail payload);
// random ones vary the shapes.
export const recordFrame = ctx => {
  const { r } = ctx;
  const st = universe(ctx);
  st.fns = genericFns(ctx, st, valueOf);
  const [shape] = st.shapes;
  const first = fresh(ctx, 'rec');
  const items = [letItem(first, literalOf(ctx, st, shape, 1))];
  st.locals.push({ name: first, shape });
  const kept = local(first, shape);
  const [label, type] = r.pick(shape.fields);
  items.push(doItem(print(updateOf(ctx, st, shape, 1))),
    doItem(print(call(r.pick(st.fns.keep), [kept], shape))),
    doItem(print(access(kept, label, type))),
    doItem(print(compare(r.pick(operators), kept, recordValue(ctx, st,
      shape, 1)))),
    doItem(failing(ctx, st)));
  for (let count = 2 + r.int(4); count > 0; count--) {
    items.push(randomItem(ctx, st));
  }
  return block(items);
};
