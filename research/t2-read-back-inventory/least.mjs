// The least-term calculation of docs/plans/r0-amin-statements.md §5
// (Task 2, Step 1b; §18.151 (3)), written apart from
// research/amin-mark-oracle/oracle.mjs: classes by union-find over mark
// equalities; a class holding a constant takes it (two different
// constants are a clash); any other class takes M if M reaches it, else
// the join J S of the rigid constants reaching it, N if none. Terms:
// 'N', 'M' or a sorted array of rigid names (`J S`, S non-empty).
// `leastOfStore` runs it over today's live mark graph (Check/MarkStore
// `bindings` as equalities, `edges` as lower ⊑ upper). Research only.
import { unionFind } from './classes.mjs';
import { keyOf, named, pairs, stack } from './shape.mjs';

// `graph`: { constants: Map node -> 'N' | 'M' | { rigid }, equalities:
// [[a, b]], edges: [[lower, upper]] }, nodes as strings.
export const leastTerms = graph => {
  const classes = unionFind();
  for (const [one, other] of graph.equalities) classes.union(one, other);
  for (const [low, high] of graph.edges) { classes.find(low);
    classes.find(high); }
  const fixed = new Map();
  let clash = false;
  for (const [node, constant] of graph.constants) {
    const root = classes.find(node);
    const text = constantText(constant);
    if (fixed.has(root) && fixed.get(root) !== text) clash = true;
    fixed.set(root, text);
  }
  const reach = reaching(classes, graph);
  const termOf = root => {
    if (fixed.has(root)) return termFromText(fixed.get(root));
    const from = reach.get(root) ?? new Set();
    if (from.has('M')) return 'M';
    const rigid = [...from].filter(t => t.startsWith('k:'))
      .map(t => t.slice(2)).sort();
    return rigid.length === 0 ? 'N' : rigid;
  };
  return { clash, find: classes.find, term: node => termOf(
    classes.find(node)) };
};

const constantText = c => (typeof c === 'string' ? c : `k:${c.rigid}`);
const termFromText = text => (text.startsWith('k:') ? [text.slice(2)]
  : text);

// The constants that reach each class along edges (a fixpoint).
const reaching = (classes, graph) => {
  const reach = new Map();
  const at = node => {
    const root = classes.find(node);
    if (!reach.has(root)) reach.set(root, new Set());
    return reach.get(root);
  };
  for (const [node, constant] of graph.constants)
    at(node).add(constantText(constant));
  for (let changed = true; changed;) {
    changed = false;
    for (const [low, high] of graph.edges) {
      const target = at(high);
      for (const atom of at(low)) if (!target.has(atom)) {
        target.add(atom);
        changed = true;
      }
    }
  }
  return reach;
};

// `norm (J ∅) = N`; `holds x y` on normal forms (statements §5).
export const normTerm = term => (Array.isArray(term) && term.length === 0
  ? 'N' : term);
export const holdsTerm = (x, y) => {
  const [low, high] = [normTerm(x), normTerm(y)];
  return low === 'N' || high === 'M' || (Array.isArray(low)
    && Array.isArray(high) && low.every(k => high.includes(k)));
};

export const termText = term => (Array.isArray(term)
  ? `J{${term.join(',')}}` : term);

// A live mark as a node, and its constant if it is one; `Unmarked`
// gives null (Mark.purs `violation` and UnifyMark `recorded` drop it).
const liveNode = mark => {
  switch (named(mark)) {
  case 'NoFail': return { node: 'N', constant: 'N' };
  case 'Plain': return { node: 'M', constant: 'M' };
  case 'MarkVariable': return { node: `k:${mark.value0}`,
    constant: { rigid: mark.value0 } };
  case 'MarkMeta': return { node: `m:${mark.value0}` };
  default: return null;
  }
};

export const liveGraph = store => {
  const constants = new Map();
  const add = found => {
    if (found?.constant !== undefined) constants.set(found.node,
      found.constant);
    return found?.node ?? null;
  };
  const equalities = [];
  let dropped = 0;
  for (const [meta, mark] of pairs(store.bindings)) {
    const target = add(liveNode(mark));
    if (target === null) dropped += 1;
    else equalities.push([`m:${meta}`, target]);
  }
  const edges = [];
  for (const edge of stack(store.edges)) {
    const [low, high] = [add(liveNode(edge.lower)), add(liveNode(edge.upper))];
    if (low === null || high === null) dropped += 1;
    else edges.push([low, high]);
  }
  return { constants, equalities, edges, dropped };
};

// The least-term verdict on a live mark store: no clash, and every edge
// holds under the least terms.
export const leastVerdict = store => {
  const graph = liveGraph(store);
  const made = leastTerms(graph);
  return !made.clash && graph.edges.every(([low, high]) =>
    holdsTerm(made.term(low), made.term(high)));
};

// Over one live declaration: clashes, edges that fail `holds` under the
// least terms (today accepted every declaration here, so each failure is
// a disagreement with Mark.purs `violation`), and each located
// position's term by its kind.
export const leastOfStore = (item, facts, table, note) => {
  const graph = liveGraph(item.live.state.subst.marks);
  const read = new Map();
  for (const f of facts) if (f.kind === 'pos' && f.text !== 'U')
    read.set(keyOf(f.position), f);
  for (const f of read.values()) if (!f.text.startsWith('m:'))
    graph.constants.set(f.text, f.text.startsWith('k:')
      ? { rigid: f.text.slice(2) } : f.text);
  const made = leastTerms(graph);
  const bump = (key, by = 1) => { table[key] = (table[key] ?? 0) + by; };
  bump('declarations');
  bump('edges', graph.edges.length);
  bump('dropped (Unmarked end)', graph.dropped);
  if (made.clash) { bump('clash'); note(table, 'clash at', item.at); }
  const failing = graph.edges.filter(([low, high]) =>
    !holdsTerm(made.term(low), made.term(high)));
  if (failing.length > 0) {
    bump('declarations with a failing edge');
    note(table, 'failing edge at', item.at);
  }
  for (const f of read.values()) {
    const term = termText(made.term(f.text)).replace(/\{.*\}/, '{..}');
    bump(`position ${named(f.position)} term ${term}`
      + (f.text.startsWith('m:') ? ' (open meta)' : ''));
  }
};
