// Handler types for the derivation cases, and the two trusted
// constructions a-min injects: `derivedC` (the ResultC, E4′) and
// `handlerEquality` (E1 on two handler types, §18.82 condition 1). Both
// are hand translations of the compiler's code named at each function;
// mutants.mjs replaces them. Also the obligation builders (E4's
// `literalE4`, E5's `installation`, E6's `deferral`), each passing the
// case's injected E2 rigid rule to every consumption. A handler type is
// { eff, args, mark, inference: R, clauses: C or null } (Domain/Row.purs
// `HandlerRows`).
import { combine, consumption, empty, flex, isRigid, pairing, resolve, row,
  rowEquality } from './rows.mjs';

export const handler = (eff, mark, inference, clauses = null, args = []) =>
  ({ eff, args, mark, inference, clauses });
// Domain/Row.purs `clauseRow`: C, or R itself when the type owns none.
export const clauseRow = h => h.clauses ?? h.inference;
export const structural = ok => () => ({ ...empty, structural: [ok] });
export const markEquality = (a, b) => () => ({ ...empty, eqs: [[a, b]] });
export const edge = (low, high) => () => ({ ...empty, edges: [[low, high]] });
export const sameHead = (l, r) => l.eff === r.eff
  && JSON.stringify(l.args) === JSON.stringify(r.args);
const owns = h => h.clauses !== null;

// Unify.purs `unifyHeads` (THandler), `unifyInference`; UnifyParts.purs
// `handledMarks`, `unifyClauses`. Handled arguments and marks equal; if
// neither type owns a C, R ≡ R with marks (R stands in as C); else R ≡ R
// ignoring marks, then clauseRow ≡ clauseRow with marks and tails, keys
// only (a Fail payload head through its key), a side without its own C
// contributing R itself.
export const handlerEquality = (left, right) => [
  structural(sameHead(left, right)),
  markEquality(left.mark, right.mark),
  ...(!owns(left) && !owns(right)
    ? [rowEquality({ left: left.inference, right: right.inference,
      marks: true, args: true })]
    : [rowEquality({ left: left.inference, right: right.inference,
      marks: false, args: true }),
    rowEquality({ left: clauseRow(left), right: clauseRow(right),
      marks: true, args: false })])
];

// Revision 3.2's E1 as written: marks ignored on every inference row and
// no C ≡ C. The `earlier` obligations of attempts A and B.
export const revision32Equality = (left, right) => [
  structural(sameHead(left, right)),
  markEquality(left.mark, right.mark),
  rowEquality({ left: left.inference, right: right.inference, marks: false,
    args: true })
];

// A callee's signature { params, own, result } at one use: its declared
// row variables become the use's flexible variables (`use.rows`), each
// `{ k }` mark the use's Instantiated position (`use.marks`), and
// MarkUse.purs `openHandlers` opens a top-level parameter's handled label
// written M and the top-level result's written N (`use.opened`). A
// function parameter `{ arrow: row }` gets its row instantiated (k1.mjs).
export const instantiate = (sig, use) => {
  const tail = t => (isRigid(t) && use.rows[t.rigid] ? flex(use.rows[t.rigid])
    : t);
  const mark = m => (typeof m === 'object' ? use.marks[m.k] : m);
  const rowOf = r => r && row(r.labels.map(l => ({ ...l, mark: mark(l.mark) })),
    tail(r.tail));
  const type = (t, written, opened) => (t.arrow !== undefined
    ? { arrow: rowOf(t.arrow) } : t.inference === undefined ? t
    : { ...t, mark: t.mark === written && opened ? opened : mark(t.mark),
      inference: rowOf(t.inference), clauses: rowOf(t.clauses) });
  const opened = use.opened ?? {};
  return { params: sig.params.map((p, i) =>
    type(p, 'M', (opened.params ?? [])[i])),
  own: rowOf(sig.own), result: type(sig.result, 'N', opened.result) };
};

