// Designed scenarios of the FX001 corpus (spec §5 probes 1-4): nested
// same-key handlers with intercept-and-forward, aborts crossing handles,
// interleaved stage order with over-application, and callbacks run under
// another handler. Each returns a Unit expression; helper functions it
// needs are added to ctx.shared.extra. Fillers use `safe` contexts so the
// scenario's own control flow is the only failure.
import {
  add, apply, block, call, deferItem, doItem, fail, handle, lambda, letItem,
  lit, local, log, print, tick, unit, withHandler
} from './fx-gen-ast.mjs';
import {
  cleanupExpr, extend, families, failureClause, fresh, genBlock, installed,
  logHandler, payload, performing, raising, safe, tickHandler
} from './fx-gen-expr.mjs';

const number = ctx => lit(ctx.r.number());
const sum = (name, ctx) => add(local(name), number(ctx));
// Performs the effect once: Log directly, Tick through its Int result.
const use = (ctx, effect) => (effect === 'Log' ? log(number(ctx))
  : print(tick(number(ctx))));
const filler = (ctx, effect) => genBlock(extend(safe(ctx), effect), 1, 'Unit');

// Clause bodies: a forwarding clause performs its own effect (outside the
// handler it belongs to), a plain one prints.
const clauseBody = (ctx, effect, forward) => {
  if (effect === 'Log') {
    return forward ? log(sum('n', ctx)) : print(sum('n', ctx));
  }
  return forward ? tick(sum('n', ctx)) : sum('n', ctx);
};

const bindN = ctx => ({ ...ctx, locals: [...ctx.locals, 'n'] });

const layer = (ctx, effect, depth) => {
  const forward = depth > 0 && ctx.r.chance(80);
  const clause = clauseBody(bindN(ctx), effect, forward);
  const make = effect === 'Log' ? logHandler : tickHandler;
  const inside = extend(ctx, effect);
  const deeper = depth < 2 && ctx.r.chance(70);
  const nested = deeper ? [doItem(layer(inside, effect, depth + 1))] : [];
  return withHandler(make(ctx, 0, clause), block([doItem(use(inside, effect)),
    doItem(filler(inside, effect)), ...nested], use(inside, effect)));
};

export const nested = ctx => layer(safe(ctx), ctx.r.pick(['Log', 'Tick']), 0);

// An abort that must skip an inner `handle`: raised by a clause (which runs
// outside its `with`), by a deep `fail`, or by a function; the inner handle
// is of the same family or of another.
export const crossing = ctx => {
  const quiet = safe(ctx);
  const family = ctx.r.pick(families);
  const other = families.find(name => name !== family);
  const outer = extend(quiet, family);
  const fromClause = ctx.r.chance(50);
  const inner = fromClause && ctx.r.chance(50) ? family : other;
  const viaFunction = !fromClause && family === 'Err' && ctx.r.chance(40);
  const raise = viaFunction ? call('risky', [number(ctx)], 'Int')
    : fromClause ? log(number(ctx)) : fail(payload(ctx, family));
  const body = block([doItem(genBlock(safe(outer), 1, 'Unit')), doItem(raise)]);
  const guarded = handle(body, [failureClause(outer, inner, 1)]);
  const wrapped = fromClause ? withHandler(logHandler(outer, 0,
    fail(payload(ctx, family))), block([doItem(guarded)])) : guarded;
  return handle(wrapped, [failureClause(quiet, family, 1)]);
};

// Signature labels under a handler's frame are `nofail` (FX008): the random
// clauses are fail-free.
const ROW = { Console: 'Console', Log: 'nofail Log + Console' };
const stageFn = (name, params, retText, rowText, body) => ({
  name, params: params.map(param => [param, 'Int']), ret: 'fn', retText,
  rowText, row: new Set(), body
});
const argument = ctx => call('arg', [lit(ctx.r.int(9) + 1)], 'Int');

// Stage order (design §2): arguments and stage bodies interleave. A stage
// function of arity n returns a lambda applied to one more argument
// (over-application); a partial application supplies its argument now and
// the rest later. Marks are `print`s, or `log`s under a printing handler.
const stageCall = (ctx, effect) => {
  const { r } = ctx;
  const mark = () => doItem(effect === 'Log' ? log(lit(r.int(9) + 1))
    : print(lit(r.int(9) + 1)));
  const name = fresh(ctx, 'stage');
  const kind = r.pick(['one', 'one', 'one', 'two', 'two', 'two', 'partial', 'lambda']);
  if (kind === 'one' || kind === 'two') {
    const names = kind === 'one' ? ['x'] : ['x', 'y'];
    const total = names.map(param => local(param)).reduce(add);
    const body = block([mark()],
      lambda(['z'], block([mark()], add(total, local('z')))));
    ctx.shared.extra.push(stageFn(name, names,
      `(Int -> Int with ${ROW[effect]})`, ROW[effect], body));
    const args = Array.from({ length: names.length + 1 }, () => argument(ctx));
    return print(call(name, args, 'Int'));
  }
  const body = block([mark()], add(local('x'), local('y')));
  let made = apply(lambda(['x', 'y'], body), [argument(ctx)], 'fn');
  if (kind === 'partial') {
    ctx.shared.extra.push(stageFn(name, ['x', 'y'], 'Int', ROW[effect], body));
    made = call(name, [argument(ctx)], 'fn');
  }
  return block([letItem('p', made), mark(),
    doItem(print(apply(local('p', 'fn'), [argument(ctx)], 'Int')))]);
};

