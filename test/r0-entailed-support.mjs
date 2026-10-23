// Support for Task 4.2's `entailedGround` tests
// (docs/plans/r0-entailed-ground.md §6): recorded types and problems
// built directly, the grammar G-EG with its pinned sampler, and a
// ground evaluator over the note's bounded value domain. A problem is
// a `RecordedProblem` newtype, so its compiled form is its fields.
// `supportFrom` takes a loader, so a regression probe can load the
// clone's output.
export const supportFrom = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Origin = await load('Domain.Recorded.Origin');
  const Map = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { Just } = await load('Data.Maybe');
  const at = index => ({ root: Origin.InBody.value,
    steps: [new Origin.Index(index)] });
  const flexible = (index, sort) => ({ sort,
    variable: new Atom.FreshVar(at(index), new Atom.Param(index)) });
  const rigid = (id, sort) => ({ sort, variable: new Atom.RigidVar(id) });
  const type = Atom.SortType.value;
  const row = Atom.SortRow.value;
  const vars = { x: flexible(0, type), y: flexible(1, type),
    r: flexible(2, row), s: flexible(3, row), p: rigid(100, type),
    q: rigid(101, row) };
  const v = name => vars[name].variable;
  const bases = { Int: Atom.IntBase.value, Bool: Atom.BoolBase.value };
  const box = new Atom.DataHead(7);
  const t = {
    base: name => new Atom.Base(bases[name]),
    tvar: name => new Atom.TVar(v(name)),
    arrow: (one, other) => new Atom.Arrow(one, other),
    box: argument => new Atom.App(box, [argument]),
    record: (fields, tails = []) => new Atom.Record(
      fields.map(([label, value]) => new Tuple(label, value)),
      tails.map(v))
  };
  const origin = index => ({ atom: { decl: 0, path: at(0), index },
    rule: new Origin.ExprRule(1), row: new Origin.SpecRow(
      Origin.RowB.value, 1), span: { start: 0, end: 0 },
    kind: Origin.Body.value });
  const info = ({ sort, variable }) => ({ sort,
    quant: variable instanceof Atom.RigidVar
      ? new Atom.Forall(variable.value0) : Atom.Exists.value,
    origin: { path: at(0), role: new Just(Atom.Rest.value),
      rule: new Origin.ExprRule(1), span: { start: 0, end: 0 } },
    position: Atom.Auxiliary.value });
  const varMap = Object.values(vars).reduce((made, entry) =>
    Map.insert(Atom.ordVar)(entry.variable)(info(entry))(made),
  Map.empty);
  const entries = values => values.map((value, index) =>
    ({ origin: origin(index), value }));
  // `equations` as [left, right] pairs, then `b`'s other atoms; `bq`
  // as ReqAtoms.
  const problemOf = ({ equations = [], b = [], d = [], bq = [] }) => ({
    decl: 0, rigidTy: [v('p')], rigidRow: [v('q')],
    flexTy: [v('x'), v('y')], flexRow: [v('r'), v('s')],
    d: entries(d), q: [], b: entries([...equations.map(([one, other]) =>
      new Atom.Equal(one, other)), ...b]), bq: entries(bq), outside: [],
    adm: [], split: [], vars: varMap, types: Map.empty });
  const pr = ty => new Atom.Printable(ty);
  return { Atom, t, v, vars, problemOf, pr, entries };
};

// G-EG's terms in the note's order: leaves; arrows (outer leaf first);
// `Box(l)`; records (field option outer, tails inner).
export const grammarTerms = t => {
  const leaves = [t.base('Int'), t.base('Bool'), t.tvar('x'), t.tvar('y'),
    t.tvar('p')];
  const arrows = leaves.flatMap(one => leaves.map(other =>
    t.arrow(one, other)));
  const fields = [[], ...['a', 'b'].flatMap(label => leaves.map(leaf =>
    [[label, leaf]]))];
  const tails = [[], ['r'], ['s'], ['q'], ['r', 's']];
  const records = fields.flatMap(field => tails.map(tail =>
    t.record(field, tail)));
  return [...leaves, ...arrows, ...leaves.map(t.box), ...records];
};

// mulberry32, as pinned in the note (§6).
export const mulberry32 = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
};

// 2,000 two-equation problems, with replacement, indices drawn in the
// order t₁, u₁, t₂, u₂.
export const sampled = (terms, count = 2000, seed = 1) => {
  const next = mulberry32(seed);
  const draw = () => terms[Math.floor(terms.length * next())];
  return Array.from({ length: count }, () => {
    const one = [draw(), draw()];
    return [one, [draw(), draw()]];
  });
};
