// U7's own correspondence check (r0-amin-statements.md §11 U7, §4
// Definition 4.1; §13a O4). As built, a written handler type owns no C
// and Definition 4.1 compares it through R's alias, (c) or (d); FX008's
// design (§3.4) gives it its own C, "a structural copy of R with the
// same written marks and the same closed or rigid tail". For every pair
// and package of the grammar below, each as-built variant's verdict is
// compared with the design's: every written type replaced by an owned
// copy C = bare(R) (R's mark terms, R's tail), then (d) alone.
//   asBuiltJ  handlers.mjs `handlerEquality` (the alias is R itself:
//             O4's rule J, today's `clauseRow`);
//   asBuiltK  O4's rule K: the alias is a separate copy, so the owned C
//             must contain R's labels (each R occurrence paired with
//             C's occurrence of the same key and rank, marks equal) and
//             end where R ends, but C's further labels are free;
//   mutants   aliasIgnoresMarks ((c) with marks off) and aliasClosed
//             (the alias drops R's tail binding: recorded labels,
//             closed); each must disagree with the design somewhere.
// Bounded evidence about this grammar only, not a proof.
//
// GRAMMAR (fixed 2026-10-24 before the first run; not widened after):
//   keys A, B; labels nullary (no arguments, no Fail, no Console);
//   label lists: the multisets of size 0-2 in canonical order
//     [], [A], [B], [A,A], [A,B], [B,B];
//   a label's mark: N, M, or a flexible position of its own;
//   a row's tail: closed, the rigid r, or a flexible variable of its own;
//   handled label H with mark N on both sides (parts (a), (b) are the
//     same in every verdict compared, so they are not varied);
//   written side W: such an R, no C;
//   owned side O: R's labels and tail as above, R's marks all M (no
//     verdict compared reads an owned side's R marks: (d) ignores them),
//     and C an independent row as above (own positions, tail closed, r
//     or a variable of its own, never R's);
//   pairs: every ordered (W, W) and every (W, O), W on the left. (O, O)
//     is omitted: no written type, so the design changes nothing. (O, W)
//     is omitted: Definition 4.1 is symmetric (rowEquality pairs and
//     counts both ways), and rule K is stated by role, not by side;
//   packages: each position N or M (no rigid mark occurs, so these are
//     the only normal forms), each flexible variable one of: closed, r,
//     [A:M] closed, [B:N] closed (bound labels carry fixed terms).
// Run: node research/amin-mark-oracle/u7.mjs
import { flex, label, pairing, resolve, rigid, row, rowEquality }
  from './rows.mjs';
import { handler, handlerEquality, markEquality, sameHead, structural }
  from './handlers.mjs';
import { norm } from './oracle.mjs';

const LISTS = [[], ['A'], ['B'], ['A', 'A'], ['A', 'B'], ['B', 'B']];
const BINDINGS = [row([]), row([], rigid('r')), row([label('A', 'M')]),
  row([label('B', 'N')])];
const fixedMark = m => m === 'N' || m === 'M';

const markLists = (n, prefix, only) => {
  if (only) return [Array(n).fill(only)];
  let lists = [[]];
  for (let i = 0; i < n; i += 1)
    lists = lists.flatMap(l => ['N', 'M', `${prefix}${i}`]
      .map(m => [...l, m]));
  return lists;
};
const rowsOf = (prefix, variable, only = null) => LISTS.flatMap(keys =>
  markLists(keys.length, prefix, only).flatMap(marks =>
    [null, rigid('r'), flex(variable)].map(tail =>
      row(keys.map((k, i) => label(k, marks[i])), tail))));

// Definition 4.1's parts shared by every variant.
const heads = (l, r) => [structural(sameHead(l, r)),
  markEquality(l.mark, r.mark)];
const owns = h => h.clauses !== null;
const rRows = (l, r, marks) => rowEquality({ left: l.inference,
  right: r.inference, marks, args: true });
const sameEnd = (a, b) => (a === null && b === null)
  || (a !== null && b !== null && a.rigid !== undefined
    && a.rigid === b.rigid);
const bare = r => row(r.labels.map(l => ({ ...l, args: [] })), r.tail);

// The design: a written type's own C is bare(R), R's marks and tail.
const copied = h => (owns(h) ? h : { ...h, clauses: bare(h.inference) });
const design = (left, right) => {
  const [l, r] = [copied(left), copied(right)];
  return [...heads(l, r), rRows(l, r, false),
    rowEquality({ left: l.clauses, right: r.clauses, marks: true,
      args: false })];
};

// Rule K: C contains the copy of R; C's further labels stay out of R.
const copyIncluded = (clauses, inference) => pkg => {
  const [c, r] = [resolve(clauses, pkg), resolve(inference, pkg)];
  const { pairs, missing } = pairing(r.labels, c.labels);
  return { structural: [missing === 0 && sameEnd(c.tail, r.tail)],
    edges: [], eqs: pairs.map(([a, b]) => [a.mark, b.mark]) };
};
const ruleK = (l, r) => (owns(l) === owns(r) ? handlerEquality(l, r)
  : [...heads(l, r), rRows(l, r, false), owns(l)
    ? copyIncluded(l.clauses, r.inference)
    : copyIncluded(r.clauses, l.inference)]);

const aliasIgnoresMarks = (l, r) => (!owns(l) && !owns(r)
  ? [...heads(l, r), rRows(l, r, false)] : handlerEquality(l, r));
