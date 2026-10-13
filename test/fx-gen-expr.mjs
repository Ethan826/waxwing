// Random well-typed expressions, items and blocks for the FX001 corpus.
// The context tracks what is typed here: `labels` (the effects performable
// at this point: 'Log', 'Tick' and the failure families 'Err' and 'Oops'),
// the Int locals, and the named functions callable (their rows must be
// within `labels`). `safe` drops the failure families: cleanup and the
// filler of designed scenarios never fail by accident (strict `defer`).
// `failing` holds the user labels whose innermost handler may fail (FX008):
// a cleanup performs none of them, and no function whose row names one is
// called under it. `lax` (cleanup of an unconstrained program) names the
// failing labels a deferred expression may nevertheless perform.
import {
  add, block, call, deferItem, doItem, err, fail, handle, handler, letItem,
  lit, local, log, match, oops, print, tick, unit, withHandler
} from './fx-gen-ast.mjs';

export const families = ['Err', 'Oops'];
export const payload = (ctx, family) => (family === 'Err'
  ? err(ctx.r.number()) : oops(ctx.r.number()));
export const fresh = (ctx, prefix) => `${prefix}${ctx.shared.counter++}`;
export const extend = (ctx, ...labels) =>
  ({ ...ctx, labels: new Set([...ctx.labels, ...labels]) });
export const safe = ctx => ({ ...ctx,
  labels: new Set([...ctx.labels].filter(label =>
    !families.includes(label))) });
// Without the labels whose innermost handler may fail.
export const calm = ctx => {
  const quiet = safe(ctx);
  return { ...quiet, labels: new Set([...quiet.labels]
    .filter(label => !ctx.failing.has(label))) };
};
export const bind = (ctx, ...names) =>
  ({ ...ctx, locals: [...ctx.locals, ...names] });

const reachesFailing = (ctx, fn) => [...fn.row]
  .some(label => ctx.failing.has(label) && !ctx.lax.has(label));
const callable = (ctx, ret) => ctx.fns.filter(fn => fn.ret === ret
  && [...fn.row].every(label => ctx.labels.has(label))
  && !reachesFailing(ctx, fn));

export const intExpr = (ctx, depth) => {
  const options = [() => lit(ctx.r.number())];
  if (ctx.locals.length) options.push(() => local(ctx.r.pick(ctx.locals)));
  if (depth > 0)
    options.push(() => add(intExpr(ctx, depth - 1), intExpr(ctx, depth - 1)));
  if (depth > 0 && ctx.labels.has('Tick')) {
    options.push(() => tick(intExpr(ctx, depth - 1)));
  }
  const fns = callable(ctx, 'Int');
  if (depth > 0 && fns.length) {
    options.push(() => applyFn(ctx, ctx.r.pick(fns), depth - 1));
  }
  return ctx.r.pick(options)();
};

export const applyFn = (ctx, fn, depth) => call(fn.name,
  fn.params.map(() => intExpr(ctx, depth)), fn.ret);

export const unitExpr = (ctx, depth) => {
  const options = [() => print(intExpr(ctx, depth)), () => unit];
  if (ctx.labels.has('Log')) options.push(() => log(intExpr(ctx, depth)));
  const fns = callable(ctx, 'Unit');
  if (fns.length) options.push(() => applyFn(ctx, ctx.r.pick(fns), depth));
  return ctx.r.pick(options)();
};

// handler Log/Tick with a clause; the clause runs in the outer context, so
// it sees `ctx.labels` only. A random clause (`randomClause`) is fail-free,
// fails with a family handled outside the `with`, or forwards to an outer
// operation whose handler may fail.
export const logHandler = (ctx, depth, clauseBody, param = 'n') =>
  handler('Log', [{
  op: 'log', params: [param],
  body: clauseBody ?? unitExpr(bind(calm(ctx), 'n'), depth)
}]);
export const tickHandler = (ctx, depth, clauseBody, param = 'n') =>
  handler('Tick', [{
  op: 'tick', params: [param],
  body: clauseBody ?? intExpr(bind(calm(ctx), 'n'), depth)
}]);

const failures = ctx => families.filter(name => ctx.labels.has(name));
const onward = ctx => [...ctx.failing].filter(name => ctx.labels.has(name));
export const forwarding = (label, target) => {
  const n = local('n');
  if (label === 'Log') return target === 'Log' ? log(n) : print(tick(n));
  return target === 'Tick' ? tick(n) : block([doItem(log(n))], n);
};

export const raising = (ctx, label, family) => ({
  ...fail(payload(ctx, family)), ty: label === 'Log' ? 'Unit' : 'Int' });

// The parameter `w` marks a failing random clause: the census counts the
// aborts of clauses with that parameter.
export const randomClause = (ctx, label, depth) => {
  const { r } = ctx;
  if (failures(ctx).length && r.chance(45)) {
    return { kind: 'fail', param: 'w',
      body: raising(ctx, label, r.pick(failures(ctx))) };
  }
  if (onward(ctx).length && r.chance(30)) {
    return { kind: 'forward', param: 'n',
      body: forwarding(label, r.pick(onward(ctx))) };
  }
  const quiet = bind(calm(ctx), 'n');
  return { kind: 'plain', param: 'n',
    body: label === 'Log' ? unitExpr(quiet, depth) : intExpr(quiet, depth) };
};

