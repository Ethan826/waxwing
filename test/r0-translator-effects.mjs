// RT1's translator: builtins, effects and handlers (T-R0b §3.5: E17-E23).
import { arrow, at, base, emit, eq, fresh, tvar }
  from './r0-translator-context.mjs';
import { flush } from './r0-translator-calls.mjs';
import { Maybe, R, Row, translate } from './r0-translator-types.mjs';

const site = (path, rule, span) => ({ path, rule, span, kind: 'body' });
const res = (cx, here) =>
  tvar(fresh(cx, here, 'res', 'type', { nodeType: here.path }));
const Unit = base('Unit');
const Text = base('Text');

// `⟨p, inst j⟩` per parameter of effect `e`, at `Slot p j`. An effect's
// parameters are types (resolved EffectInfo has no sorts; R009).
const effectNaming = (cx, here, effect) => {
  const made = cx.program.effects[effect].parameters.map((name, index) =>
    fresh(cx, here, { inst: index }, 'type', { slot: [here.path, index] }));
  return index => made[index];
};

// E17: `θ(⟦T̄ → result⟧)` for a reference; a perform has `eq τ_{e_k}
// θ(⟦T_k⟧)` per argument up to `n` and is typed as E5 types a call
// (Task 4.3's amendment): `θ(⟦result⟧)`, the arrow of the rest, or with
// more arguments `⟨p, res⟩` and `eq θ(⟦result⟧) (τ_{e_{n+1}} → … →
// ⟨p, res⟩)` (B1); `Outside EffectArgument` when `e` has parameters.
const operation = (cx, e, path, env, args) => {
  const here = site(path, 'E17', e.value0);
  const naming = effectNaming(cx, here, e.value1);
  const op = cx.program.effects[e.value1].operations[e.value2];
  const marks = [];
  const params = op.parameters.map(parameter =>
    translate(cx.program, parameter.ty, naming, marks));
  const result = translate(cx.program, op.result, naming, marks);
  const types = (args ?? []).map((argument, index) => cx.expr(cx, argument,
    at(path, 'Perform', 'args', index), env));
  types.forEach((type, index) => {
    if (index < params.length) emit(cx, here, 'b', 'B1',
      eq(type, params[index]));
  });
  const type = args ? performed(cx, here, params, result, types)
    : arrow(params, result);
  if (cx.program.effects[e.value1].parameters.length > 0)
    emit(cx, here, 'outside', 'O2', 'EffectArgument');
  flush(cx, here, marks, 'inst');
  return type;
};

const performed = (cx, here, params, result, types) => {
  if (types.length <= params.length)
    return arrow(params.slice(types.length), result);
  const res = tvar(fresh(cx, here, 'res', 'type', { nodeType: here.path }));
  emit(cx, here, 'b', 'B1', eq(result, arrow(types.slice(params.length),
    res)));
  return res;
};

// E18: a builtin reference `π → Unit | Text | ⟨p, res⟩`, `π = ⟨p, param 0⟩`,
// with `pr π`.
const builtinRef = result => (cx, e, path) => {
  const here = site(path, 'E18', e.value0);
  const pi = tvar(fresh(cx, here, { param: 0 }, 'type',
    { paramType: [path, 0] }));
  const out = result ?? tvar(fresh(cx, here, 'res', 'type',
    { lambdaBody: path }));
  emit(cx, here, 'bq', 'C1', { pr: pi });
  return arrow([pi], out);
};

// E19: with one argument, `pr τ_e`; otherwise the arguments' entries only.
const builtin = (name, result) => (cx, e, path, env) => {
  const here = site(path, 'E19', e.value0);
  const out = result ?? res(cx, here);
  const types = e.value1.map((argument, index) =>
    cx.expr(cx, argument, at(path, name, 'args', index), env));
  if (types.length === 1) emit(cx, here, 'bq', 'C1', { pr: types[0] });
  return out;
};

