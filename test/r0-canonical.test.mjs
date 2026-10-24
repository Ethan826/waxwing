import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalOf, compareVar, encodeProblem, entryMultiset,
  outOfOrder, stableStringify } from './r0-canonical.mjs';

// The canonical serialization (ruling R9; Task 3.3 step 1): problems
// built as generation builds them (Domain.Recorded.Internal, as
// test/r0-recorded.test.mjs does), decoded through `fields`.
const load = name => import(`../output/${name}/index.js`);
const Internal = await load('Domain.Recorded.Internal');
const A = await load('Domain.Recorded.Atom');
const O = await load('Domain.Recorded.Origin');
const Maps = await load('Data.Map.Internal');
const Foldable = await load('Data.Foldable');
const Tuple = await load('Data.Tuple');
const Maybe = await load('Data.Maybe');
const Row = await load('Domain.Row');
const Sets = await load('Data.Set');
const { ordInt } = await load('Data.Ord');
const setOf = items => items.reduce((made, item) =>
  Sets.insert(ordInt)(item)(made), Sets.empty);

const mapOf = (ord, pairs) => Maps.fromFoldable(ord)(Foldable.foldableArray)(
  pairs.map(([key, value]) => Tuple.Tuple.create(key)(value)));
const point = { offset: 0, line: 1, column: 1 };
const span = { start: point, end: point };
const path = (root, steps) => O.Path({ root, steps });
const body = path(O.InBody.value, []);
const deep = path(O.InBody.value, [O.Named.create('Call'),
  O.Named.create('args'), O.Index.create(2)]);
const roots = [O.InBody, O.InConstraints, O.InParameters, O.InResult,
  O.InJoined].map(root => path(root.value, [O.Index.create(0)]));
const roles = [A.Inst.create(1), A.Res.value, A.Param.create(0),
  A.Field.create('a'), A.Rest.value, A.Upd.create('b'),
  A.UpdRest.create('b'), A.Spread.create(1)];
const fresh = (at, role) => A.FreshVar.create(at)(role);
const rigid = A.RigidVar.create;
const bases = [A.IntBase.value, A.BoolBase.value, A.TextBase.value,
  A.UnitBase.value, A.DataBase.create(3)].map(A.Base.create);
const arrow = (from, to) => A.Arrow.create(from)(to);
const origin = (rule, row, kind, index) => ({ atom: { decl: 7, path: deep,
  index }, rule, row, span, kind });
const entry = (value, rule = O.ExprRule.create(5), index = 0,
  group = O.RowF.value, kind = O.Body.value) => ({
  origin: origin(rule, O.SpecRow.create(group)(1), kind, index), value });

// Every RowGroup and OriginKind, injected one per `outside` entry.
const groups = ['A', 'B', 'C', 'D', 'F', 'H', 'O']
  .map(letter => O[`Row${letter}`].value);
const kinds = [O.Contract, O.Types, O.Body, O.InstOrigin]
  .map(kind => kind.value);
const sorts = [A.SortType.value, A.SortRow.value];

const varsOf = pairs => mapOf(A.ordVar, pairs.map(([key, role, position],
  at) => [key, { sort: sorts[at % 2], quant: role ? A.Exists.value
    : A.Forall.create(0), origin: { path: body, rule: O.SigRule.create(1),
    role: role ? Maybe.Just.create(role) : Maybe.Nothing.value, span },
  position }]));

const positions = [A.RigidName.create(0), A.Slot.create(deep)(1),
  A.NodeType.create(deep), A.ParamType.create(deep)(0),
  A.LambdaBody.create(deep), A.PatternType.create(deep),
  A.RestType.create(deep), A.Auxiliary.value];

