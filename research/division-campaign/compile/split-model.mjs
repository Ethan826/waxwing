// Stream 6 prototype (research only; not compiler code). Independent of
// sig-oracle and of the Lean development: it reimplements the flat presence
// fragment from scratch so its answers can be compared with theirs.
//
// Question settled: for flat presence problems (rest part only, no written
// labels), (1) how many uniform complement-free witnesses a valid problem
// has, (2) what the proposed canonical choice (per region, the
// lexicographically least flexible membership vector, flexible rows in
// their listed order, absent before present) gives as set terms, and
// (3) whether those set terms, evaluated with real set operations on every
// small ground instance satisfying D, satisfy B. Part (4) is a hand model
// of the observability example in split-selection.md §3.
//
// Run: node research/division-campaign/compile/split-model.mjs

const disj = (a, b) => ({ op: 'disj', a, b });
const eq = (a, b) => ({ op: 'eq', a, b });

const problems = [
  {
    name: 'route (splitSig)', rigid: ['r', 's', 't'], flex: ['u', 'v'],
    D: [disj(['s'], ['t'])],
    B: [eq(['r'], ['u', 'v']), disj(['u'], ['v']),
      disj(['u'], ['s']), disj(['v'], ['t'])],
  },
  {
    name: 'route, r disjoint s added', rigid: ['r', 's', 't'],
    flex: ['u', 'v'],
    D: [disj(['s'], ['t']), disj(['r'], ['s'])],
    B: [eq(['r'], ['u', 'v']), disj(['u'], ['v']),
      disj(['u'], ['s']), disj(['v'], ['t'])],
  },
  {
    name: 'forwarded join', rigid: ['r', 's'], flex: ['p', 'q'],
    D: [disj(['r'], ['s'])],
    B: [eq(['p'], ['r']), eq(['q'], ['s']), disj(['p'], ['q'])],
  },
  {
    name: 'three-way division', rigid: ['r', 's', 't', 'w'],
    flex: ['a', 'b', 'c'],
    D: [disj(['s'], ['t']), disj(['t'], ['w']), disj(['s'], ['w'])],
    B: [eq(['r'], ['a', 'b', 'c']), disj(['a'], ['b']), disj(['b'], ['c']),
      disj(['a'], ['c']), disj(['a'], ['s']), disj(['b'], ['t']),
      disj(['c'], ['w'])],
  },
  {
    name: 'control: route without s disjoint t', rigid: ['r', 's', 't'],
    flex: ['u', 'v'], D: [],
    B: [eq(['r'], ['u', 'v']), disj(['u'], ['v']),
      disj(['u'], ['s']), disj(['v'], ['t'])],
  },
];

// Bit level: one label's membership in each variable.
const vectors = (n) => Array.from({ length: 2 ** n }, (_, k) =>
  Array.from({ length: n }, (_, i) => Boolean((k >> (n - 1 - i)) & 1)));
const bitOf = (env, e) => e.some((x) => env[x]);
const holdsBit = (env, atom) => atom.op === 'disj'
  ? !(bitOf(env, atom.a) && bitOf(env, atom.b))
  : bitOf(env, atom.a) === bitOf(env, atom.b);
const envOf = (names, bits) =>
  Object.fromEntries(names.map((x, i) => [x, bits[i]]));

// Per region: D allowed? and the flexible vectors satisfying B there.
function analyse(p) {
  const regions = [];
  for (const b of vectors(p.rigid.length)) {
    const rigidEnv = envOf(p.rigid, b);
    if (!p.D.every((atom) => holdsBit(rigidEnv, atom))) continue;
    const permitted = vectors(p.flex.length).filter((s) => {
      const env = { ...rigidEnv, ...envOf(p.flex, s) };
      return p.B.every((atom) => holdsBit(env, atom));
    });
    regions.push({ b, permitted });
  }
  return regions;
}

// Vectors are generated in lexicographic order, absent first, so the
// canonical choice is the first permitted vector.
const canonical = (permitted) => permitted[0];
const isZero = (bits) => bits.every((x) => !x);

function regionName(p, b) {
  const inside = p.rigid.filter((_, i) => b[i]);
  const outside = p.rigid.filter((_, i) => !b[i]);
  return inside.join('∩') + outside.map((x) => '∖' + x).join('');
}

// The canonical witness as set terms: each flexible row is the union of
// the regions whose canonical vector holds it.
function terms(p, regions) {
  return p.flex.map((y, j) => {
    const parts = regions.filter((g) => !isZero(g.b))
      .filter((g) => canonical(g.permitted)[j])
      .map((g) => regionName(p, g.b));
    return `${y} = ${parts.length ? parts.join(' ∪ ') : '∅'}`;
  });
}

