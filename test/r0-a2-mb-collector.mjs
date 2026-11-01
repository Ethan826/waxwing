// A2 Task 13, M-B: an independent collector of the mark edges and mark
// equalities a declaration's recorded obligations generate on a settled
// completed package P_c (spec §2.4). Written from statements
// (docs/plans/r0-amin-statements.md) §4 and §5 without reading
// src/Features/Check/Strategy/Effects/*.purs. It shares P_c (completion
// and settling) with the validator; the edges and their judgement are
// its own. Each edge comes from this statements text:
// - E1 (`Equal`), "marks equal on normal forms", and Definition 4.1:
//   (b) handled marks equal; (c) neither side owns a C: R ≡ R′ with
//   marks; (d) either owns one: R ≡ R′ ignoring the labels' own marks
//   (arguments by E1), and clauseRow ≡ clauseRow′ with marks, arguments
//   not compared; rule J: a side without C uses R. Equalities only.
// - E2 (`Consume`), "Mark edges, unless the site ignores marks: each
//   matched pair mark(ρ occurrence) ⊑ mark(s occurrence)", the r-th κ of
//   s matched with the r-th κ of ρ; arguments equal by E1 unless the
//   row is bare ("C rows are bare and compare keys only", T2-e). Marks
//   ignored: E4's c into R (`ClauseIntoR`), E5's R into ρ (`InstallR`).
//   Bare: c_k into C (`ClauseIntoC`) and the installed-C site
//   (`AtInstalledC`: pairing and `mark(ρ partner) ⊑ mark(C label)`
//   only, "Recording and meaning"). E7 is an instance of this edge.
// - E4 (`HandlerLit`): "for each c_k holding a `Fail` label or ending in
//   a rigid ϱ, `M ⊑ m`".
// - E5 (`Install`): "`m ⊑ f`, each paired ρ label's mark `⊑ f`, and a
//   rigid C tail gives `M ⊑ f`"; C the owned C, else R's alias (Install
//   `clausesOf`); Console frames too (uniform accounting).
// - E6 (`Defer`): "each non-`Fail` label's mark `⊑ N`".
// E3, E8, E9 and `Unsupported` generate no edge. The flags a `Consume`
// records are not read: marks and bareness come from the site, as
// above. A structural mismatch (no partner, a keyless `Fail`, unequal
// shapes) is a gap: the collector cannot generate that pair's edges.
// Keys (statements §4, Definition 4.1(d); spec §4.2): an effect label's
// key is its effect, a `Fail` label's its payload's head.
import { constant } from './r0-a2-mb-graph.mjs';
import { reader } from './r0-a2-mb-read.mjs';

const marksIgnored = ['ClauseIntoR', 'InstallR'];
const bareNames = ['ClauseIntoC', 'AtInstalledC'];

const headOf = payload => {
  if (payload === undefined) return null;
  if (payload.t === 'base') return payload.b;
  if (payload.t === 'data') return `d${payload.id}`;
  if (payload.t === 'record' && payload.tails.length === 0)
    return `{${payload.fields.map(([field]) => field).sort()}}`;
  return null;
};
const key = label => label.effect !== 'Fail' ? label.effect
  : headOf(label.args[0]) === null ? null
    : `Fail ${headOf(label.args[0])}`;