const problem = changes => Internal.RecordedProblem({
  decl: 7, rigidTy: [], rigidRow: [rigid(0)],
  flexTy: [fresh(body, A.Res.value)], flexRow: [],
  d: [entry(A.Lacks.create(rigid(0))('a'), O.SigRule.create(4))],
  q: [],
  b: [entry(A.Equal.create(arrow(bases[0], arrow(bases[1], bases[4])))(
    A.Record.create([Tuple.Tuple.create('a')(bases[2])])(
      [fresh(deep, roles[7])]))),
  entry(A.Disjoint.create(rigid(0))(rigid(1)), O.PatternRule.create(6), 1),
  entry(A.Ff.value, O.SigRule.create(3), 2),
  entry(A.Equal.create(A.App.create(A.DataHead.create(2))([bases[3]]))(
    A.App.create(A.HandlerHead.create(Row.UserEffect.create(0)))(
      [A.TVar.create(rigid(1))])))],
  bq: [entry(A.Printable.create(bases[0])),
    entry(A.Comparable.create(bases[1]))],
  outside: ['EffectArgument', 'DataOverRecords', 'DataApplication',
    'HandlerType', 'FailFamily', 'Deferred', 'LocalGeneralization']
    .map((name, at) => entry(A[name].value, O.ExprRule.create(16), at,
      groups[at], kinds[at % 4])),
  adm: [entry({ callee: A.CalleeFunction.create(1), slots: [rigid(0)] })],
  split: [entry({ callee: A.CalleeCtor.create(2), slots: [] })],
  vars: varsOf([[rigid(0), null, positions[0]],
    ...positions.slice(1).map((position, at) =>
      [fresh(deep, roles[at]), roles[at], position])]),
  types: mapOf(O.ordPath, roots.map(at => [at, bases[0]])),
  holders: { declared: setOf([3, 1, 2]), holding: setOf([2]) },
  ...changes
});

test('every constructor decodes to its canonical form', () => {
  const found = canonicalOf(problem({}));
  assert.deepEqual(found.holders, { declared: [1, 2, 3], holding: [2] });
  const call = { root: 'body', steps: ['Call', 'args', 2] };
  assert.deepEqual(found.b[0].value, { eq: [
    { fun: { params: [{ base: 'Int' }, { base: 'Bool' }],
      result: { base: { data: 3 } } } },
    { record: { fields: [['a', { base: 'Text' }]],
      tails: [{ fresh: { path: call, role: { spread: 1 } } }] } }] });
  assert.deepEqual(found.b.slice(1).map(item => item.value), [
    { disjoint: [{ rigid: 0 }, { rigid: 1 }] }, 'ff',
    { eq: [{ app: { head: { data: 2 }, args: [{ base: 'Unit' }] } },
      { app: { head: { handler: 0 }, args: [{ tvar: { rigid: 1 } }] } }] }]);
  assert.deepEqual(found.b.map(item => item.origin.rule),
    ['E5', 'P6', 'Sig3', 'E5']);
  assert.deepEqual(found.d[0].origin, { atom: { decl: 7, path: call,
    index: 0 }, rule: 'Sig4', row: 'F1', span, kind: 'body' });
  assert.deepEqual(found.bq.map(item => item.value),
    [{ pr: { base: 'Int' } }, { cmp: { base: 'Bool' } }]);
  assert.deepEqual(found.outside.map(item => [item.value, item.origin.row,
    item.origin.kind]), [['EffectArgument', 'A1', 'contract'],
    ['DataOverRecords', 'B1', 'types'], ['DataApplication', 'C1', 'body'],
    ['HandlerType', 'D1', 'inst'], ['FailFamily', 'F1', 'contract'],
    ['Deferred', 'H1', 'types'], ['LocalGeneralization', 'O1', 'body']]);
  assert.deepEqual(found.vars.map(([, info]) => info.sort).slice(0, 2),
    ['type', 'row']);
  assert.deepEqual([found.adm[0].value, found.split[0].value], [
    { callee: { function: 1 }, slots: [{ rigid: 0 }] },
    { callee: { ctor: 2 }, slots: [] }]);
  assert.deepEqual(found.vars.map(([, info]) => info.position), [
    { rigidName: 0 }, { slot: [call, 1] }, { nodeType: call },
    { paramType: [call, 0] }, { lambdaBody: call }, { patternType: call },
    { restType: call }, 'auxiliary']);
  assert.deepEqual(found.vars.map(([key]) => key.fresh?.role ?? null), [
    null, { inst: 1 }, 'res', { param: 0 }, { field: 'a' }, 'rest',
    { upd: 'b' }, { updrest: 'b' }]);
  assert.deepEqual(found.types.map(([at]) => at.root),
    ['body', 'constraints', 'parameters', 'result', 'joined']);
});