export const stages = ctx => {
  const quiet = safe(ctx);
  if (!ctx.r.chance(40)) return stageCall(quiet, 'Console');
  const printing = print(sum('n', quiet));
  return withHandler(logHandler(quiet, 0, printing),
    block([doItem(stageCall(quiet, 'Log'))]));
};

// make(a) builds a callback performing the effect; run(f, n) calls it under
// a handler of its own. Neither names Console (a callback with the ambient
// row cannot be consumed by a function with own labels).
const callbackFns = (ctx, effect) => {
  const make = fresh(ctx, 'make');
  const run = fresh(ctx, 'run');
  const tickEffect = effect === 'Tick';
  const type = tickEffect ? 'Int -> Int with nofail Tick'
    : 'Int -> Unit with nofail Log';
  const result = tickEffect ? 'Int' : 'Unit';
  const performed = tickEffect ? add(local('x'), tick(local('a')))
    : log(add(local('x'), local('a')));
  const call = apply(local('f', 'fn'), [local('n')], result);
  const inside = tickEffect
    ? withHandler(tickHandler(ctx, 0, add(local('n'), number(ctx))), block([], call))
    : withHandler(logHandler(ctx, 0, unit), block([], call));
  ctx.shared.extra.push(
    { name: make, params: [['a', 'Int']], ret: 'fn', retText: type, rowText: '',
      row: new Set(), body: lambda(['x'], performed) },
    { name: run, params: [['f', type], ['n', 'Int']], ret: result, retText: result,
      rowText: '', row: new Set(), body: inside });
  return { make, run, result };
};

// A callback made under one handler and run under another: passed to a
// runner that installs its own handler, or kept in a `let` and run under
// two handlers in turn.
export const escaping = ctx => {
  const quiet = safe(ctx);
  const effect = ctx.r.pick(['Tick', 'Log']);
  const { make, run, result } = callbackFns(quiet, effect);
  const tickEffect = effect === 'Tick';
  const clause = (body, plain) => (tickEffect ? tickHandler(quiet, 0, body)
    : logHandler(quiet, 0, plain));
  const shown = value => (tickEffect ? print(value) : value);
  const outer = clause(add(local('n'), number(quiet)), print(sum('n', quiet)));
  const made = call(make, [number(quiet)], 'fn');
  const inline = lambda(['x'], tickEffect ? add(local('x'), tick(number(quiet)))
    : block([doItem(log(sum('x', quiet)))], print(local('x'))));
  const direct = shown(call(run, [ctx.r.chance(50) ? made : inline,
    number(quiet)], result));
  const under = () => doItem(withHandler(
    clause(add(local('n'), number(quiet)), print(sum('n', quiet))),
    block([doItem(shown(apply(local('f', 'fn'), [number(quiet)], result)))])));
  const kept = [letItem('f', made), under(), under()];
  return withHandler(outer, block(ctx.r.chance(50) ? [doItem(direct)] : kept));
};

// A handler whose clause fails with a family handled outside its `with`
// (FX008): cleanups registered under it, then an operation that runs the
// clause. Constrained, the cleanups avoid the label (the clause would abort
// them); unconstrained, they may perform it and the compiler must refuse.
export const failingFrame = ctx => {
  const { r } = ctx;
  const family = r.pick(families);
  const label = r.pick(['Log', 'Tick']);
  const outer = extend(safe(ctx), family);
  const inside = installed(outer, label, 'fail');
  const make = label === 'Log' ? logHandler : tickHandler;
  const clause = make(outer, 0, raising(outer, label, family), 'w');
  const trigger = label === 'Log' ? log(number(ctx)) : print(tick(number(ctx)));
  const registered = Array.from({ length: 1 + r.int(2) },
    () => deferItem(cleanupExpr(inside, 1)));
  const items = [...registered, doItem(trigger), doItem(genBlock(inside, 1, 'Unit'))];
  if (ctx.shared.unconstrained && r.chance(70)) {
    items.unshift(deferItem(performing({ ...inside, lax: inside.failing }, label)));
  }
  return handle(withHandler(clause, block(items)),
    [failureClause(safe(ctx), family, 1)]);
};
