// Where today's live checker holds a value for a recorded effect
// table entry (Task 1, Step 2): every recorded table is laid over its
// live counterpart, when it has one, with match.mjs. The live side is
// the raw settled body (live.mjs), the checked declaration's
// signature and row, and `State.restricted`'s clause entries and
// installations, all in one meta namespace. Research only.
import { load } from '../../test/r0-generate-support.mjs';
import { matcher } from './match.mjs';
import { named, pairs } from './shape.mjs';

const { fields } = await load('Domain.Recorded');
const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
const Scheme = await load('Features.Check.Scheme');
const Type = await load('Domain.Type.Core');
const Row = await load('Domain.Row');
const { Just } = await load('Data.Maybe');
const E = await load('Domain.Recorded.Effect');

const stepText = step => String(step.value0);
const spanKey = span => `${span.start.offset}-${span.end.offset}`;

const nodeAt = (raw, steps) => {
  const found = Walk.nodeAt(new Walk.AtExpr(raw))(steps);
  return named(found) === 'Just' ? found.value0 : null;
};
const exprOf = node => (node instanceof Walk.AtExpr ? node.value0.value0
  : null);
const typeOf = node => (node instanceof Walk.AtExpr ? node.value0.value0.ty
  : node.value0.value0.ty);
const kindOf = node => (exprOf(node) === null ? 'pattern'
  : named(exprOf(node).node));

// A raw row of `State` resolved through the final substitution.
const resolvedRow = (subst, row) => Scheme.resolved(subst)(
  new Type.TFun(Type.TUnit.value, row, Type.TUnit.value)).value1;

// The row of a lambda's body: its arrow's row after its parameters.
const lambdaRow = expr => {
  let ty = expr.ty;
  for (let i = 1; i < expr.node.value0.length; i += 1) ty = ty.value2;
  return named(ty) === 'TFun' ? ty.value1 : null;
};

const ends = (steps, names) => steps.length >= names.length && names.every(
  (name, i) => stepText(steps[steps.length - names.length + i]) === name);

export const factsOf = item => {
  const effects = fields(item.problem).effects;
  const { checked, state, raw } = item.live;
  const store = state.subst.marks;
  const seen = [];
  const over = where => matcher(store, seen, where);
  const restricted = state.restricted;
  const entries = pairs(restricted.clauses).map(([, entry]) => entry);
  const installs = pairs(restricted.installations).map(([, each]) => each);
  // Literal and `with` paths by span, from the recorded node paths.
  const bySpan = new Map();
  for (const [path] of pairs(effects.nodes)) {
    const node = nodeAt(raw, path.steps);
    if (node !== null && ['Handler', 'With'].includes(kindOf(node)))
      bySpan.set(`${kindOf(node)} ${spanKey(exprOf(node).span)}`, path);
  }
  for (const [path, ty] of pairs(effects.nodes)) {
    const node = nodeAt(raw, path.steps);
    if (node === null) seen.push({ kind: 'miss', why: 'no node',
      where: 'node' });
    else over(`node ${kindOf(node)}`).type(ty, typeOf(node));
  }
  for (const [path, row] of pairs(effects.ambient))
    ambient(item, path, row, over, { raw, entries, installs, state });
  for (const [path, ty] of pairs(effects.annotations)) {
    const lambda = exprOf(nodeAt(raw, path.steps.slice(0, -3)) ?? {});
    const index = path.steps[path.steps.length - 1].value0;
    if (lambda === null) seen.push({ kind: 'miss', why: 'no lambda',
      where: 'annotation' });
    else over('annotation param').type(ty, lambda.node.value0[index].ty);
  }
  for (const [path, sig] of pairs(effects.instances))
    instance(nodeAt(raw, path.steps), sig, over);
  const own = effects.signature;
  const sig = over('signature');
  own.parameters.forEach((ty, i) => sig.type(ty, checked.parameters[i]));
  sig.type(own.result, checked.result);
  sig.row(own.row, checked.row);
  restrictedFacts({ entries, installs, bySpan, state, over });
  return seen;
};

