import test from 'node:test';
import assert from 'node:assert/strict';

// Task 3.1: the recorded problem's fields (T-R0b §10, §2.3, §3.5, §5.2,
// §6), built here as generation would build one, compared by Eq and read
// through Domain.Recorded's view. Loaded from the compiled output.
const load = name => import(`../output/${name}/index.js`);
const Recorded = await load('Domain.Recorded');
const Internal = await load('Domain.Recorded.Internal');
const Atom = await load('Domain.Recorded.Atom');
const Origin = await load('Domain.Recorded.Origin');
const Effect = await load('Domain.Recorded.Effect');
const Maps = await load('Data.Map.Internal');
const Foldable = await load('Data.Foldable');
const Tuple = await load('Data.Tuple');
const Maybe = await load('Data.Maybe');
const Sets = await load('Data.Set');
const { ordInt } = await load('Data.Ord');
const setOf = items => items.reduce((made, item) =>
  Sets.insert(ordInt)(item)(made), Sets.empty);

const mapOf = (ord, pairs) => Maps.fromFoldable(ord)(Foldable.foldableArray)(
  pairs.map(([key, value]) => Tuple.Tuple.create(key)(value)));

const position = { offset: 0, line: 1, column: 1 };
const span = { start: position, end: position };
const path = steps => Origin.Path({ root: Origin.InBody.value, steps });
const body = path([]);
const argument = path([Origin.Named.create('Call'),
  Origin.Named.create('args'), Origin.Index.create(0)]);
const intType = Atom.Base.create(Atom.IntBase.value);
const res = Atom.FreshVar.create(body)(Atom.Res.value);
const origin = (rule, index) => ({ atom: { decl: 0, path: body, index },
  rule, row: Origin.SpecRow.create(Origin.RowB.value)(1), span,
  kind: Origin.Body.value });

// `f(x: Int) -> Int = if … then x else x`, abbreviated: one fresh
// result variable, its equation, one marker and one site.
const fieldsOf = () => ({
  decl: 0,
  rigidTy: [], rigidRow: [],
  flexTy: [res], flexRow: [],
  d: [], q: [],
  b: [{ origin: origin(Origin.ExprRule.create(11), 0),
    value: Atom.Equal.create(Atom.TVar.create(res))(intType) }],
  bq: [{ origin: origin(Origin.ExprRule.create(19), 0),
    value: Atom.Printable.create(intType) }],
  outside: [{ origin: origin(Origin.ExprRule.create(16), 1),
    value: Atom.Deferred.value }],
  adm: [{ origin: origin(Origin.ExprRule.create(3), 0),
    value: { callee: Atom.CalleeFunction.create(1), slots: [res] } }],
  split: [],
  vars: mapOf(Atom.ordVar, [[res, { sort: Atom.SortType.value,
    quant: Atom.Exists.value,
    origin: { path: body, role: Maybe.Just.create(Atom.Res.value),
      rule: Origin.ExprRule.create(11), span },
    position: Atom.NodeType.create(body) }]]),
  types: mapOf(Origin.ordPath, [[body, Atom.TVar.create(res)],
    [argument, intType]]),
  holders: { declared: setOf([0]), holding: setOf([]),
    admitted: setOf([]), overRecords: setOf([]) },
  effects: Effect.emptyEffects
});

const problem = changes => Internal.RecordedProblem({ ...fieldsOf(),
  ...changes });
const equal = (a, b) => Internal.eqRecordedProblem.eq(a)(b);

const names = ['decl', 'rigidTy', 'rigidRow', 'flexTy', 'flexRow', 'd',
  'q', 'b', 'bq', 'outside', 'adm', 'split', 'vars', 'types', 'holders',
  'effects'];

test('the view has exactly T-R0b §10 fields, read back unchanged', () => {
  const view = Recorded.fields(problem({}));
  assert.deepEqual(Object.keys(view).sort(), [...names].sort());
  assert.equal(view.decl, 0);
  assert.equal(view.outside[0].value, Atom.Deferred.value);
  assert.ok(Atom.eqVar.eq(view.flexTy[0])(res));
});

test('problems built alike compare equal; a change in any field does not',
  () => {
  assert.ok(equal(problem({}), problem({})));
  const other = Atom.FreshVar.create(argument)(Atom.Res.value);
  const changed = {
    decl: 1, rigidTy: [Atom.RigidVar.create(0)],
    rigidRow: [Atom.RigidVar.create(1)], flexTy: [], flexRow: [other],
    d: [{ origin: origin(Origin.SigRule.create(4), 0),
      value: Atom.Lacks.create(Atom.RigidVar.create(1))('a') }],
    q: fieldsOf().bq, b: [], bq: [], outside: [],
    adm: [], split: fieldsOf().adm,
    vars: mapOf(Atom.ordVar, []), types: mapOf(Origin.ordPath, []),
    holders: { declared: setOf([0]), holding: setOf([0]),
      admitted: setOf([]), overRecords: setOf([]) },
    effects: { ...Effect.emptyEffects, rigidMarks: ['a'] }
  };
  assert.deepEqual(Object.keys(changed).sort(), [...names].sort());
  for (const name of names)
    assert.ok(!equal(problem({}), problem({ [name]: changed[name] })), name);
});

