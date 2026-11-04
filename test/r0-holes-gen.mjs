// Seeded generator of checked-IR bodies and types for the holes walk
// agreement check (dossier §18.161 (6)). The grammar and bounds were
// fixed before the first run and are written in
// docs/plans/2026-11-04-holes-numbering-findings.md: amend both
// together, and record the amendment there. Values are structural, not
// well-typed: the walks under test read no typing invariant.
// `generatorOf(M, next)` takes the compiled modules
// { Core, Row, Open, Maybe, Tuple, Syntax } and a PRNG in [0, 1).
export const bounds = { seeds: [1, 2, 3], bodies: 2000, types: 5000,
  bodyDepth: 3, bodyTypeDepth: 3, typeDepth: 4, patternDepth: 2,
  metas: 8, rigids: 3 };

const span = { start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 2, offset: 1 } };

export const generatorOf = (M, next) => {
  const int = n => Math.floor(next() * n);
  const upTo = (n, make) => Array.from({ length: int(n + 1) }, make);
  const pick = options => options[int(options.length)]();
  const hole = () => new M.Open.Hole(int(bounds.metas));
  const rigid = () => new M.Open.Rigid(int(bounds.rigids));
  const variable = () => pick([hole, rigid]);
  const nothing = M.Maybe.Nothing.value;
  const just = value => new M.Maybe.Just(value);
  // Ord Open: `Rigid` before `Hole`, then by number (derived order).
  const rank = v => (v instanceof M.Open.Rigid ? 0 : 100) + v.value0;
  const sortedTails = tails => [...tails].sort((a, b) => rank(a) - rank(b));
  const leaf = () => pick([() => M.Core.TInt.value, () => M.Core.TBool.value,
    () => M.Core.TUnit.value, () => M.Core.TText.value,
    () => new M.Core.TVar(hole()), () => new M.Core.TVar(rigid())]);
  const effect = () => pick([() => new M.Row.UserEffect(0),
    () => M.Row.FailEffect.value, () => M.Row.ConsoleEffect.value]);
  const label = d => new M.Row.Label(effect(), upTo(2, () => ty(d - 1)),
    M.Row.Unmarked.value);
  const row = d => new M.Row.Row(upTo(2, () => label(d)),
    pick([() => nothing, () => just(hole()), () => just(rigid())]));
  const data = d => new M.Core.TData(0, upTo(2, () => ty(d - 1)),
    upTo(2, () => row(d)));
  const spine = d => {
    let built = ty(d - 1);
    const count = 1 + int(3);
    for (let index = 0; index < count; index += 1)
      built = new M.Core.TFun(ty(d - 1), row(d), built);
    return built;
  };
  const handler = d => new M.Core.THandler(label(d),
    { inference: row(d), clauses: pick([() => nothing, () => just(row(d))]) });
  const record = d => {
    const labels = ['a', 'b', 'c'].filter(() => next() < 0.5);
    return new M.Core.TRecord({
      fields: labels.map(name => new M.Tuple.Tuple(name, ty(d - 1))),
      tails: sortedTails(upTo(3, variable)) });
  };
  const ty = d => d <= 0 ? leaf() : pick([leaf, () => data(d),
    () => spine(d), () => handler(d), () => record(d)]);
  const local = () => pick([() => nothing, () => just(0)]);
  const param = () => ({ local: local(), ty: ty(bounds.bodyTypeDepth) });
  const pattern = d => new M.Open.Pattern({ ty: ty(bounds.bodyTypeDepth),
    span, shape: shape(d) });
  const rest = () => pick([() => M.Open.NoRest.value,
    () => M.Open.IgnoredRest.value,
    () => new M.Open.NamedRest(0, ty(bounds.bodyTypeDepth))]);
  const shape = d => d <= 0 ? pick([() => M.Open.Wildcard.value,
    () => new M.Open.Bind(0), () => new M.Open.IntLit(0),
    () => new M.Open.BoolLit(true)])
    : pick([() => shape(0),
      () => new M.Open.Ctor(0, upTo(2, () => pattern(d - 1))),
      () => new M.Open.Record(upTo(2, () =>
        ({ label: 'a', pattern: pattern(d - 1) })), rest())]);
  const leafNodes = [() => new M.Open.Integer(1),
    () => new M.Open.Boolean(true), () => new M.Open.Local(0),
    () => M.Open.UnitValue.value, () => new M.Open.Text('t')];
  const nodes = d => {
    const e = () => expr(d - 1);
    const es = () => upTo(2, e);
    const inst = () => upTo(2, () => ty(bounds.bodyTypeDepth));
    const fields = () => upTo(2, () => ({ label: 'a', value: e() }));
    const O = M.Open;
    return [...leafNodes,
      () => new O.FunctionRef(0, inst()), () => new O.CtorRef(0, inst()),
      () => new O.Call(0, inst(), es()), () => new O.Construct(0, inst(), es()),
      () => new O.Add(e(), e()), () => new O.Concat(e(), e()),
      () => new O.Interpolate(es()),
      () => new O.Compare(M.Syntax.Equal.value, e(), e()),
      () => new O.If(e(), e(), e()),
      () => new O.Match(e(), upTo(2, () =>
        ({ pattern: pattern(bounds.patternDepth), body: e(), span }))),
      () => new O.Apply(e(), es()), () => new O.Lambda(upTo(2, param), e()),
      () => new O.Pipe(e(), e()),
      () => new O.Block(upTo(2, () => pick([() => new O.Let(local(), e()),
        () => new O.Defer(e()), () => new O.Discard(e())])), e()),
      () => new O.Print(e()), () => new O.Show(e()), () => new O.Crash(e()),
      () => new O.OperationRef(0, 0, inst()),
      () => new O.Perform(0, 0, inst(), es()),
      () => new O.Handler(0, inst(), upTo(2, () => ({ operation: 0,
        parameters: upTo(2, param), body: e(), span }))),
      () => new O.With(e(), e()),
      () => new O.Handle(e(), upTo(2, () => ({
        payload: ty(bounds.bodyTypeDepth), local: 0, body: e(), span }))),
      () => new O.Fail(e()), () => new O.RecordLiteral(fields()),
      () => new O.FieldAccess(e(), 'a'),
      () => new O.RecordUpdate(e(), fields()),
      () => new O.RecordExtension(upTo(2, () => pick([
        () => new O.Given({ label: 'a', value: e() }),
        () => new O.Spreading(e())]))),
      () => new O.RecordRemoval(e(), ['a'])];
  };
  const expr = d => new M.Open.Expr({ ty: ty(bounds.bodyTypeDepth), span,
    node: pick(d <= 0 ? leafNodes : nodes(d)) });
  return { body: () => expr(bounds.bodyDepth),
    type: () => ty(bounds.typeDepth), span };
};
