// Support for the hole contract's lacks/disjoint amendment tests
// (docs/plans/r0-hole-contract-amendment.md): recorded problems built
// directly, with flexible rows `x`, `y`, rigid rows `r`, `s`, and holes
// `h` (0), `k` (1) as the read-back names them (ReadBack.Type
// `holeVar`). A problem is a `RecordedProblem` newtype, so its compiled
// form is its fields. `armFrom` takes a loader, so a regression probe
// can load the clone's output.
export const armFrom = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Origin = await load('Domain.Recorded.Origin');
  const Map = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { Just } = await load('Data.Maybe');
  const Set = await load('Data.Set');
  const { ordInt } = await load('Data.Ord');
  const { holeVar } = await load('Features.Check.Strategy.ReadBack.Type');
  const Witness = await load('Features.Check.Strategy.Witness');
  const at = index => ({ root: Origin.InBody.value,
    steps: [new Origin.Index(index)] });
  const row = Atom.SortRow.value;
  const flexible = index =>
    new Atom.FreshVar(at(index), new Atom.Param(index));
  const vars = { x: flexible(0), y: flexible(1), r: new Atom.RigidVar(200),
    s: new Atom.RigidVar(201), h: holeVar(0), k: holeVar(1) };
  const v = name => vars[name];
  const info = variable => ({ sort: row,
    quant: variable instanceof Atom.RigidVar
      ? new Atom.Forall(variable.value0) : Atom.Exists.value,
    origin: { path: at(0), role: new Just(Atom.Rest.value),
      rule: new Origin.ExprRule(1), span: { start: 0, end: 0 } },
    position: Atom.Auxiliary.value });
  const varMap = ['x', 'y', 'r', 's'].reduce((made, name) =>
    Map.insert(Atom.ordVar)(v(name))(info(v(name)))(made), Map.empty);
  const int = new Atom.Base(Atom.IntBase.value);
  // A record: [label, type] fields, then tail names.
  const rec = (fields, tails = []) => new Atom.Record(
    fields.map(([label, value]) => new Tuple(label, value)), tails.map(v));
  const origin = index => ({ atom: { decl: 0, path: at(0), index },
    rule: new Origin.ExprRule(1), row: new Origin.SpecRow(
      Origin.RowB.value, 1), span: { start: 0, end: 0 },
    kind: Origin.Body.value });
  const entries = values => values.map((value, index) =>
    ({ origin: origin(index), value }));
  const problemOf = ({ b = [], d = [], bq = [] }) => ({
    decl: 0, rigidTy: [], rigidRow: [v('r'), v('s')], flexTy: [],
    flexRow: [v('x'), v('y')], d: entries(d), q: [], b: entries(b),
    bq: entries(bq), outside: [], adm: [], split: [], vars: varMap,
    types: Map.empty, holders: { declared: Set.insert(ordInt)(7)(Set.empty),
      holding: Set.empty, admitted: Set.empty, overRecords: Set.empty } });
  const lacks = (name, label) => new Atom.Lacks(v(name), label);
  const disjoint = (one, other) => new Atom.Disjoint(v(one), v(other));
  const equal = (one, other) => new Atom.Equal(one, other);
  const sigma = pairs => pairs.reduce((made, [name, image]) =>
    Map.insert(Atom.ordVar)(v(name))(image)(made), Map.empty);
  const key = variable => JSON.stringify(variable);
  // The production witness's outcome: ['Witnessed'] or [reason, name].
  const outcome = (spec, pairs) => {
    const made = Witness.substitutionWitness(problemOf(spec))(sigma(pairs));
    if (made.constructor.name === 'Witnessed') return ['Witnessed'];
    const named = Object.keys(vars).find(name =>
      key(vars[name]) === key(made.value0.value0));
    return [made.value0.constructor.name, named];
  };
  return { Atom, v, int, rec, lacks, disjoint, equal, outcome,
    holeType: index => new Atom.TVar(holeVar(index)) };
};
