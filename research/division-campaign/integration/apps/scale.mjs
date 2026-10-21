// Stream 9's scaling families: generated programs whose size grows with
// one parameter n. Each names the function measured (`target`, a name
// or a function of n).
//
//   stages   A's shape grown: n rigid rows, each read by its own helper,
//            beside n ground records of three labels each. Independent.
//   ground   four rigid rows as in `stages` 4, beside n ground records
//            of three labels: the body grows, the signature does not.
//   chain    B's shape grown: n rigid rows, pairwise disjoint, each
//            beside one label the others lack, joined left to right
//            through a declared `join` (two spreads: (j)).
//   tied     n rigid rows, one field read from each, the reads gathered
//            into one record literal.
//   shared   three disjoint rigid rows joined ((j)), then n labels added
//            by n helpers; every row lacks every added label.
//   star     a context row joined ((j)) with each of n rows separately;
//            each row is beside its own label, the others never lack it.
//   helpers  a module of n row-polymorphic helpers, each calling the
//            previous one on its own rigid row and adding one label.
const range = count => Array.from({ length: count }, (_, index) => index + 1);
const lines = items => items.join('\n');

const reads = n => lines(range(n).map(i =>
  `fn read${i}(x: { f${i}: Int, ...r }): Int = x.f${i};`));

const stagesOf = (rows, records) => {
  const params = range(rows).map(i => `p${i}: { f${i}: Int, ...r${i} }`);
  const reading = range(rows).map(i => `  let v${i} = read${i}(p${i});`);
  const building = range(records).map(i =>
    `  let g${i} = { a${i}: ${i}, b${i}: 2, c${i}: 3 };`);
  const total = range(records).map(i => `g${i}.a${i}`).join(' + ');
  const args = range(rows).map(i => `{ f${i}: ${i}, x${i}: 0 }`);
  return lines([reads(rows),
    `fn stages(${params.join(', ')}): Int = {`,
    ...reading, ...building, `  ${total || '0'}`, '};',
    `fn main(): Int = stages(${args.join(', ')});`, '']);
};

const join = `fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };`;

const chainOf = n => {
  const params = range(n).map(i => `p${i}: { f${i}: Int, ...r${i} }`);
  const fields = range(n).map(i => `f${i}: Int`);
  const tails = range(n).map(i => `...r${i}`);
  const apart = range(n).flatMap(i => range(n).filter(j => j > i)
    .map(j => `r${i} disjoint r${j}`));
  const lacking = range(n).map(i => `r${i} lacks { ${range(n)
    .filter(j => j !== i).map(j => `f${j}`).join(', ')} }`);
  const body = range(n).slice(1).reduce(
    (left, i) => `join(${left}, p${i})`, 'p1');
  const args = range(n).map(i => `{ f${i}: ${i}, x${i}: 0 }`);
  return lines([join,
    `fn chain(${params.join(', ')}): { ${[...fields, ...tails].join(', ')} }`,
    `  where ${[...apart, ...lacking].join(', ')} =`,
    `  ${body};`,
    `fn main(): Unit with Console = Console.print(chain(${args.join(', ')}));`,
    '']);
};

// n field accesses on n rigid rows, gathered into one record: before
// the solver's types are applied, each access's type meta ties its row
// to the record's (A's `audit`, `summary`).
const tiedOf = n => {
  const params = range(n).map(i => `p${i}: { f${i}: Int, ...r${i} }`);
  const fields = range(n).map(i => `a${i}: p${i}.f${i}`);
  const args = range(n).map(i => `{ f${i}: ${i}, x${i}: 0 }`);
  return lines([`fn tied(${params.join(', ')}): Int = {`,
    `  let all = { ${fields.join(', ')} };`, '  all.a1', '};',
    `fn main(): Int = tied(${args.join(', ')});`, '']);
};

// Three disjoint rigid rows joined, then n labels added one helper at a
// time; each row lacks every added label.
const sharedOf = n => {
  const adders = range(n).map(i =>
    `fn add${i}(x: { ...r }): { l${i}: Int, ...r } where r lacks { l${i} } =` +
    `\n  { ...x, l${i}: ${i} };`);
  const added = range(n).map(i => `l${i}`);
  const fields = added.map(label => `${label}: Int`);
  const body = range(n).reduce((inner, i) => `add${i}(${inner})`,
    'join(join(a, b), c)');
  return lines([join, ...adders,
    'fn shared(a: { ...r }, b: { ...s }, c: { ...t }):',
    `  { ${[...fields, '...r', '...s', '...t'].join(', ')} }`,
    '  where r disjoint s, r disjoint t, s disjoint t, ' +
      ['r', 's', 't'].map(row => `${row} lacks { ${added.join(', ')} }`)
        .join(', ') + ' =',
    `  ${body};`,
    'fn main(): Unit with Console =',
    '  Console.print(shared({ x: 1 }, { y: 2 }, { z: 3 }));', '']);
};

// A shared context row h joined with each of n rows separately: one
// component through h, but r_i never meets f_j (i ≠ j), so nothing
// makes r_i lack f_j.
const starOf = n => {
  const params = range(n).map(i => `p${i}: { f${i}: Int, ...r${i} }`);
  const apart = range(n).map(i => `h disjoint r${i}`);
  const lacking = `h lacks { ${range(n).map(i => `f${i}`).join(', ')} }`;
  const joins = range(n).map(i => `  let j${i} = join(p${i}, hub);`);
  const args = range(n).map(i => `{ f${i}: ${i}, x${i}: 0 }`);
  return lines([join,
    `fn star(hub: { ...h }, ${params.join(', ')}): Int`,
    `  where ${[...apart, lacking].join(', ')} = {`, ...joins, '  0', '};',
    `fn main(): Int = star({ ctx: 0 }, ${args.join(', ')});`, '']);
};

const helpersOf = n => {
  const helper = i => i === 1
    ? 'fn h1(x: { ...r }): { a1: Int, ...r } where r lacks { a1 } =\n' +
      '  { ...x, a1: 1 };'
    : `fn h${i}(x: { ...r }): { ${range(i).map(j => `a${j}: Int`)
      .join(', ')}, ...r }\n  where r lacks { ${range(i)
      .map(j => `a${j}`).join(', ')} } =\n  { ...h${i - 1}(x), a${i}: ${i} };`;
  return lines([...range(n).map(helper),
    `fn main(): Unit with Console = Console.print(h${n}({ z: 0 }));`, '']);
};

export const families = [
  { name: 'stages', target: 'stages', sizes: [1, 2, 4, 6, 8, 12, 16],
    source: n => stagesOf(n, n) },
  { name: 'ground', target: 'stages', sizes: [0, 4, 8, 16, 32, 64],
    source: n => stagesOf(4, n) },
  { name: 'tied', target: 'tied', sizes: [1, 2, 4, 8, 16, 32],
    source: tiedOf },
  { name: 'shared', target: 'shared', sizes: [1, 2, 4, 8, 10, 11, 16, 32],
    source: sharedOf },
  { name: 'chain', target: 'chain', sizes: [2, 3, 4, 5, 6, 8, 12],
    source: chainOf },
  { name: 'star', target: 'star', sizes: [1, 2, 3, 4, 5, 6, 7, 8, 12],
    source: starOf },
  { name: 'helpers', target: n => `h${n}`, label: 'h<n>',
    sizes: [2, 4, 8, 16, 30, 31, 32], source: helpersOf }
];
