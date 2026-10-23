// Decoding a compiled recorded problem into test/r0-canonical.mjs's
// canonical data, through Domain.Recorded's read-only `fields` (ruling
// R4). Every constructor has its own arm; an unknown value throws, so a
// constructor added to Domain.Recorded.Atom or .Origin fails here loudly
// instead of being encoded as something else.
const load = name => import(`../output/${name}/index.js`);
const Recorded = await load('Domain.Recorded');
const A = await load('Domain.Recorded.Atom');
const O = await load('Domain.Recorded.Origin');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');
const Maybe = await load('Data.Maybe');
const Row = await load('Domain.Row');
const Sets = await load('Data.Set');

const pairsOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
// A set of type ids, ascending (a `TypeId` is a newtype of Int).
const idsOf = set => Sets.toUnfoldable(Unfoldable.unfoldableArray)(set);

// [class, decode] pairs, tried in order; `kind` names the type for the
// error.
const by = (kind, arms) => value => {
  for (const [shape, decode] of arms)
    if (value instanceof shape) return decode(value);
  throw new Error(`r0-canonical: not a ${kind}: ${String(value)}`);
};
const constant = name => () => name;

const roots = [[O.InBody, 'body'], [O.InConstraints, 'constraints'],
  [O.InParameters, 'parameters'], [O.InResult, 'result'],
  [O.InJoined, 'joined']];
const root = by('PathRoot', roots.map(([shape, name]) =>
  [shape, constant(name)]));
const step = by('Step', [[O.Named, s => s.value0], [O.Index, s => s.value0]]);
// Path is a newtype: erased to its record.
const path = found => ({ root: root(found.root),
  steps: found.steps.map(step) });

const role = by('Role', [
  [A.Inst, r => ({ inst: r.value0 })], [A.Res, constant('res')],
  [A.Param, r => ({ param: r.value0 })],
  [A.Field, r => ({ field: r.value0 })], [A.Rest, constant('rest')],
  [A.Upd, r => ({ upd: r.value0 })],
  [A.UpdRest, r => ({ updrest: r.value0 })],
  [A.Spread, r => ({ spread: r.value0 })]]);

const variable = by('Var', [
  [A.RigidVar, v => ({ rigid: v.value0 })],
  [A.FreshVar, v => ({ fresh: { path: path(v.value0), role: role(v.value1) } })]
]);

const base = by('Base', [[A.IntBase, constant('Int')],
  [A.BoolBase, constant('Bool')], [A.TextBase, constant('Text')],
  [A.UnitBase, constant('Unit')], [A.DataBase, b => ({ data: b.value0 })]]);
// A handler head's effect: a declared one by its id, a builtin by name.
const effect = by('EffectRef', [[Row.UserEffect, e => e.value0],
  [Row.ConsoleEffect, constant('Console')],
  [Row.FailEffect, constant('Fail')]]);
const head = by('Head', [[A.DataHead, h => ({ data: h.value0 })],
  [A.HandlerHead, h => ({ handler: effect(h.value0) })]]);

// An arrow spine by a loop: an 80,000-parameter spine must not recurse.
const spine = arrow => {
  const params = [];
  let rest = arrow;
  while (rest instanceof A.Arrow) {
    params.push(rtexpr(rest.value0));
    rest = rest.value1;
  }
  return { fun: { params, result: rtexpr(rest) } };
};

const rtexpr = by('RTExpr', [
  [A.Base, t => ({ base: base(t.value0) })], [A.Arrow, spine],
  [A.TVar, t => ({ tvar: variable(t.value0) })],
  [A.Record, t => ({ record: {
    fields: t.value0.map(pair => [pair.value0, rtexpr(pair.value1)]),
    tails: t.value1.map(variable) } })],
  [A.App, t => ({ app: { head: head(t.value0),
    args: t.value1.map(rtexpr) } })]]);

const atom = by('Atom', [
  [A.Equal, a => ({ eq: [rtexpr(a.value0), rtexpr(a.value1)] })],
  [A.Lacks, a => ({ lacks: [variable(a.value0), a.value1] })],
  [A.Disjoint, a => ({ disjoint: [variable(a.value0), variable(a.value1)] })],
  [A.Ff, constant('ff')]]);
