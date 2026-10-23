// RT1's translator: expressions (T-R0b §3.2-§3.5), one rule per
// constructor of Resolved.Expr. `expr` returns the node's type τ and
// records it in `types` at the node's path (§5.2).
import { arrow, at, base, emit, eq, fresh, tvar, typed }
  from './r0-translator-context.mjs';
import { call, construct, ctorRef, flush, functionRef }
  from './r0-translator-calls.mjs';
import { Maybe, R, translate } from './r0-translator-types.mjs';
import { effectRules } from './r0-translator-effects.mjs';
import { recordRules } from './r0-translator-records.mjs';

const site = (path, rule, span) => ({ path, rule, span, kind: 'body' });
const res = (cx, here) =>
  tvar(fresh(cx, here, 'res', 'type', { nodeType: here.path }));
const B1 = (cx, here, left, right) => emit(cx, here, 'b', 'B1',
  eq(left, right));
const Int = base('Int');
const Bool = base('Bool');
const Text = base('Text');
const Unit = base('Unit');

// A child of the node at `path`: field names follow the constructor's
// fields (test/r0-translator.mjs states the vocabulary).
const child = (cx, env, path, node) => (expression, ...steps) =>
  cx.expr(cx, expression, at(path, node, ...steps), env);

const binary = (rule, type) => (cx, e, path, env) => {
  const here = site(path, rule, e.value0);
  const name = rule === 'E7' ? 'Add' : 'Concat';
  B1(cx, here, child(cx, env, path, name)(e.value1, 'left'), type);
  B1(cx, here, child(cx, env, path, name)(e.value2, 'right'), type);
  return type;
};

const literal = type => () => type;

// E12: each arm's pattern against the scrutinee's type, its body under
// the bindings, and `eq τ_body ⟨p, res⟩`.
const match = (cx, e, path, env) => {
  const here = site(path, 'E12', e.value0);
  const result = res(cx, here);
  const scrutinee = child(cx, env, path, 'Match')(e.value1, 'scrutinee');
  e.value2.forEach((arm, index) => {
    const armPath = at(path, 'Match', 'arms', index);
    const bound = cx.pattern(cx, arm.pattern, at(armPath, 'pattern'),
      scrutinee, env);
    B1(cx, here, cx.expr(cx, arm.body, at(armPath, 'body'), bound), result);
  });
  return result;
};

// E13: annotated parameters at ⟦A_k⟧ν_f with `eq σ_k σ_k` (B14, origin
// types), the others at `⟨p, param k⟩`.
const lambda = (cx, e, path, env) => {
  const here = site(path, 'E13', e.value0);
  const marks = [];
  const inner = new Map(env);
  const params = e.value1.map((param, index) => {
    const type = param.ty instanceof Maybe.Just
      ? translate(cx.program, param.ty.value0, cx.rigidNaming, marks)
      : tvar(fresh(cx, here, { param: index }, 'type',
        { paramType: [path, index] }, param.span));
    if (param.ty instanceof Maybe.Just) emit(cx, here, 'b', 'B14',
      eq(type, type), { kind: 'types' });
    if (param.local instanceof Maybe.Just) inner.set(param.local.value0, type);
    return type;
  });
  flush(cx, here, marks, 'types');
  return arrow(params, cx.expr(cx, e.value2, at(path, 'Lambda', 'body'),
    inner));
};

// E14, E15: `eq τ_e (τ_{a₁} → … → ⟨p, res⟩)`.
const apply = (cx, e, path, env) => {
  const here = site(path, 'E14', e.value0);
  const result = res(cx, here);
  const go = child(cx, env, path, 'Apply');
  const fn = go(e.value1, 'function');
  B1(cx, here, fn, arrow(e.value2.map((argument, index) =>
    go(argument, 'args', index)), result));
  return result;
};

const pipe = (cx, e, path, env) => {
  const here = site(path, 'E15', e.value0);
  const result = res(cx, here);
  const left = child(cx, env, path, 'Pipe')(e.value1, 'left');
  B1(cx, here, child(cx, env, path, 'Pipe')(e.value2, 'right'),
    arrow([left], result));
  return result;
};

