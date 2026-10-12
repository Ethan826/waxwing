// Designed scenarios with a handler that may fail (FX008 Task 11): a clause
// failing with a family handled outside its `with`, the operation that runs
// it, and cleanups registered under it. Constrained (default corpus), the
// cleanups avoid the failing labels. Unconstrained (the soundness
// differential), they perform them, in shapes the compiler must refuse:
//   lexical  the handler is lexically around the `defer`
//   forward  a clause forwards to an outer clause that fails
//   callee   a helper function registers the `defer`, called under the
//            handler (its row plain or `nofail`)
//   value    the handler is passed to (or returned by) a function
//   ambient  the clause calls a callback with an ambient row
// A program has at most one of these; `ctx.shared.shapes` records it.
import {
  apply, block, call, deferItem, doItem, handle, lambda, lit,
  local, log, print, tick, unit, withHandler
} from './fx-gen-ast.mjs';
import {
  calm, cleanupExpr, extend, families, failureClause, forwarding, fresh,
  genBlock, installed, logHandler, performing, raising, safe, tickHandler
} from './fx-gen-expr.mjs';

const number = ctx => lit(ctx.r.number());
const handlerOf = label => (label === 'Log' ? logHandler : tickHandler);
const trigger = (ctx, label) => (label === 'Log' ? log(number(ctx))
  : print(tick(number(ctx))));
const guarded = (ctx, family, body) =>
  handle(body, [failureClause(safe(ctx), family, 1)]);
// A deferred expression performing a failing label (and nothing that fails
// by itself: `safe` drops the families).
const violating = (inside, label) =>
  deferItem(performing({ ...safe(inside), lax: inside.failing }, label));
const registered = inside => Array.from({ length: 1 + inside.r.int(2) },
  () => deferItem(cleanupExpr(inside, 1)));

const lexical = (ctx, family, label) => {
  const outer = extend(safe(ctx), family);
  const other = label === 'Log' ? 'Tick' : 'Log';
  const sibling = installed(outer, other, 'plain');
  const inside = installed(sibling, label, 'fail');
  const clause = handlerOf(label)(sibling, 0, raising(sibling, label, family), 'w');
  const items = [...registered(inside), doItem(trigger(ctx, label)),
    doItem(genBlock(inside, 1, 'Unit'))];
  if (ctx.r.chance(60)) items.unshift(deferItem(performing(calm(inside), other)));
  if (ctx.shared.unconstrained && ctx.r.chance(70)) {
    items.unshift(violating(inside, label));
  }
  const frame = withHandler(clause, block(items));
  return guarded(ctx, family, withHandler(handlerOf(other)(outer, 1),
    block([doItem(frame)])));
};

const forward = (ctx, family) => {
  const outer = extend(safe(ctx), family);
  const top = installed(outer, 'Tick', 'fail');
  const mid = installed(top, 'Log', 'forward');
  const items = [...registered(mid), doItem(log(number(ctx))),
    doItem(genBlock(mid, 1, 'Unit'))];
  if (ctx.shared.unconstrained && ctx.r.chance(70)) {
    items.unshift(violating(mid, ctx.r.pick(['Log', 'Tick'])));
  }
  const failing = tickHandler(outer, 0, raising(outer, 'Tick', family), 'w');
  const onward = logHandler(top, 0, forwarding('Log', 'Tick'));
  return guarded(ctx, family, withHandler(failing,
    block([doItem(withHandler(onward, block(items)))])));
};

const helper = (ctx, name, params, ret, rowText, body) =>
  ctx.shared.extra.push({ name, params, ret: ret ?? 'Unit', retText: ret ?? 'Unit',
    row: new Set(), rowText, body });

const callee = (ctx, family) => {
  const outer = extend(safe(ctx), family);
  const name = fresh(ctx, 'helper');
  const marked = ctx.r.chance(50);
  ctx.shared.shapes.push(marked ? 'callee-nofail' : 'callee-plain');
  helper(ctx, name, [], null, `${marked ? 'nofail ' : ''}Log + Console`,
    block([deferItem(log(number(ctx))), doItem(print(number(ctx)))]));
  const failing = logHandler(outer, 0, raising(outer, 'Log', family), 'w');
  return guarded(ctx, family, withHandler(failing,
    block([doItem(call(name, [], 'Unit'))])));
};

const value = (ctx, family) => {
  const outer = extend(safe(ctx), family);
  const type = `Handler(Log with Fail(${family}))`;
  const install = fresh(ctx, 'install');
  helper(ctx, install, [['h', type]], null, `Fail(${family})`,
    withHandler(local('h', 'fn'), block([deferItem(log(number(ctx)))])));
  const made = logHandler(outer, 0, raising(outer, 'Log', family), 'w');
  const through = ctx.r.chance(50);
  const same = fresh(ctx, 'same');
  if (through) helper(ctx, same, [['h', type]], type, '', local('h', 'fn'));
  ctx.shared.shapes.push(through ? 'value-returned' : 'value-passed');
  const argument = through ? call(same, [made], 'fn') : made;
  return guarded(ctx, family, call(install, [argument], 'Unit'));
};

const ambient = (ctx, family) => {
  const outer = extend(safe(ctx), family);
  const name = fresh(ctx, 'bracket');
  const onward = apply(local('f', 'fn'), [unit], 'Unit');
  helper(ctx, name, [['f', 'Unit -> Unit']], null, '',
    withHandler(logHandler(outer, 0, onward), block([deferItem(log(number(ctx)))])));
  ctx.shared.shapes.push('ambient');
  const failing = lambda(['u'], raising(outer, 'Log', family));
  return guarded(ctx, family, call(name, [failing], 'Unit'));
};

export const failingFrame = ctx => {
  const family = ctx.r.pick(families);
  const label = ctx.r.pick(['Log', 'Tick']);
  const open = ['lexical', 'forward'];
  const shapes = ctx.shared.unconstrained
    ? [...open, 'callee', 'value', 'ambient'] : open;
  const shape = ctx.r.pick(shapes);
  const made = { lexical: () => lexical(ctx, family, label), forward: () => forward(ctx, family),
    callee: () => callee(ctx, family), value: () => value(ctx, family),
    ambient: () => ambient(ctx, family) }[shape]();
  if (shape === 'lexical' || shape === 'forward') ctx.shared.shapes.push(shape);
  return made;
};