const closedAlias = h => (owns(h) ? h
  : { ...h, clauses: row(bare(h.inference).labels, null) });
const aliasClosed = (l, r) => (owns(l) === owns(r) ? handlerEquality(l, r)
  : [...heads(l, r), rRows(l, r, false), rowEquality({
    left: closedAlias(l).clauses, right: closedAlias(r).clauses,
    marks: true, args: false })]);

const VARIANTS = { asBuiltJ: handlerEquality, asBuiltK: ruleK,
  aliasIgnoresMarks, aliasClosed };

const judge = obligations => pkg => {
  const term = m => (fixedMark(m) ? m : pkg.marks[m]);
  return obligations.every(o => {
    const made = o(pkg);
    return made.structural.every(Boolean)
      && made.eqs.every(([a, b]) => norm(term(a)) === norm(term(b)));
  });
};

const namesOf = rows => {
  const marks = new Set();
  const vars = new Set();
  for (const r of rows) {
    if (r === null) continue;
    for (const l of r.labels) if (!fixedMark(l.mark)) marks.add(l.mark);
    if (r.tail !== null && r.tail.flex !== undefined) vars.add(r.tail.flex);
  }
  return { marks: [...marks], vars: [...vars] };
};
function* packagesOf({ marks, vars }) {
  for (let pick = 0; pick < 1 << marks.length; pick += 1)
    for (let b = 0; b < BINDINGS.length ** vars.length; b += 1) {
      const pkg = { marks: {}, rows: {} };
      marks.forEach((m, i) => { pkg.marks[m] = (pick >> i) & 1 ? 'M' : 'N'; });
      vars.forEach((v, i) => {
        pkg.rows[v] = BINDINGS[Math.floor(b / BINDINGS.length ** i)
          % BINDINGS.length];
      });
      yield pkg;
    }
}

const showRow = r => `[${r.labels.map(l => `${l.eff}:${l.mark}`).join(',')}`
  + `|${r.tail === null ? '∅' : r.tail.rigid ?? r.tail.flex}]`;
const showSide = h => (owns(h) ? `O(R${showRow(h.inference)} C`
  + `${showRow(h.clauses)})` : `W(R${showRow(h.inference)})`);
const showPkg = p => JSON.stringify({ marks: p.marks, rows: Object
  .fromEntries(Object.entries(p.rows).map(([k, v]) => [k, showRow(v)])) });

// An owned side shaped as E4′'s annotation C would record it: C's keys
// R's keys, C's tail its own variable (the only reachable extras).
const shaped = (l, r) => owns(r)
  && r.clauses.labels.map(x => x.eff).join() === r.inference.labels
    .map(x => x.eff).join() && r.clauses.tail?.flex !== undefined;

const tally = () => ({ pairs: 0, packages: 0, agree: 0, wider: 0,
  narrower: 0, pairsExistsDiffer: 0, shapedDiffer: 0,
  shapedPairsExistsDiffer: 0, samples: [] });
const results = Object.fromEntries(Object.keys(VARIANTS)
  .map(k => [k, { WW: tally(), WO: tally() }]));

const runPair = (kind, l, r) => {
  const pkgs = [...packagesOf(namesOf([l.inference, l.clauses,
    r.inference, r.clauses]))];
  const d = judge(design(l, r));
  const dv = pkgs.map(d);
  const isShaped = kind === 'WO' && shaped(l, r);
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const t = results[name][kind];
    const v = judge(variant(l, r));
    let [some, someDesign] = [false, false];
    t.pairs += 1;
    pkgs.forEach((pkg, i) => {
      const got = v(pkg);
      some ||= got;
      someDesign ||= dv[i];
      t.packages += 1;
      if (got === dv[i]) { t.agree += 1; return; }
      t[got ? 'wider' : 'narrower'] += 1;
      if (isShaped) t.shapedDiffer += 1;
      if (t.samples.length < 4) t.samples.push(`${got ? 'variant accepts'
        : 'design accepts'}: ${showSide(l)} ~ ${showSide(r)} ${showPkg(pkg)}`);
    });
    if (some !== someDesign) {
      t.pairsExistsDiffer += 1;
      if (isShaped) t.shapedPairsExistsDiffer += 1;
    }
  }
};

const started = Date.now();
const written = (prefix, variable) => rowsOf(prefix, variable)
  .map(r => handler('H', 'N', r));
const [lefts, rights] = [written('w', 'α'), written('v', 'β')];
for (const l of lefts) for (const r of rights) runPair('WW', l, r);
const ownedRs = rowsOf('', 'β', 'M');
const clauseRows = rowsOf('c', 'γ');
for (const l of lefts)
  for (const r of ownedRs)
    for (const c of clauseRows) runPair('WO', l, handler('H', 'N', r, c));

let failures = 0;
for (const [name, byKind] of Object.entries(results)) {
  for (const [kind, t] of Object.entries(byKind)) {
    const { samples, ...counts } = t;
    console.log(`${name} ${kind}: ${JSON.stringify(counts)}`);
    for (const s of samples) console.log(`  ${s}`);
  }
  const differ = byKind.WW.packages - byKind.WW.agree
    + byKind.WO.packages - byKind.WO.agree;
  if (name === 'asBuiltJ' && differ > 0) failures += 1;
  if (name.startsWith('alias'))
    console.log(`mutant ${name}: ${differ > 0 ? 'detected' : 'UNDETECTED'}`);
  if (name.startsWith('alias') && differ === 0) failures += 1;
}
console.log(`elapsed ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failures === 0 ? 0 : 1);
