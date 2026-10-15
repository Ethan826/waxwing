// Functions over records for the record scenario of the FX001 corpus
// (test/fx-gen-records.mjs): generic functions over open records, each
// row variable an implicit universal (records design §2), and one
// closed-record function. Over the universe's Int label k:
//   get(p: { k: Int, ...r }): Int                   an access
//   bump, twice, tap: { k: Int, ...r } -> same      an update, a chain of
//                                                   generic calls, Console
//   mix(p: { k: Int, ...r }, q: { k: Int, ...s })   two row variables
// and over a label l of type T of some shape:
//   shown(p: { l: T, ...r }): Text = show(p)        printing in generic code
//   picked(p: { l: T, ...r }): T = p.l
// and made(n: Int): S, a literal of the first shape. Each is pushed to
// ctx.shared.extra; the result names them for the scenario's calls.
// `valueOf` (test/fx-gen-records.mjs) writes the closed function's body.
import {
  access, add, block, call, doItem, lit, local, print, update
} from './fx-gen-ast.mjs';
import { fresh } from './fx-gen-expr.mjs';

// A type as written, its fields in shuffled order: a name, or a shape
// { fields: [[label, type]] }.
export const typeText = (r, type) => (typeof type === 'string' ? type
  : `{ ${r.shuffle(type.fields).map(([label, field]) =>
    `${label}: ${typeText(r, field)}`).join(', ')} }`);

const define = (ctx, prefix, params, retText, body, rowText = '') => {
  const name = fresh(ctx, prefix);
  ctx.shared.extra.push({ name, params, ret: 'record', retText, rowText,
    row: new Set(), body });
  return name;
};

const keyFns = (ctx, key) => {
  const open = tail => `{ ${key}: Int, ...${tail} }`;
  const p = local('p', 'record');
  const field = access(p, key, 'Int');
  const step = add(field, lit(ctx.r.number()));
  const get = define(ctx, 'get', [['p', open('r')]], 'Int', field);
  const bump = define(ctx, 'bump', [['p', open('r')]], open('r'),
    update(p, [[key, step]]));
  const twice = define(ctx, 'twice', [['p', open('r')]], open('r'),
    call(bump, [call(bump, [p], 'record')], 'record'));
  const tap = define(ctx, 'tap', [['p', open('r')]], open('r'),
    block([doItem(print(field))], update(p, [[key, add(field, lit(1))]])),
    'Console');
  const mix = define(ctx, 'mix', [['p', open('r')], ['q', open('s')]], 'Int',
    add(field, access(local('q', 'record'), key, 'Int')));
  return { get, mix, keep: [bump, twice, tap] };
};

export const genericFns = (ctx, st, valueOf) => {
  const { r } = ctx;
  const [label, type] = r.pick(r.pick(st.shapes).fields);
  const open = `{ ${label}: ${typeText(r, type)}, ...r }`;
  const p = local('p', 'record');
  const shown = define(ctx, 'shown', [['p', open]], 'Text',
    call('show', [p], 'Text'));
  const picked = define(ctx, 'picked', [['p', open]], typeText(r, type),
    access(p, label, type));
  const [shape] = st.shapes;
  const made = { shape, name: null };
  const quiet = { ...st, fns: null, locals: [] };
  const body = valueOf({ ...ctx, locals: ['n'] }, quiet, shape, 0);
  made.name = define(ctx, 'made', [['n', 'Int']], typeText(r, shape), body,
    'Console');
  return { ...keyFns(ctx, st.key), shown: { name: shown, label },
    picked: { name: picked, label, type }, made };
};