const ambient = (item, path, row, over, live) => {
  const steps = path.steps;
  if (steps.length === 0)
    return over('ambient root').row(row, item.live.checked.row);
  const at = count => exprOf(nodeAt(live.raw,
    steps.slice(0, steps.length - count)) ?? {});
  if (ends(steps, ['Lambda', 'body'])) {
    const found = at(2) && lambdaRow(at(2));
    return found && over('ambient lambda').row(row, found);
  }
  if (ends(steps, ['With', 'body'])) {
    const span = at(2) && spanKey(at(2).span);
    const found = live.installs.find(each => spanKey(each.span) === span);
    if (!found) return over('ambient with (none)').row(row, null);
    const current = resolvedRow(live.state.subst, found.current);
    const framed = new Row.Label(found.label.value0, found.label.value1,
      found.frame);
    return over('ambient with').row(row,
      new Row.Row([framed, ...current.value0], current.value1));
  }
  if (ends(steps, ['Defer', 'value'])) {
    const span = at(0) && spanKey(at(0).span);
    const found = live.state.deferrals.find(each =>
      spanKey(each.body.value0.span) === span);
    return over(found ? 'ambient defer' : 'ambient defer (none)').row(row,
      found ? resolvedRow(live.state.subst, found.row) : null);
  }
  if (steps.length >= 4 && ends(steps, ['body'])
    && stepText(steps[steps.length - 3]) === 'clauses') {
    const handler = at(4);
    const clause = handler?.node.value2?.[steps[steps.length - 2].value0];
    const found = clause && live.entries.find(each =>
      spanKey(each.clause) === spanKey(clause.span));
    return over(found ? 'ambient clause' : 'ambient clause (none)').row(row,
      found ? resolvedRow(live.state.subst, found.row) : null);
  }
  const named2 = steps.slice(-2).map(stepText).join('/');
  return over(`ambient ${named2} (no source)`)
    .row(row, null);
};

const instance = (node, sig, over) => {
  if (node === null) return;
  const kind = kindOf(node);
  // An over-applied call is checked as an `Apply` of the saturated call
  // to the rest (ReadBack/Walk.purs); the instance is the callee's.
  const live = kind === 'Apply' ? exprOf(node).node.value0.value0.ty
    : typeOf(node);
  if (!['FunctionRef', 'OperationRef', 'CtorRef'].includes(kind)) {
    // A call missing arguments (a pipe's left side supplies one, or a
    // partial constructor) has an arrow type; its result is at the end.
    let result = live;
    while (named(result) === 'TFun' && named(sig.result) !== 'MArrow')
      result = result.value2;
    over(`instance result at ${kind}`).type(sig.result, result);
    over(`instance row at ${kind} (no source)`).row(sig.row, null);
    for (const ty of sig.parameters)
      over(`instance parameter at ${kind} (no source)`).type(ty, null);
    return;
  }
  let ty = live;
  const each = over(`instance at ${kind}`);
  sig.parameters.forEach((parameter, i) => {
    if (named(ty) !== 'TFun') return;
    each.type(parameter, ty.value0);
    if (i < sig.parameters.length - 1) ty = ty.value2;
  });
  if (named(ty) !== 'TFun') return;
  each.row(sig.row, ty.value1);
  each.type(sig.result, ty.value2);
};

const restrictedFacts = ({ entries, installs, bySpan, state, over }) => {
  for (const entry of entries) {
    const path = bySpan.get(`Handler ${spanKey(entry.handler)}`);
    if (path === undefined) continue;
    const at = role => ({ labels: [],
      tail: Just.create(new E.EffFresh(path, role.value)) });
    const each = over('clause entry');
    each.mark(new E.At(new E.Literal(path)), entry.own);
    each.row(at(E.HandlerInference), resolvedRow(state.subst,
      entry.inference));
    each.row(at(E.HandlerClauses), resolvedRow(state.subst, entry.clauses));
  }
  for (const found of installs) {
    const path = bySpan.get(`With ${spanKey(found.span)}`);
    if (path === undefined) continue;
    over('installation frame').mark(new E.At(new E.Frame(path)),
      found.frame);
  }
};