const requirement = by('ReqAtom', [
  [A.Printable, a => ({ pr: rtexpr(a.value0) })],
  [A.Comparable, a => ({ cmp: rtexpr(a.value0) })]]);
const outsideNames = ['EffectArgument', 'DataOverRecords',
  'DataApplication', 'HandlerType', 'FailFamily', 'Deferred',
  'LocalGeneralization'];
const outside = by('OutsideKind', outsideNames.map(name =>
  [A[name], constant(name)]));
const callee = by('Callee', [
  [A.CalleeFunction, c => ({ function: c.value0 })],
  [A.CalleeCtor, c => ({ ctor: c.value0 })]]);
const site = found => ({ callee: callee(found.callee),
  slots: found.slots.map(variable) });

const rule = by('RuleId', [[O.SigRule, r => `Sig${r.value0}`],
  [O.ExprRule, r => `E${r.value0}`], [O.PatternRule, r => `P${r.value0}`]]);
const groups = by('RowGroup', ['A', 'B', 'C', 'D', 'F', 'H', 'O']
  .map(letter => [O[`Row${letter}`], constant(letter)]));
const row = found => `${groups(found.value0)}${found.value1}`;
const kind = by('OriginKind', [[O.Contract, constant('contract')],
  [O.Types, constant('types')], [O.Body, constant('body')],
  [O.InstOrigin, constant('inst')]]);
const span = found => ({ start: { ...found.start }, end: { ...found.end } });
const origin = found => ({
  atom: { decl: found.atom.decl, path: path(found.atom.path),
    index: found.atom.index },
  rule: rule(found.rule), row: row(found.row), span: span(found.span),
  kind: kind(found.kind) });
const entries = value => list => list.map(entry =>
  ({ origin: origin(entry.origin), value: value(entry.value) }));

const position = by('CheckedName', [
  [A.RigidName, p => ({ rigidName: p.value0 })],
  [A.Slot, p => ({ slot: [path(p.value0), p.value1] })],
  [A.NodeType, p => ({ nodeType: path(p.value0) })],
  [A.ParamType, p => ({ paramType: [path(p.value0), p.value1] })],
  [A.LambdaBody, p => ({ lambdaBody: path(p.value0) })],
  [A.PatternType, p => ({ patternType: path(p.value0) })],
  [A.RestType, p => ({ restType: path(p.value0) })],
  [A.Auxiliary, constant('auxiliary')]]);
const sort = by('VarSort', [[A.SortType, constant('type')],
  [A.SortRow, constant('row')]]);
const quant = by('Quant', [[A.Forall, q => ({ forall: q.value0 })],
  [A.Exists, constant('exists')]]);
const maybeRole = by('Maybe Role', [[Maybe.Just, m => role(m.value0)],
  [Maybe.Nothing, () => null]]);
const info = found => ({ sort: sort(found.sort), quant: quant(found.quant),
  origin: { path: path(found.origin.path), role: maybeRole(found.origin.role),
    rule: rule(found.origin.rule), span: span(found.origin.span) },
  position: position(found.position) });

export const canonicalOf = problem => {
  const found = Recorded.fields(problem);
  return {
    decl: found.decl,
    rigidTy: found.rigidTy.map(variable),
    rigidRow: found.rigidRow.map(variable),
    flexTy: found.flexTy.map(variable), flexRow: found.flexRow.map(variable),
    d: entries(atom)(found.d), q: entries(requirement)(found.q),
    b: entries(atom)(found.b), bq: entries(requirement)(found.bq),
    outside: entries(outside)(found.outside),
    adm: entries(site)(found.adm), split: entries(site)(found.split),
    vars: pairsOf(found.vars).map(([key, value]) =>
      [variable(key), info(value)]),
    types: pairsOf(found.types).map(([key, value]) =>
      [path(key), rtexpr(value)]),
    holders: { declared: idsOf(found.holders.declared),
      holding: idsOf(found.holders.holding) }
  };
};
