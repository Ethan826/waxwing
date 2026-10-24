// Recorded rows for the derivation cases (derived.mjs), built by hand
// as small data. A label is { eff, args, mark }: the mark is 'N', 'M', a
// rigid mark ('k1', 'k2') or a position the package assigns. A tail is
// null (closed), { rigid } (a declared row variable) or { flex } (a
// variable the package binds in `rows`; unbound, it defaults to the
// closed row: r0-amin-statements.md §6 and E4′). Obligations are
// functions of the package returning { structural, edges, eqs }, the form
// cases.mjs judges (§4: conditions on the completed package).
export const label = (eff, mark, args = []) => ({ eff, mark, args });
export const row = (labels, tail = null) => ({ labels, tail });
export const rigid = name => ({ rigid: name });
export const flex = name => ({ flex: name });
export const empty = { structural: [], edges: [], eqs: [] };

// Domain/Row.purs `labelKey`: a Fail label is keyed by its payload head.
const keyOf = l => (l.eff === 'Fail' ? `Fail(${l.args[0]})` : l.eff);
export const sameArgs = (a, b) => JSON.stringify(a.args)
  === JSON.stringify(b.args);
export const isRigid = tail => tail !== null && tail.rigid !== undefined;
// Two completed tails are equal when both are closed or the same rigid.
const sameTail = (a, b) => (a === null && b === null)
  || (isRigid(a) && isRigid(b) && a.rigid === b.rigid);

// A row with its flexible tails replaced by their bindings, in order; a
// cycle of bindings gives a tail equal to nothing.
export const resolve = (r, pkg) => {
  const labels = [...r.labels];
  const seen = new Set();
  let { tail } = r;
  while (tail !== null && tail.flex !== undefined) {
    if (seen.has(tail.flex)) return { labels, tail: { cyclic: true } };
    seen.add(tail.flex);
    const bound = (pkg.rows ?? {})[tail.flex];
    if (bound === undefined) return { labels, tail: null };
    labels.push(...bound.labels);
    tail = bound.tail;
  }
  return { labels, tail };
};

// Scoped-label pairing (Leijen 2005; E2, Lend `partners`): the r-th
// occurrence of a key in `from` with the r-th occurrence in `into`.
// `missing` counts `from` labels with no partner; `rest` is `into`'s
// unmatched labels.
export const pairing = (from, into) => {
  const used = new Set();
  const pairs = [];
  let missing = 0;
  for (const l of from) {
    const i = into.findIndex((m, j) => !used.has(j) && keyOf(m) === keyOf(l));
    if (i < 0) missing += 1;
    else {
      used.add(i);
      pairs.push([l, into[i]]);
    }
  }
  return { pairs, missing, rest: into.filter((_, j) => !used.has(j)) };
};

// E1 on two rows (UnifyRow `unifyRows`; `unifyRowsIgnoring` when marks
// are off; `ignoringArguments` when args are off, keys only, a Fail head
// through its key): equal counts per key, equal tails; marks pairwise
// equal (norm) when `marks`.
export const rowEquality = ({ left, right, marks, args }) => pkg => {
  const [l, r] = [resolve(left, pkg), resolve(right, pkg)];
  const { pairs, missing, rest } = pairing(l.labels, r.labels);
  const ok = missing === 0 && rest.length === 0 && sameTail(l.tail, r.tail)
    && (!args || pairs.every(([a, b]) => sameArgs(a, b)));
  return { ...empty, structural: [ok],
    eqs: marks ? pairs.map(([a, b]) => [a.mark, b.mark]) : [] };
};

// E2, s consumed into ρ, on the completed rows: each label of s has its
// partner in ρ (the per-key count), arguments equal; a source ending in
// rigid ϱ needs ρ to end in ϱ; a closed source (a hole defaulted, or a
// `defer` row, whose tail Defer.purs never joins to ρ) needs nothing
// more. Unless marks are ignored (consumption into R), each matched pair
// gives mark(ρ occurrence) ⊑ mark(s occurrence); copies a binding of s's
// tail holds are labels of the completed s, so they get the same edge.
export const consumption = ({ source, target, marks }) => pkg => {
  const [s, t] = [resolve(source, pkg), resolve(target, pkg)];
  const { pairs, missing } = pairing(s.labels, t.labels);
  const tailOk = s.tail === null
    || (isRigid(s.tail) && isRigid(t.tail) && s.tail.rigid === t.tail.rigid);
  const ok = missing === 0 && tailOk
    && pairs.every(([a, b]) => sameArgs(a, b));
  return { ...empty, structural: [ok],
    edges: marks ? pairs.map(([sl, tl]) => [tl.mark, sl.mark]) : [] };
};

// The keys-only inclusion the earlier N4 translation checked (no tails):
// kept to show what the rigid-tail rule adds.
export const keysIncluded = ({ source, target }) => pkg => {
  const [s, t] = [resolve(source, pkg), resolve(target, pkg)];
  return { ...empty, structural: [pairing(s.labels, t.labels).missing === 0] };
};

export const combine = obligations => pkg => obligations
  .map(o => o(pkg)).reduce((a, b) => ({
    structural: [...a.structural, ...b.structural],
    edges: [...a.edges, ...b.edges], eqs: [...a.eqs, ...b.eqs] }), empty);