// Task 3.2: a handler head names its effect by reference, so a builtin
// effect's handler type (`Handler(Console)`) has one, decoded by name.
// D1's site for a handler clause's parameter type (Task 7.1b) decodes
// like every other position, though no generated variable stores it.
test('ClauseParamType decodes to its canonical form', () => {
  const site = A.ClauseParamType.create(deep)(0)(1);
  const found = canonicalOf(problem(
    { vars: varsOf([[rigid(0), null, site]]) }));
  assert.deepEqual(found.vars[0][1].position, { clauseParamType: [
    { root: 'body', steps: ['Call', 'args', 2] }, 0, 1] });
});

test('builtin effects head a handler type by name', () => {
  const headed = ref => canonicalOf(problem({ types: mapOf(O.ordPath,
    [[body, A.App.create(A.HandlerHead.create(ref))([])]]) })).types[0][1];
  assert.deepEqual([Row.ConsoleEffect.value, Row.FailEffect.value]
    .map(headed), [{ app: { head: { handler: 'Console' }, args: [] } },
    { app: { head: { handler: 'Fail' }, args: [] } }]);
});

test('compareVar is the compiled Ord Var', () => {
  const samples = [rigid(2), rigid(0), ...roles.map(role => fresh(deep, role)),
    ...roles.map(role => fresh(body, role)), fresh(roots[4], A.Res.value),
    fresh(roots[1], A.Rest.value), fresh(path(O.InBody.value,
      [O.Index.create(0)]), A.Res.value), fresh(deep, A.Field.create('b')),
    fresh(deep, A.Inst.create(0)), fresh(deep, A.Spread.create(2))];
  const compiled = [...samples].sort((a, b) =>
    A.ordVar.compare(a)(b).constructor.name === 'LT' ? -1
      : A.ordVar.compare(a)(b).constructor.name === 'GT' ? 1 : 0);
  const decoded = sample => canonicalOf(problem({ flexTy: [sample] }))
    .flexTy[0];
  assert.deepEqual(samples.map(decoded).sort(compareVar),
    compiled.map(decoded));
});

test('encodeProblem: sorted keys, equal problems equal bytes', () => {
  const text = encodeProblem(problem({}));
  assert.equal(text, encodeProblem(problem({})));
  assert.notEqual(text, encodeProblem(problem({ decl: 8 })));
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }),
    '{"a":{"c":3,"d":2},"b":1}');
});

test('an 80,000-arrow spine decodes without overflow', () => {
  let type = A.Base.create(A.IntBase.value);
  for (let index = 0; index < 80000; index += 1) type = arrow(bases[1], type);
  const found = canonicalOf(problem({ types: mapOf(O.ordPath,
    [[body, type]]) }));
  assert.equal(found.types[0][1].fun.params.length, 80000);
});

test('outOfOrder finds unsorted fields and tails; multisets ignore order',
  () => {
  const canonical = canonicalOf(problem({}));
  assert.deepEqual(outOfOrder(canonical), []);
  const unsorted = { ...canonical, b: [{ ...canonical.b[0], value: { eq: [
    { record: { fields: [['b', 1], ['a', 1]], tails: [] } },
    { record: { fields: [], tails: [{ fresh: {} }, { rigid: 0 }] } }] } }] };
  assert.equal(outOfOrder(unsorted).length, 2);
  const repeated = { ...canonical, b: [{ ...canonical.b[0], value: { eq: [
    { record: { fields: [['a', 1], ['a', 1]], tails: [] } },
    { record: { fields: [], tails: [] } }] } }] };
  assert.equal(outOfOrder(repeated).length, 1);
  const reversed = { ...canonical, b: [...canonical.b].reverse() };
  assert.deepEqual(entryMultiset(reversed), entryMultiset(canonical));
});

test('a value of no known constructor throws', () => {
  assert.throws(() => canonicalOf(problem({ outside: [entry('Coverage')] })),
    /not a OutsideKind/);
});