// E20: `app (Handler e) [⟨p, inst j⟩]`, `Outside HandlerType`; each
// clause's parameters at θ of their declared types.
const handler = (cx, e, path, env) => {
  const here = site(path, 'E20', e.value0);
  const label = e.value1;
  if (!(label.value0 instanceof Row.UserEffect))
    throw new Error('r0-translator: a handler of a builtin effect');
  const effect = label.value0.value0;
  const naming = effectNaming(cx, here, effect);
  const args = cx.program.effects[effect].parameters.map((name, index) =>
    tvar(naming(index)));
  emit(cx, here, 'outside', 'O3', 'HandlerType');
  const marks = [];
  e.value2.forEach((clause, index) => {
    const inner = new Map(env);
    clause.parameters.forEach(parameter => {
      const type = translate(cx.program, parameter.ty, naming, marks);
      if (parameter.local instanceof Maybe.Just)
        inner.set(parameter.local.value0, type);
    });
    cx.expr(cx, clause.body, at(path, 'Handler', 'clauses', index, 'body'),
      inner);
  });
  flush(cx, here, marks, 'inst');
  return { app: { head: { handler: effect }, args } };
};

// E21: children only, `Outside HandlerType`.
const withHandler = (cx, e, path, env) => {
  const here = site(path, 'E21', e.value0);
  const result = res(cx, here);
  cx.expr(cx, e.value1, at(path, 'With', 'handler'), env);
  cx.expr(cx, e.value2, at(path, 'With', 'body'), env);
  emit(cx, here, 'outside', 'O3', 'HandlerType');
  return result;
};

// E22: `Outside FailFamily`, `eq τ_body ⟨p, res⟩`, `eq τ_clause ⟨p, res⟩`;
// clause locals at the label's payload type (⟦·⟧ν_f).
const handle = (cx, e, path, env) => {
  const here = site(path, 'E22', e.value0);
  const result = res(cx, here);
  const body = cx.expr(cx, e.value1, at(path, 'Handle', 'body'), env);
  emit(cx, here, 'outside', 'O4', 'FailFamily');
  emit(cx, here, 'b', 'B1', eq(body, result));
  const marks = [];
  e.value2.forEach((clause, index) => {
    const inner = new Map(env);
    const payload = clause.label.value1;
    if (clause.local instanceof Maybe.Just && payload.length === 1)
      inner.set(clause.local.value0,
        translate(cx.program, payload[0], cx.rigidNaming, marks));
    emit(cx, here, 'b', 'B1', eq(cx.expr(cx, clause.body,
      at(path, 'Handle', 'clauses', index, 'body'), inner), result));
  });
  flush(cx, here, marks, 'types');
  return result;
};

const plain = type => !type || typeof type !== 'object' ? true
  : !('record' in type) && !('tvar' in type)
    && Object.values(type).every(plain);

// E23: `eq τ_e ⟦family⟧` when written; `Outside FailFamily` unless the
// written family has no record and no variable.
const failure = (cx, e, path, env) => {
  const here = site(path, 'E23', e.value0);
  const result = res(cx, here);
  const payload = cx.expr(cx, e.value2, at(path, 'Fail', 'payload'), env);
  const marks = [];
  const family = e.value1 instanceof Maybe.Just
    ? translate(cx.program, e.value1.value0, cx.rigidNaming, marks) : null;
  if (family) emit(cx, here, 'b', 'B1', eq(payload, family));
  if (!family || !plain(family))
    emit(cx, here, 'outside', 'O4', 'FailFamily');
  flush(cx, here, marks, 'types');
  return result;
};

export const effectRules = [
  [R.OperationRef, (cx, e, path, env) => operation(cx, e, path, env, null)],
  [R.Perform, (cx, e, path, env) => operation(cx, e, path, env, e.value3)],
  [R.PrintRef, builtinRef(Unit)], [R.ShowRef, builtinRef(Text)],
  [R.CrashRef, builtinRef(null)],
  [R.Print, builtin('Print', Unit)], [R.Show, builtin('Show', Text)],
  [R.Crash, builtin('Crash', null)],
  [R.Handler, handler], [R.With, withHandler], [R.Handle, handle],
  [R.Fail, failure]
];