// Collects one declaration: its graph, its positions and its gaps, each
// gap with its obligation index.
export const collector = m => (problem, pc) => {
  const edges = [];
  const equal = [];
  const gaps = [];
  // The edge kinds that contributed an edge or an equality here.
  const exercised = new Set();
  let at = -1;
  const gap = why => gaps.push([at, why]);
  const read = reader(m, pc, gap);
  // The r-th κ of `source` with the r-th κ of `target`.
  const pairs = (source, target) => {
    const seen = new Map();
    return source.labels.flatMap(label => {
      const k = key(label);
      const rank = seen.get(k) ?? 0;
      seen.set(k, rank + 1);
      const partner = target.labels.filter(item => key(item) === k)[rank];
      if (k === null || partner === undefined) {
        gap(`no partner for ${k}`);
        return [];
      }
      return [[label, partner]];
    });
  };
  const counts = row => JSON.stringify(row.labels.map(key).sort());
  const args = (left, right) => left.length === right.length
    ? left.forEach((item, index) => eqTy(item, right[index]))
    : gap('argument count');
  const eqRow = (left, right, { marks, bare }) => {
    if (counts(left) !== counts(right)) gap('row keys');
    for (const [one, other] of pairs(left, right)) {
      if (!bare) args(one.args, other.args);
      if (marks) equal.push([one.mark, other.mark]);
    }
    if (left.tail !== right.tail) gap('row tails');
  };
  const eqTy = (left, right) => {
    if (left.t !== right.t) return gap(`${left.t} against ${right.t}`);
    const same = (one, other) => one === other || gap(`${one} ≠ ${other}`);
    switch (left.t) {
    case 'base': return same(left.b, right.b);
    case 'var': return same(left.v, right.v);
    case 'arrow':
      eqTy(left.a, right.a);
      eqRow(left.row, right.row, { marks: true });
      return eqTy(left.r, right.r);
    case 'record': return record(left, right);
    case 'data':
      same(left.id, right.id);
      args(left.args, right.args);
      if (left.rows.length !== right.rows.length) return gap('data rows');
      return left.rows.forEach((row, index) =>
        eqRow(row, right.rows[index], { marks: true }));
    default: return handlers(left, right);
    }
  };
  const record = (left, right) => {
    const names = item => JSON.stringify(item.fields.map(([f]) => f).sort());
    if (names(left) !== names(right)) return gap('record fields');
    if (JSON.stringify([...left.tails].sort())
      !== JSON.stringify([...right.tails].sort())) gap('record tails');
    const by = new Map(right.fields);
    return left.fields.forEach(([field, ty]) => eqTy(ty, by.get(field)));
  };
  // Definition 4.1 (a)-(d) and rule J.
  const handlers = (left, right) => {
    if (left.label.effect !== right.label.effect) gap('handled effect');
    args(left.label.args, right.label.args);
    equal.push([left.label.mark, right.label.mark]);
    const owned = left.clauses !== null || right.clauses !== null;
    eqRow(left.inference, right.inference, { marks: !owned });
    const before = equal.length;
    if (!owned) return;
    exercised.add('E1 Definition 4.1(d)');
    eqRow(left.clauses ?? left.inference, right.clauses ?? right.inference,
      { marks: true, bare: true });
    if (equal.length > before) exercised.add('E1 Definition 4.1(d) marks');
  };
  const consume = item => {
    const site = item.site.constructor.name;
    const marks = !marksIgnored.includes(site);
    const bare = bareNames.includes(site);
    for (const [s, rho] of pairs(read.mRow(item.source),
      read.mRow(item.target))) {
      if (!bare) args(s.args, rho.args);
      if (marks) edges.push([rho.mark, s.mark]);
      if (marks) exercised.add(`E2 ${site}`);
    }
  };
  const handlerLit = record => {
    const m = read.markAt(record.m);
    for (const variable of record.clauseRows) {
      const row = read.tailRow(variable);
      if (row.tail?.startsWith('r') || row.labels.some(label =>
        label.effect === 'Fail')) edges.push([constant('M'), m]);
    }
  };
  const install = record => {
    if (record.handler.constructor.name !== 'MHandler')
      return gap('Install over a non-handler type (not read)');
    const handler = read.mTy(record.handler);
    const frame = read.markAt(record.frame);
    const c = handler.clauses ?? handler.inference;
    edges.push([handler.label.mark, frame]);
    for (const [, partner] of pairs(c, read.mRow(record.ambient)))
      edges.push([partner.mark, frame]);
    if (c.tail?.startsWith('r')) edges.push([constant('M'), frame]);
  };
  const defer = record => read.tailRow(record.row).labels
    .filter(label => label.effect !== 'Fail')
    .forEach(label => edges.push([label.mark, constant('N')]));
  const kinds = { Equal: value => eqTy(read.mTy(value.value0),
    read.mTy(value.value1)),
  Consume: value => consume(value.value0),
  HandlerLit: value => handlerLit(value.value0),
  Install: value => install(value.value0),
  Defer: value => defer(value.value0) };
  const edgeKind = { Equal: 'E1', Consume: 'E2', HandlerLit: 'E4',
    Install: 'E5', Defer: 'E6' };
  problem.effects.obligations.forEach((placed, index) => {
    at = index;
    const name = placed.value.constructor.name;
    const size = edges.length + equal.length;
    kinds[name]?.(placed.value);
    if (edges.length + equal.length > size) exercised.add(edgeKind[name]);
  });
  // Each recorded position's node and its term in P_c.
  const terms = new Map(problem.effects.positions.map(position =>
    [read.markAt(position), read.termAt(position)]));
  return { graph: { edges, equal }, terms, gaps, exercised };
};