// The context of a `with` body: its handler is innermost for `label` and
// may fail unless its clause is fail-free.
export const installed = (ctx, label, kind) => {
  const failing = new Set([...ctx.failing].filter(name => name !== label));
  if (kind !== 'plain') failing.add(label);
  const lax = new Set([...ctx.lax].filter(name => name !== label));
  return { ...extend(ctx, label), failing, lax };
};

// A failing clause is reachable: with no family in scope the `with` sits in
// a `handle` (30%), and a clause that may fail ends the body with the
// operation, after a cleanup registered under it (50%).
const wrapUser = (ctx, depth, label) => {
  const { r } = ctx;
  if (failures(ctx).length === 0 && r.chance(50)) {
    const family = r.pick(families);
    const guarded =
      block([doItem(wrapUser(extend(ctx, family), depth, label))]);
    return handle(guarded, [failureClause(ctx, family, 1)]);
  }
  const clause = randomClause(ctx, label, 1);
  const make = label === 'Log' ? logHandler : tickHandler;
  const inside = installed(ctx, label, clause.kind);
  const body = genBlock(inside, depth - 1, 'Unit');
  if (clause.kind === 'plain')
    return withHandler(make(ctx, 1, clause.body, clause.param), body);
  const registered = r.chance(50) ? [deferItem(cleanupExpr(inside, 1))] : [];
  const ended = block([...registered, ...body.items,
    doItem(performing(calm(inside), label))]);
  return withHandler(make(ctx, 1, clause.body, clause.param), ended);
};
export const wrapLog = (ctx, depth) => wrapUser(ctx, depth, 'Log');
export const wrapTick = (ctx, depth) => wrapUser(ctx, depth, 'Tick');

// `handle` of a family F around a block that may fail with F; the clause
// reads the payload sometimes.
export const wrapHandle = (ctx, depth) => {
  const family = ctx.r.pick(families);
  const inner = extend(ctx, family);
  const body = genBlock(inner, depth - 1, 'Unit');
  return handle(body, [failureClause(ctx, family, depth)]);
};

export const failureClause = (ctx, family, depth) => {
  const reader = ctx.r.chance(50);
  const arms = family === 'Err'
    ? [{ pattern: 'Err1(m)',
      body: print(add(local('m'), lit(ctx.r.number()))) },
      { pattern: 'Err2', body: print(lit(ctx.r.number())) }]
    : [{ pattern: 'Oops(m)', body: print(local('m')) }];
  const body = reader ? match(local('error', family), arms, 'Unit')
    : unitExpr(ctx, depth - 1);
  return { family, name: 'error', body };
};

// An abort of an installed family; the rest of the block is then dead code.
const failItem = ctx => {
  const family = ctx.r.pick(families.filter(name => ctx.labels.has(name)));
  return doItem(fail(payload(ctx, family)));
};

// A deferred expression. Constrained, it performs no failing label; in an
// unconstrained program it may (the compiler must then reject the program).
export const cleanupExpr = (ctx, depth) => {
  const lax = ctx.shared.unconstrained;
  const quiet = lax ? { ...safe(ctx), lax: new Set(ctx.failing) } : calm(ctx);
  const options = [() => print(intExpr(quiet, 1)), () => unitExpr(quiet, 1),
    () => genBlock(quiet, depth - 1, 'Unit')];
  if (quiet.labels.has('Log')) options.push(() => log(intExpr(quiet, 1)));
  if (depth > 0) options.push(() => ownFailure(quiet, depth));
  if (lax && quiet.lax.size) {
    options.push(() => performing(quiet, ctx.r.pick([...quiet.lax])),
      () => performing(quiet, ctx.r.pick([...quiet.lax])));
  }
  return ctx.r.pick(options)();
};
export const performing = (ctx, label) =>
  (label === 'Log' ? log(intExpr(ctx, 1))
  : print(tick(intExpr(ctx, 1))));

// A cleanup that fails and handles its own failure: `handle fail(P) {..}`.
export const ownFailure = (ctx, depth) => {
  const family = ctx.r.pick(families);
  return handle(call('fail', [payload(ctx, family)], 'Unit'),
    [failureClause(ctx, family, depth)]);
};

const item = (ctx, depth) => {
  const options = [() => doItem(unitExpr(ctx, 2)),
    () => doItem(intExpr(ctx, 1))];
  if (depth > 0) {
    options.push(() => doItem(wrapLog(ctx, depth)),
      () => doItem(wrapTick(ctx, depth)), () => doItem(wrapHandle(ctx, depth)),
      () => deferItem(cleanupExpr(ctx, depth)));
  }
  if (families.some(name => ctx.labels.has(name)) && ctx.r.chance(10)) {
    options.push(() => failItem(ctx));
  }
  return ctx.r.pick(options)();
};

export const genBlock = (ctx, depth, ty) => {
  const items = [];
  let scope = ctx;
  for (let count = ctx.r.int(4); count > 0; count--) {
    if (ctx.r.chance(25)) {
      const name = fresh(ctx, 'v');
      items.push(letItem(name, intExpr(scope, 1)));
      scope = bind(scope, name);
    } else items.push(item(scope, depth));
  }
  return block(items, ty === 'Int' ? intExpr(scope, 2) : null);
};
