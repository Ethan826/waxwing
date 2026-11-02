// Tranche 2 Task 15: the mark forgeries of an honest package, marks only
// (dossier §18.151, §18.155; design §F). A forgery moves one term one
// covering step on the order N ⊑ J S ⊑ M over the declaration's rigid
// marks R (statements §5): up from N to J {r} (r the first of R in
// sorted order; M when R is empty), from J S to J (S + the first name of
// R not in S) or, with S = R, to M; down from M to J R (N when R is
// empty), from J S to J (S less its last name in sorted order) or N.
// The forged term is either a recorded position's `marks` entry or the
// mark of a label at the top level of a package-owned effect binding
// (`effects`); labels nested in arguments or types are not forged, nor
// Console and `Fail` labels: well-formedness fixes their marks at N
// (statements §2; the validator's `Malformed NotN`), so forging one
// tests the prerequisites, not a mark obligation.
// Nothing else changes: `marksOnly` checks that a forgery differs from
// its base in exactly one term, so a vacuous forgery (no change) or a
// row forgery (a dropped or duplicated label, a moved tail) is refused.
// Bounded: per package at most `caps.positions` positions and
// `caps.labels` binding labels, each forged up and down; when there are
// more, the i-th of k is the one at floor(i * n / k) in recorded order
// (positions) or in binding-map order, then label order (labels).
export const caps = { positions: 32, labels: 32 };
caps.rule = `at most ${caps.positions} positions and ${caps.labels
} binding labels per package, each forged one step up and one step `
  + 'down; more than the cap: the i-th of k at floor(i * n / k), in '
  + 'recorded (positions) or binding-map then label order (labels)';

const sorted = names => [...names].sort();

export const stepUp = (term, rigid) => {
  const names = sorted(rigid);
  if (term === 'M') return undefined;
  if (term === 'N') return names.length === 0 ? 'M' : [names[0]];
  const missing = names.filter(name => !term.includes(name));
  return missing.length === 0 ? 'M' : sorted([...term, missing[0]]);
};

export const stepDown = (term, rigid) => {
  if (term === 'N') return undefined;
  if (term === 'M') return rigid.length === 0 ? 'N' : sorted(rigid);
  return term.length > 1 ? sorted(term).slice(0, -1) : 'N';
};

export const sample = (items, cap) => items.length <= cap ? items
  : Array.from({ length: cap }, (_, index) =>
    items[Math.floor(index * items.length / cap)]);

export const forger = (cases, mb) => {
  const { P, J, Maps, Effect, Sets, Unfoldable } = cases;
  const array = set => Sets.toUnfoldable(Unfoldable.unfoldableArray)(set);
  // A term as plain data; `J ∅` is N (statements §5's normal form).
  const plain = term => term instanceof P.TermN ? 'N'
    : term instanceof P.TermM ? 'M' : array(term.value0).length === 0
      ? 'N' : sorted(array(term.value0));
  const toTerm = term => term === 'N' ? P.TermN.value
    : term === 'M' ? P.TermM.value : J(...term);
  const name = term => JSON.stringify(term);
  const pairs = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const steps = (term, rigid) => [['up', stepUp(term, rigid)],
    ['down', stepDown(term, rigid)]].filter(([, to]) => to !== undefined);
  const labelMark = (input, variable, index, term) => {
    const row = Maps.lookup(Effect.ordEVar)(variable)(input.effects).value0;
    const labels = row.labels.map((item, at) => at === index
      ? { ...item, mark: toTerm(term) } : item);
    return { ...input, effects: Maps.insert(Effect.ordEVar)(variable)(
      { ...row, labels })(input.effects) };
  };
  const bindingLabels = input => pairs(input.effects).flatMap(
    ([variable, row]) => row.labels.flatMap((item, index) =>
      item.effect instanceof cases.Row.UserEffect
        ? [{ variable, index, term: plain(item.mark) }] : []));
  // The forgeries: { kind, step, at, from, to, input }.
  const positionTerm = input => position => {
    const found = Maps.lookup(Effect.ordPosition)(position)(input.marks);
    return found instanceof cases.Just ? plain(found.value0) : undefined;
  };
  const forgeries = (problem, input) => {
    const rigid = problem.effects.rigidMarks;
    const termAt = positionTerm(input);
    const atPositions = sample(problem.effects.positions, caps.positions)
      .flatMap(position => {
        const term = termAt(position);
        return term === undefined ? [] : steps(term, rigid).map(([step,
          to]) => ({ kind: 'position', step, at: position, from: term, to,
          input: mb.withTerm(input, position, to) }));
      });
    const inBindings = sample(bindingLabels(input), caps.labels)
      .flatMap(({ variable, index, term }) => steps(term, rigid).map(
        ([step, to]) => ({ kind: 'binding', step, at: [variable, index],
          from: term, to, input: labelMark(input, variable, index, to) })));
    return [...atPositions, ...inBindings];
  };
  // The places where `forged` differs from `base`; a mark forgery has
  // exactly one, a term. Maps are compared entry by entry, rows label by
  // label (effect, arguments and tail by identity, marks by value).
  const rowDiffs = (one, other) => {
    if (one === other) return [];
    if (one.tail !== other.tail
      || one.labels.length !== other.labels.length) return ['row'];
    return one.labels.flatMap((item, index) => {
      const that = other.labels[index];
      if (item.effect !== that.effect || item.args !== that.args)
        return ['label'];
      return name(plain(item.mark)) === name(plain(that.mark)) ? []
        : ['term'];
    });
  };
  const effectDiffs = (base, forged) => {
    const one = pairs(base.effects);
    const other = pairs(forged.effects);
    if (one.length !== other.length) return ['binding'];
    return one.flatMap(([variable, row], index) =>
      Effect.eqEVar.eq(variable)(other[index][0])
        ? rowDiffs(row, other[index][1]) : ['binding']);
  };
  // Entry by entry, keys (positions) by equality, terms by value.
  const markDiffs = (base, forged) => {
    const one = pairs(base.marks);
    const other = pairs(forged.marks);
    if (one.length !== other.length) return ['position'];
    return one.flatMap(([position, term], index) => {
      const [key, value] = other[index];
      if (!Effect.eqPosition.eq(position)(key)) return ['position'];
      return name(plain(term)) === name(plain(value)) ? [] : ['term'];
    });
  };
  const marksOnly = (base, forged) => {
    const fixed = base.types === forged.types && base.rows === forged.rows
      ? [] : ['types or rows'];
    const found = [...fixed, ...markDiffs(base, forged),
      ...effectDiffs(base, forged)];
    return found.length === 1 && found[0] === 'term' ? null
      : found.length === 0 ? 'no term changed' : found.join(', ');
  };
  // Whether the cap left a position or a label of this package unforged.
  const capped = (problem, input) => problem.effects.positions.length
    > caps.positions || bindingLabels(input).length > caps.labels;
  return { forgeries, marksOnly, plain, capped };
};