// Equal declarations' problems must differ when only `decl` does (D1
// spec §6.2): two problems with no atoms at all.
test('decl alone distinguishes two otherwise empty problems', () => {
  const empty = { d: [], q: [], b: [], bq: [], outside: [], adm: [],
    split: [], flexTy: [], vars: mapOf(Atom.ordVar, []),
    types: mapOf(Origin.ordPath, []) };
  assert.ok(!equal(problem({ ...empty, decl: 0 }),
    problem({ ...empty, decl: 1 })));
});

// An 80,000-parameter declaration (test/fn-linear.serial.test.mjs) has a
// spine as long, and D1's `elaborate` compares problems (Task 3.1 fix
// round 1): the derived instance overflowed the stack at 20,000.
const arrows = 80000;
const spine = result => {
  let type = result;
  for (let index = 0; index < arrows; index += 1)
    type = Atom.Arrow.create(intType)(type);
  return type;
};

test('RTExpr equality walks an 80,000-arrow spine without overflow', () => {
  const textType = Atom.Base.create(Atom.TextBase.value);
  assert.ok(Atom.eqRTExpr.eq(spine(intType))(spine(intType)));
  assert.ok(!Atom.eqRTExpr.eq(spine(intType))(spine(textType)));
  assert.ok(!Atom.eqRTExpr.eq(spine(intType))(textType));
  const deep = problem({ types: mapOf(Origin.ordPath,
    [[body, spine(intType)]]) });
  assert.ok(equal(deep, problem({ types: mapOf(Origin.ordPath,
    [[body, spine(intType)]]) })));
});

// Every constructor T-R0b names, with its arity: §3.5's markers, §2.3's
// roles, §5.2's positions, §2.1's atoms and type nodes, §6's origins.
const shapes = [
  [Atom, ['EffectArgument', 0], ['DataOverRecords', 0],
    ['DataApplication', 0], ['HandlerType', 0], ['FailFamily', 0],
    ['Deferred', 0], ['LocalGeneralization', 0],
    ['Inst', 1], ['Res', 0], ['Param', 1], ['Field', 1], ['Rest', 0],
    ['Upd', 1], ['UpdRest', 1], ['Spread', 1],
    ['RigidVar', 1], ['FreshVar', 2],
    ['RigidName', 1], ['Slot', 2], ['NodeType', 1], ['ParamType', 2],
    ['LambdaBody', 1], ['PatternType', 1], ['RestType', 1],
    ['ClauseParamType', 3],
    ['Auxiliary', 0], ['SortType', 0], ['SortRow', 0], ['Forall', 1],
    ['Exists', 0], ['Equal', 2], ['Lacks', 2], ['Disjoint', 2], ['Ff', 0],
    ['Printable', 1], ['Comparable', 1], ['Base', 1], ['Arrow', 2],
    ['TVar', 1], ['Record', 2], ['App', 2], ['IntBase', 0],
    ['BoolBase', 0], ['TextBase', 0], ['UnitBase', 0], ['DataBase', 1],
    ['DataHead', 1], ['HandlerHead', 1], ['CalleeFunction', 1],
    ['CalleeCtor', 1]],
  [Origin, ['Contract', 0], ['Types', 0], ['Body', 0], ['InstOrigin', 0],
    ['InBody', 0], ['InConstraints', 0], ['InParameters', 0],
    ['InResult', 0], ['InJoined', 0], ['Named', 1], ['Index', 1],
    ['SigRule', 1], ['ExprRule', 1], ['PatternRule', 1], ['SpecRow', 2],
    ['RowA', 0], ['RowB', 0], ['RowC', 0], ['RowD', 0], ['RowF', 0],
    ['RowH', 0], ['RowO', 0]]
];

test('every constructor of T-R0b §2.1-§6 has its arity', () => {
  for (const [module, ...entries] of shapes)
    for (const [name, arity] of entries) {
      const ctor = module[name];
      assert.ok(ctor !== undefined, name);
      if (arity === 0) assert.ok('value' in ctor, name);
      else assert.equal(ctor.length, arity, name);
    }
});

// R4: Domain.Recorded reads, never builds.
test('Domain.Recorded exports the view, not the constructor', () => {
  assert.equal(typeof Recorded.fields, 'function');
  assert.ok(!('RecordedProblem' in Recorded));
});