// ResultClauses.purs `ownClauses` on an instantiated signature: a
// top-level result handler type without a C gets one: R's labels bare
// (Walked `bareLabel`: a Fail keeps its payload head, others no
// arguments), R's marks kept; the tail is R's variable if it occurs in a
// parameter or the own row, else `fresh`, the use's own variable (closed
// when unbound, E4′); closed when R is closed. Returns the result type.
export const derivedC = (sig, fresh) => {
  const r = sig.result;
  if (r.inference === undefined || owns(r)) return r;
  const tail = r.inference.tail;
  const kept = tail !== null && tail.flex !== undefined
    && !occursIn(sig, tail.flex) ? flex(fresh) : tail;
  const bare = l => ({ ...l, args: l.eff === 'Fail' ? [l.args[0]] : [] });
  return { ...r, clauses: row(r.inference.labels.map(bare), kept) };
};
const tailsOf = t => (t === null || t === undefined ? []
  : t.labels !== undefined ? [t.tail?.flex]
    : t.inference !== undefined ? [...tailsOf(t.inference),
      ...tailsOf(t.clauses)]
      : t.arrow !== undefined ? tailsOf(t.arrow) : []);
const occursIn = (sig, name) => [...sig.params.flatMap(tailsOf),
  ...tailsOf(sig.own)].includes(name);

// E5, `with h { body }` under ρ (Install.purs; Frames.purs `framed`): R
// consumed into ρ ignoring marks; C (owned, else R's bare alias, Install
// `clausesOf`) paired with ρ by key (Lend `partners`) for mark edges
// only: m ⊑ f, each non-Fail partner's mark ⊑ f, a rigid C tail M ⊑ f.
// No case installs a Console handler, so the frame is never N. `rule`
// is E2's rigid case (rows.mjs), injected by the case.
export const installation = ({ handler: h, current, frame, rule }) => [
  consumption({ source: h.inference, target: current, marks: false,
    rule }),
  edge(h.mark, frame),
  pkg => {
    const [c, rho] = [resolve(clauseRow(h), pkg), resolve(current, pkg)];
    const { pairs } = pairing(c.labels.filter(l => l.eff !== 'Fail'),
      rho.labels);
    return { ...empty, edges: [...pairs.map(([, p]) => [p.mark, frame]),
      ...(isRigid(c.tail) ? [['M', frame]] : [])] };
  }
];
// The body's ambient row `f L + ρ` (E11).
export const withFrame = (h, frame, current) => row(
  [{ eff: h.eff, args: h.args, mark: frame }, ...current.labels],
  current.tail);

// E6 and E2 at `defer e` (Defer.purs, Frames.purs `demanded`): the
// completed d holds no Fail and no rigid tail; each label's mark ⊑ N; d
// consumed into the enclosing row.
export const deferral = ({ deferred, current, rule }) => [
  consumption({ source: deferred, target: current, marks: true, rule }),
  pkg => {
    const d = resolve(deferred, pkg);
    return { ...empty, edges: d.labels.map(l => [l.mark, 'N']),
      structural: [d.tail === null && d.labels.every(l => l.eff !== 'Fail')] };
  }
];

// E4 for a literal with clause rows (Clauses.purs `consumeBare`, Frames
// `aborting`): each c consumed into R ignoring marks and into C with
// marks, both by E2 with the injected rigid rule. Into C this is the
// full condition, tail included (§18.85 ruling 2, S2-1), a departure
// from Clauses.purs's labels-only consumption with a throwaway tail. A
// c holding Fail or ending in rigid ϱ gives M ⊑ m. Arguments are
// compared on C as on R; no case has a C label whose arguments differ.
export const literalE4 = (lit, clauses, rule) => clauses.flatMap(c => [
  consumption({ source: c, target: lit.inference, marks: false, rule }),
  consumption({ source: c, target: lit.clauses, marks: true, rule }),
  pkg => {
    const done = resolve(c, pkg);
    return { ...empty, edges: done.labels.some(l => l.eff === 'Fail')
      || isRigid(done.tail) ? [['M', lit.mark]] : [] };
  }
]);
export { combine };