// Set level, independent of the bit tables: evaluate the canonical terms
// with set operations on every assignment of rigid rows over `labels`
// that satisfies D (checked with set operations too), then check B.
const union = (sets) => new Set(sets.flatMap((s) => [...s]));
const setOf = (env, e) => union(e.map((x) => env[x]));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const disjoint = (a, b) => [...a].every((x) => !b.has(x));
const holdsSet = (env, atom) => atom.op === 'disj'
  ? disjoint(setOf(env, atom.a), setOf(env, atom.b))
  : sameSet(setOf(env, atom.a), setOf(env, atom.b));

function* assignments(names, labels) {
  const subsets = vectors(labels.length).map((bits) =>
    new Set(labels.filter((_, i) => bits[i])));
  const go = function* (i, acc) {
    if (i === names.length) { yield acc; return; }
    for (const s of subsets) yield* go(i + 1, { ...acc, [names[i]]: s });
  };
  yield* go(0, {});
}

function groundCheck(p, regions, labels) {
  const table = new Map(regions.map((g) => [g.b.join(), g.permitted]));
  let checked = 0, failed = 0;
  for (const env of assignments(p.rigid, labels)) {
    if (!p.D.every((atom) => holdsSet(env, atom))) continue;
    checked += 1;
    const full = { ...env };
    p.flex.forEach((y, j) => {
      full[y] = new Set(labels.filter((l) => {
        const b = p.rigid.map((x) => env[x].has(l));
        const permitted = table.get(b.join()) ?? [];
        return !isZero(b) && permitted.length > 0 && canonical(permitted)[j];
      }));
    });
    if (!p.B.every((atom) => holdsSet(full, atom))) failed += 1;
  }
  return { checked, failed };
}

for (const p of problems) {
  const regions = analyse(p);
  const valid = regions.every((g) => g.permitted.length > 0);
  const zeroOk = regions.filter((g) => isZero(g.b))
    .every((g) => g.permitted.some(isZero));
  console.log(`\n== ${p.name}: ${valid ? 'valid' : 'INVALID'} (presence)`);
  if (!valid) {
    const bad = regions.filter((g) => g.permitted.length === 0)
      .map((g) => regionName(p, g.b));
    console.log(`  regions with no permitted vector: ${bad.join(', ')}`);
    continue;
  }
  const count = regions.filter((g) => !isZero(g.b))
    .reduce((n, g) => n * g.permitted.length, 1);
  console.log(`  outside every rigid row the empty vector is permitted: ${zeroOk}`);
  for (const g of regions.filter((h) => !isZero(h.b))) {
    const show = g.permitted.map((s) =>
      p.flex.filter((_, j) => s[j]).join('+') || '-').join(' | ');
    console.log(`  region ${regionName(p, g.b)}: ${show}`);
  }
  console.log(`  uniform complement-free witnesses: ${count}`);
  console.log(`  canonical: ${terms(p, regions).join('; ')}`);
  const result = groundCheck(p, regions, ['l1', 'l2', 'l3']);
  console.log(`  set-level check over 3 labels: ${result.checked} rigid ` +
    `assignments satisfy D, canonical fails B at ${result.failed}`);
}

// (4) Hand model of the observability example (split-selection.md §3):
// divide({ a: 1, f: fn }, { a: 2 }, { b: 3 }); `a` is forced into v, `f`
// may go to u or v. Runtime: the only record value in divide is the whole,
// whose layout (the Go struct passed) is the union, and the body returns
// "ok". Compile time: the post-specialization check of a print site at
// { ...u } (a lambda never applied).
const whole = { a: 'Int', f: 'Int -> Int' };
const s = { a: 'Int' }, t = { b: 'Int' };
const routeP = problems[0];
const table = new Map(analyse(routeP).map((g) => [g.b.join(), g.permitted]));
const perLabel = Object.keys(whole).map((l) => {
  const b = [true, l in s, l in t];
  return { l, choices: table.get(b.join()) };
});
const splits = perLabel.reduce((acc, { l, choices }) =>
  acc.flatMap((m) => choices.map((c) => ({ ...m, [l]: c }))), [{}]);
console.log('\n== observability: divide({ a, f }, { a }, { b })');
const layout = '{ ' + Object.keys(whole).sort()
  .map((l) => `${l}: ${whole[l]}`).join(', ') + ' }';
for (const m of splits) {
  const u = Object.keys(m).filter((l) => m[l][0]);
  const v = Object.keys(m).filter((l) => m[l][1]);
  const printable = u.every((l) => !whole[l].includes('->'));
  const canon = perLabel.every(({ l, choices }) => choices[0] === m[l]);
  console.log(`  u = {${u.join(',')}} v = {${v.join(',')}}` +
    `${canon ? ' (canonical)' : ''}: whole's layout ${layout}, result "ok"; ` +
    `print site at { ...u }: ${printable ? 'accepted' : 'E_TYPE not printable'}`);
}