// An item's constructor name and value; no catch-all (Item has three).
const itemParts = item => {
  if (item instanceof R.Let) return ['Let', item.value2];
  if (item instanceof R.Defer) return ['Defer', item.value1];
  if (item instanceof R.Discard) return ['Discard', item.value0];
  throw new Error(`r0-translator: not an Item: ${String(item)}`);
};

// E16: items in order; a `let` binds monomorphically; `defer` gives
// `eq τ_e Unit` and `Outside Deferred` at the item's path.
const block = (cx, e, path, env) => {
  const inner = new Map(env);
  e.value1.forEach((item, index) => {
    const itemPath = at(path, 'Block', 'items', index);
    const [named, value] = itemParts(item);
    const type = cx.expr(cx, value, at(itemPath, named, 'value'), inner);
    if (item instanceof R.Let && item.value1 instanceof Maybe.Just)
      inner.set(item.value1.value0, type);
    if (!(item instanceof R.Defer)) return;
    const here = site(itemPath, 'E16', item.value0);
    B1(cx, here, type, Unit);
    emit(cx, here, 'outside', 'O6', 'Deferred');
  });
  return cx.expr(cx, e.value2, at(path, 'Block', 'result'), inner);
};

const arguments_ = (cx, e, path, env, name, from) =>
  e[from].map((argument, index) =>
    child(cx, env, path, name)(argument, 'args', index));

// The rules, by constructor: [class, rule].
const coreRules = [
  [R.Integer, literal(Int)], [R.Boolean, literal(Bool)],
  [R.TextLiteral, literal(Text)], [R.UnitValue, literal(Unit)],
  [R.Local, (cx, e, path, env) => {
    if (!env.has(e.value1))
      throw new Error(`r0-translator: unbound local ${e.value1}`);
    return env.get(e.value1);
  }],
  [R.FunctionRef, (cx, e, path) =>
    functionRef(cx, site(path, 'E3', e.value0), e.value1)],
  [R.CtorRef, (cx, e, path) =>
    ctorRef(cx, site(path, 'E4', e.value0), e.value1)],
  [R.Call, (cx, e, path, env) => call(cx, site(path, 'E5', e.value0),
    e.value1, arguments_(cx, e, path, env, 'Call', 'value2'))],
  [R.Construct, (cx, e, path, env) => construct(cx,
    site(path, 'E6', e.value0), e.value1,
    arguments_(cx, e, path, env, 'Construct', 'value2'))],
  [R.Add, binary('E7', Int)], [R.Concat, binary('E8', Text)],
  [R.Interpolate, (cx, e, path, env) => {
    const here = site(path, 'E9', e.value0);
    e.value1.forEach((part, index) => B1(cx, here,
      child(cx, env, path, 'Interpolate')(part, 'parts', index), Text));
    return Text;
  }],
  [R.Compare, (cx, e, path, env) => {
    const here = site(path, 'E10', e.value0);
    const left = child(cx, env, path, 'Compare')(e.value2, 'left');
    B1(cx, here, left, child(cx, env, path, 'Compare')(e.value3, 'right'));
    emit(cx, here, 'bq', 'C6', { cmp: left });
    return Bool;
  }],
  [R.If, (cx, e, path, env) => {
    const here = site(path, 'E11', e.value0);
    const result = res(cx, here);
    const go = child(cx, env, path, 'If');
    B1(cx, here, go(e.value1, 'condition'), Bool);
    B1(cx, here, go(e.value2, 'then'), result);
    B1(cx, here, go(e.value3, 'else'), result);
    return result;
  }],
  [R.Match, match], [R.Lambda, lambda], [R.Apply, apply], [R.Pipe, pipe],
  [R.Block, block]
];

const rules = [...coreRules, ...effectRules, ...recordRules];

// One rule per constructor (G-total, §2.4); an unknown node throws.
export const expr = (cx, e, path, env) => {
  const found = rules.find(([shape]) => e instanceof shape);
  if (!found) throw new Error(`r0-translator: not an Expr: ${String(e)}`);
  return typed(cx, path, found[1](cx, e, path, env));
};

export const exprShapes = rules.map(([shape]) => shape);
