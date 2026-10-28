// Support for R0 Task 7.1's D1 tests (docs/plans/
// r0-generation-continuation.md §10): builders for paths, variables,
// generator types and witnesses, and the applicative and monadic
// operations of `Elab` and `Gen`, called through the compiled
// instances. JS has no rank-2 types, so `seal` takes a `Gen` value
// directly; a handle is a newtype, so its compiled form is its `Var`,
// which is how T3a forges one. `elabFrom(load)` loads nothing itself, so
// a regression probe can build through a clone's output.
export const elabFrom = async load => {
  const m = {};
  for (const [key, name] of Object.entries({ Atom: 'Domain.Recorded.Atom',
    Origin: 'Domain.Recorded.Origin', Core: 'Domain.Type.Core',
    Row: 'Domain.Row', Open: 'Domain.Checked.Internal',
    Types: 'Domain.Elaborating.Types', Elaborating: 'Domain.Elaborating',
    Build: 'Domain.Elaborating.Build', Witness: 'Domain.Verdict.Witness',
    Internal: 'Features.Check.Generate.Elab.Internal',
    Elab: 'Features.Check.Generate.Elab', Gen: 'Features.Check.Generate.Gen',
    Map: 'Data.Map.Internal', Set: 'Data.Set', Either: 'Data.Either',
    Maybe: 'Data.Maybe', Tuple: 'Data.Tuple', Foldable: 'Data.Foldable',
    Unfoldable: 'Data.Unfoldable', Functor: 'Data.Functor',
    Apply: 'Control.Apply', Applicative: 'Control.Applicative',
    Bind: 'Control.Bind', Traversable: 'Data.Traversable',
    Out: 'Features.Check.Generate.Out',
    Effect: 'Domain.Recorded.Effect' }))
    m[key] = await load(name);
  const { Atom, Origin, Core, Row, Internal, Tuple, Maybe } = m;
  const span = { start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 2, offset: 1 } };
  const path = (...steps) => ({ root: Origin.InBody.value,
    steps: steps.map(step => (typeof step === 'number'
      ? new Origin.Index(step) : new Origin.Named(step))) });
  const fresh = (steps, role = Atom.Res.value) =>
    new Atom.FreshVar(path(...steps), role);
  const site = {
    node: steps => new Atom.NodeType(path(...steps)),
    pattern: steps => new Atom.PatternType(path(...steps)),
    slot: (steps, index) => new Atom.Slot(path(...steps), index),
    rigid: index => new Atom.RigidName(index),
    auxiliary: Atom.Auxiliary.value
  };
  const sort = { type: Atom.SortType.value, row: Atom.SortRow.value };
  const use = { type: m.Types.TypeSort.value, row: m.Types.RecordSort.value,
    effect: m.Types.EffectRowSort.value };
  const ty = {
    int: Core.TInt.value, bool: Core.TBool.value,
    flex: handle => new Core.TVar(new Internal.FlexRef(handle)),
    rigid: index => new Core.TVar(new Internal.RigidRef(index)),
    record: (fields, tails) => new Core.TRecord({
      fields: fields.map(([label, value]) => new Tuple.Tuple(label, value)),
      tails }),
    fun: (parameter, result, tail = Maybe.Nothing.value) =>
      new Core.TFun(parameter, new Row.Row([], tail), result),
    flexRef: handle => new Internal.FlexRef(handle),
    rigidRef: index => new Internal.RigidRef(index)
  };
  const elab = {
    pure: value => m.Applicative.pure(Internal.applicativeElab)(value),
    map: (change, value) => m.Functor.map(Internal.functorElab)(change)(value),
    apply: (change, value) => m.Apply.apply(Internal.applyElab)(change)(value),
    traverse: (each, items) => m.Traversable.traverse(
      m.Traversable.traversableArray)(Internal.applicativeElab)(each)(items)
  };
  const gen = {
    pure: value => m.Applicative.pure(Internal.applicativeGen)(value),
    bind: (first, next) => m.Bind.bind(Internal.bindGen)(first)(next),
    // Runs the steps in order, each given the earlier results.
    seq: (steps, last) => {
      const go = (index, done) => (index === steps.length ? last(...done)
        : gen.bind(steps[index](...done), value => go(index + 1,
          [...done, value])));
      return go(0, []);
    },
    fresh: (steps, variableSort = sort.type, role = Atom.Res.value) =>
      m.Gen.fresh({ path: path(...steps), role, sort: variableSort,
        position: new Atom.NodeType(path(...steps)),
        rule: new Origin.ExprRule(1), span }),
    positioned: (at, type) => m.Gen.positioned(at)(type),
    slots: (steps, written) => m.Gen.slots(path(...steps))(written.map(
      ([slotSort, type]) => new Tuple.Tuple(slotSort, type)))
  };
  const header = decl => ({ decl, holders: { declared: m.Set.empty,
    holding: m.Set.empty } });
  // Assembly requires one SignatureAt per declaration, so a hand-built
  // generator is followed by the unit signature's write.
  const signature = { parameters: [], row: { labels: [],
    tail: Maybe.Nothing.value }, result: new m.Effect.MBase(Atom.UnitBase
    .value) };
  const signed = generator => gen.bind(generator, value => gen.bind(
    m.Gen.effected([new m.Out.SignatureAt(path(), signature)]),
    () => gen.pure(value)));
  const sealed = (generator, decl = 0) => {
    const result = m.Elab.seal(header(decl))(signed(generator));
    if (!(result instanceof m.Either.Right))
      throw new Error(`seal: ${result.value0.constructor.name}`);
    return result.value0;
  };
  const arrayOf = foldable => m.Set.toUnfoldable(m.Unfoldable
    .unfoldableArray)(foldable);
  const witness = pairs => ({ bindings: m.Map.fromFoldable(Atom.ordVar)(
    m.Foldable.foldableArray)(pairs.map(([variable, binding]) =>
    new Tuple.Tuple(variable, binding))), names: [] });
  const inline = recorded => new m.Witness.Inline(recorded);
  const free = index => new m.Witness.Free(index);
  const base = { int: new Atom.Base(Atom.IntBase.value),
    bool: new Atom.Base(Atom.BoolBase.value) };
  const recordOf = (fields, tails = []) => new Atom.Record(fields.map(
    ([label, value]) => new Tuple.Tuple(label, value)), tails);
  const faults = elaborating => m.Elaborating.untracked(elaborating).map(
    fault => [fault.constructor.name, fault.value0 ?? null]);
  const requested = elaborating => arrayOf(m.Elaborating.requests(
    elaborating));
  return { m, span, path, fresh, site, sort, use, ty, elab, gen, header,
    sealed, arrayOf, witness, inline, free, base, recordOf, faults,
    requested, build: (e, w) => m.Build.build(e)(w) };
};
