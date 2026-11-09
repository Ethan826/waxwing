// `Ord Path` against a reference that keeps the derived ordering (dossier
// §18.165). The reference repeats the compiled derived instance: roots in
// declaration order, then `Ord (Array Step)` from the library, whose
// elements are `Named` before `Index`, strings and integers by their own
// order. Shared with the regression probe.
//
// Grammar, fixed before running: the five roots; steps from `names` and
// `indices` below. Exhaustive over pairs of paths with at most two steps;
// every triple of `triples` paths; `sampledPairs` seeded pairs of up to
// six steps; and the long-path table. Exhaustive means within this grammar.
const names = ['', 'a', 'b', 'aa', 'ab', 'A', ' ', 'é', 'é',
  '￿', '😀', '\uD83D'];
const indices = [-2147483648, -2, -1, 0, 1, 2, 10, 2147483647];
const triples = 42;
const sampledPairs = 200000;
const rootOrder = ['InBody', 'InConstraints', 'InParameters', 'InResult',
  'InJoined'];

// A linear congruential generator, for a run that repeats exactly.
const seeded = start => {
  let state = start >>> 0;
  return bound => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % bound;
  };
};

export const pathOrder = async load => {
  const Origin = await load('Domain.Recorded.Origin');
  const Ord = await load('Data.Ord');
  const Ordering = await load('Data.Ordering');
  const roots = rootOrder.map(name => Origin[name].value);
  const steps = [...names.map(text => new Origin.Named(text)),
    ...indices.map(value => new Origin.Index(value))];
  const { LT, EQ, GT } = Ordering;
  const byText = Ord.compare(Ord.ordString);
  const byInt = Ord.compare(Ord.ordInt);
  const ordStep = { compare: x => y => {
    if (x instanceof Origin.Named && y instanceof Origin.Named)
      return byText(x.value0)(y.value0);
    if (x instanceof Origin.Named) return LT.value;
    if (y instanceof Origin.Named) return GT.value;
    return byInt(x.value0)(y.value0);
  }, Eq0: () => Origin.eqStep };
  const bySteps = Ord.compare(Ord.ordArray(ordStep));
  const rankOf = root => roots.indexOf(root);
  const reference = x => y => {
    const rank = rankOf(x.root) - rankOf(y.root);
    if (rank !== 0) return rank < 0 ? LT.value : GT.value;
    return bySteps(x.steps)(y.steps);
  };
  const compared = Ord.compare(Origin.ordPath);
  const equal = Origin.eqPath.eq;
  const path = (root, list) => ({ root, steps: list });
  return { Origin, roots, steps, reference, compared, equal, path, LT, EQ, GT };
};

const flip = (order, kit) => order === kit.LT.value ? kit.GT.value
  : order === kit.GT.value ? kit.LT.value : order;

const shortPaths = kit => {
  const lists = [[], ...kit.steps.map(step => [step]),
    ...kit.steps.flatMap(one => kit.steps.map(two => [one, two]))];
  return kit.roots.flatMap(root => lists.map(list => kit.path(root, list)));
};

const pairWrong = (kit, x, y) => {
  const order = kit.compared(x)(y);
  const wrong = [];
  if (order !== kit.reference(x)(y)) wrong.push('agreement');
  if ((order === kit.EQ.value) !== kit.equal(x)(y)) wrong.push('Eq');
  if (order !== flip(kit.compared(y)(x), kit)) wrong.push('antisymmetry');
  return wrong;
};

const show = (kit, x) => `${kit.rootName(x.root)}/${x.steps.map(step =>
  `${step.constructor.name}:${JSON.stringify(step.value0)}`).join('/')}`;

// Each kind of failure once, with its first witness, so a report is short.
const collect = () => {
  const seen = new Map();
  return { add: (kind, witness) => {
    if (!seen.has(kind)) seen.set(kind, witness());
  }, list: () => [...seen].map(([kind, at]) => `${kind}: ${at}`) };
};

const exhaustive = (kit, found) => {
  const paths = shortPaths(kit);
  for (const x of paths) for (const y of paths) for (const kind
    of pairWrong(kit, x, y))
    found.add(kind, () => `${show(kit, x)} ${show(kit, y)}`);
  return paths.length;
};

const randomList = (kit, next) => Array.from({ length: next(7) }, () =>
  kit.steps[next(kit.steps.length)]);

const sampled = (kit, found) => {
  const next = seeded(20261109);
  for (let at = 0; at < sampledPairs; at += 1) {
    const x = kit.path(kit.roots[next(5)], randomList(kit, next));
    const y = kit.path(kit.roots[next(5)], randomList(kit, next));
    for (const kind of pairWrong(kit, x, y))
      found.add(`sampled ${kind}`, () => `${show(kit, x)} ${show(kit, y)}`);
  }
};

const transitive = (kit, found) => {
  const next = seeded(7);
  const paths = Array.from({ length: triples }, () =>
    kit.path(kit.roots[next(5)], randomList(kit, next)));
  const atMost = (x, y) => kit.compared(x)(y) !== kit.GT.value;
  for (const x of paths) for (const y of paths) for (const z of paths)
    if (atMost(x, y) && atMost(y, z) && !atMost(x, z))
      found.add('transitivity', () => `${show(kit, x)} ${show(kit, z)}`);
};

// Long shared prefixes: a difference first, in the middle, last, or none,
// and one path a prefix of the other, at the parser's depth and far past it.
const longPaths = (kit, found) => {
  const a = new kit.Origin.Named('a');
  const b = new kit.Origin.Index(1);
  const c = new kit.Origin.Index(2);
  for (const size of [128, 129, 10000]) {
    const base = Array.from({ length: size }, () => a);
    const changed = (at, step) => base.map((old, i) => i === at ? step : old);
    const root = kit.roots[0];
    const pairs = [[base.slice(), base.slice()],
      [base, base.slice(0, size - 1)], [changed(0, b), changed(0, c)],
      [changed(size >> 1, b), changed(size >> 1, c)],
      [changed(size - 1, b), changed(size - 1, c)], [base, changed(0, b)]];
    for (const [one, two] of pairs) for (const kind of pairWrong(kit,
      kit.path(root, one), kit.path(root, two)))
      found.add(`long ${size} ${kind}`, () => `${one.length} ${two.length}`);
  }
};

export const wrongPathOrder = async load => {
  const kit = await pathOrder(load);
  kit.rootName = root => root.constructor.name;
  const found = collect();
  const count = exhaustive(kit, found);
  sampled(kit, found);
  transitive(kit, found);
  longPaths(kit, found);
  return { wrong: found.list(), count };
};
