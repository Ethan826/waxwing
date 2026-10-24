// The eager unifier that Features.Check.Entailed.Mgu replaced (be4df16,
// Task 4.2; BACKLOG R021), ported line for line as a test oracle: each
// binding is applied to every remaining equation and to every image of
// θ, which stays idempotent. The triangular unifier must give the same
// answer (test/r0-mgu-eager.test.mjs). Recorded types and θ are the
// compiled ones; `substitute`, `mentions` and `isRigid` are the
// production functions both unifiers use. `null` is `Nothing`.
export const eagerFrom = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Origin = await load('Domain.Recorded.Origin');
  const Map = await load('Data.Map.Internal');
  const { substitute } = await load('Features.Check.Entailed.Merge');
  const { isRigid, mentions } = await load('Features.Check.Mentions');
  const eq = (one, other) => Atom.eqRTExpr.eq(one)(other);
  const just = found => (found.constructor.name === 'Just'
    ? found.value0 : null);
  const madeRow = index => new Atom.FreshVar({ root: Origin.InBody.value,
    steps: [new Origin.Named('entailed'), new Origin.Index(index)] },
  Atom.Rest.value);

  // R4 and every R5 binding: θ applied to the image, the occurs check,
  // then the binding applied to the equations and to θ's images.
  const binding = (variable, image, state) => {
    const found = just(substitute(state.theta)(image));
    if (found === null || mentions(other =>
      Atom.eqVar.eq(variable)(other))(found)) return null;
    const single = Map.singleton(variable)(found);
    const apply = ty => just(substitute(single)(ty));
    const equations = state.equations.map(([one, other]) =>
      [apply(one), apply(other)]);
    if (equations.flat().some(ty => ty === null)) return null;
    let theta = Map.mapMaybe(Atom.ordVar)(substitute(single))(
      state.theta);
    // `traverse`: one failed image fails the whole binding.
    if (Map.size(theta) !== Map.size(state.theta)) return null;
    theta = Map.insert(Atom.ordVar)(variable)(found)(theta);
    return { ...state, equations, theta };
  };
  const pushed = (added, state) =>
    ({ ...state, equations: [...added, ...state.equations] });
  const labels = fields => fields.map(field => field.value0);
  const repeats = fields => new Set(labels(fields)).size !== fields.length;
  const only = (these, others) => these.filter(field =>
    !labels(others).includes(field.value0));
  const flexible = variable => !isRigid(variable);
  const freshIndex = state => {
    let index = state.fresh;
    while (Map.member(Atom.ordVar)(madeRow(index))(state.taken)) index += 1;
    return index;
  };
  // R5's rows with two distinct tails.
  const apart = (left, right, tail, other, state) => {
    if (left.length === 0 && right.length === 0) {
      if (flexible(tail)) return binding(tail, new Atom.Record([], [other]),
        state);
      return flexible(other) ? binding(other, new Atom.Record([], [tail]),
        state) : null;
    }
    if (right.length === 0) return flexible(other)
      ? binding(other, new Atom.Record(left, [tail]), state) : null;
    if (left.length === 0) return flexible(tail)
      ? binding(tail, new Atom.Record(right, [other]), state) : null;
    if (!flexible(tail) || !flexible(other)) return null;
    const index = freshIndex(state);
    const row = madeRow(index);
    const first = binding(tail, new Atom.Record(right, [row]),
      { ...state, fresh: index + 1 });
    return first === null ? null
      : binding(other, new Atom.Record(left, [row]), first);
  };
  const tailed = (left, right, leftTails, rightTails, state) => {
    if (leftTails.length > 1 || rightTails.length > 1) return null;
    const [tail, other] = [leftTails[0], rightTails[0]];
    const none = left.length === 0 && right.length === 0;
    if (tail === undefined && other === undefined) return none ? state : null;
    if (tail === undefined) return right.length === 0 && flexible(other)
      ? binding(other, new Atom.Record(left, []), state) : null;
    if (other === undefined) return left.length === 0 && flexible(tail)
      ? binding(tail, new Atom.Record(right, []), state) : null;
    if (Atom.eqVar.eq(tail)(other)) return none ? state : null;
    return apart(left, right, tail, other, state);
  };
  // R5: common labels' equations, then the tails' row.
  const rows = (one, other, state) => {
    if (repeats(one.value0) || repeats(other.value0)) return null;
    const common = one.value0.flatMap(field => other.value0
      .filter(found => found.value0 === field.value0)
      .slice(0, 1).map(found => [field.value1, found.value1]));
    return tailed(only(one.value0, other.value0),
      only(other.value0, one.value0), one.value1, other.value1,
      pushed(common, state));
  };
  const solve = (one, other, state) => {
    if (eq(one, other)) return state;
    if (one instanceof Atom.TVar && flexible(one.value0))
      return binding(one.value0, other, state);
    if (other instanceof Atom.TVar && flexible(other.value0))
      return binding(other.value0, one, state);
    if (one instanceof Atom.Arrow && other instanceof Atom.Arrow)
      return pushed([[one.value0, other.value0], [one.value1,
        other.value1]], state);
    if (one instanceof Atom.App && other instanceof Atom.App)
      return Atom.eqHead.eq(one.value0)(other.value0)
        && one.value1.length === other.value1.length
        ? pushed(one.value1.map((argument, index) =>
          [argument, other.value1[index]]), state) : null;
    if (one instanceof Atom.Record && other instanceof Atom.Record)
      return rows(one, other, state);
    return null;
  };
  return (taken, equations) => {
    let state = { equations, theta: Map.empty, fresh: 0, taken };
    while (state !== null && state.equations.length > 0) {
      const [[one, other], ...rest] = state.equations;
      state = solve(one, other, { ...state, equations: rest });
    }
    return state === null ? null : state.theta;
  };
};
