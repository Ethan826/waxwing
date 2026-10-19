// An independent oracle for tr-solver.mjs's problems (shares no code with
// it). A problem's meaning: each row unknown is a set of labels, each
// label of unknown m having its own type `m.l`; a row denotes its written
// fields plus its unknowns' labels, and is well formed when no label
// occurs twice; a record type is the constructor `Rec:<labels>` applied
// to its fields' types in label order. `eq` holds when both rows are well
// formed with the same labels and the types of each label are equal;
// `dis` when the two rows together are well formed; `lacks` when the
// unknown has no such label. For each assignment of label sets (every
// subset of the problem's labels, which suffices: a label the problem
// never names can be removed from every unknown), the type equations
// are solved by first-order unification with an occurs check: a
// solution exists for those sets iff they unify, and the unifier is the
// most general typing for them.
const isTv = t => t && t.v !== undefined;

// Every row in the problem, nested ones included, and its unknowns.
export function rowsOf(steps) {
  const out = [];
  const visit = row => {
    out.push(row);
    for (const [, t] of row.fields) if (t.rec) visit(t.rec);
  };
  for (const c of steps) if (c.k !== 'lacks') visit(c.l), visit(c.r);
  return out;
}

export function namesOf(steps) {
  const metas = new Set(), tvs = new Set(), labels = new Set();
  const ty = t => {
    if (isTv(t)) tvs.add(t.v);
    if (t.rec) row(t.rec);
  };
  const row = r => {
    r.tails.forEach(m => metas.add(m));
    r.fields.forEach(([k, t]) => { labels.add(k); ty(t); });
  };
  for (const c of steps) {
    if (c.k === 'lacks') { metas.add(c.v); labels.add(c.l); }
    else { row(c.l); row(c.r); }
  }
  return { metas: [...metas].sort(), tvs: [...tvs].sort(),
    labels: [...labels].sort() };
}

// The row under label sets `sets`: label -> term, or null if ill formed.
function denote(sets, row) {
  const out = new Map();
  for (const [k, t] of row.fields) {
    if (out.has(k)) return null;
    out.set(k, t);
  }
  for (const m of row.tails) {
    for (const k of sets[m]) {
      if (out.has(k)) return null;
      out.set(k, { v: `${m}.${k}` });
    }
  }
  return out;
}

// A term, with records built from `sets`; null if a record is ill formed.
function term(sets, t) {
  if (typeof t === 'string') return { c: t, args: [] };
  if (isTv(t)) return t;
  const d = denote(sets, t.rec);
  if (!d) return null;
  const ks = [...d.keys()].sort();
  const args = ks.map(k => term(sets, d.get(k)));
  return args.includes(null) ? null : { c: `Rec:${ks.join(',')}`, args };
}

// The type equations of the problem under `sets`, or null if a label
// constraint fails.
function equations(sets, steps) {
  const eqs = [];
  for (const c of steps) {
    if (c.k === 'lacks') {
      if (sets[c.v].includes(c.l)) return null;
      continue;
    }
    const l = denote(sets, c.l), r = denote(sets, c.r);
    if (!l || !r) return null;
    if (c.k === 'dis') {
      if ([...l.keys()].some(k => r.has(k))) return null;
    } else {
      if (l.size !== r.size || [...l.keys()].some(k => !r.has(k))) {
        return null;
      }
      for (const [k, t] of l) eqs.push([t, r.get(k)]);
    }
    for (const t of [...l.values(), ...r.values()]) {
      if (term(sets, t) === null) return null;
    }
  }
  return eqs.map(([a, b]) => [term(sets, a), term(sets, b)]);
}

export function unify(eqs) {
  const sub = new Map();
  const res = t => (isTv(t) && sub.has(t.v) ? res(sub.get(t.v)) : t);
  const occurs = (v, t) => {
    t = res(t);
    return isTv(t) ? t.v === v : t.args.some(a => occurs(v, a));
  };
  const work = [...eqs];
  while (work.length) {
    let [a, b] = work.pop();
    a = res(a);
    b = res(b);
    if (isTv(a) && isTv(b) && a.v === b.v) continue;
    if (isTv(a) || isTv(b)) {
      const [v, t] = isTv(a) ? [a.v, b] : [b.v, a];
      if (occurs(v, t)) return null;
      sub.set(v, t);
    } else if (a.c !== b.c) return null;
    else a.args.forEach((x, i) => work.push([x, b.args[i]]));
  }
  return sub;
}

// Every satisfiable assignment of label sets, with its unifier.
export function solutions(steps) {
  const { metas, labels } = namesOf(steps);
  const subsets = [...Array(1 << labels.length).keys()]
    .map(m => labels.filter((_, i) => m & (1 << i)));
  const out = [];
  const rec = (i, sets) => {
    if (i === metas.length) {
      const eqs = equations(sets, steps);
      const sub = eqs && unify(eqs);
      if (sub) out.push({ sets: { ...sets }, sub });
      return;
    }
    for (const s of subsets) rec(i + 1, { ...sets, [metas[i]]: s });
  };
  rec(0, {});
  return out;
}

// The solution whose sets are contained in every solution's, if any.
export function least(sols, metas) {
  if (!sols.length) return null;
  const meet = Object.fromEntries(metas.map(m => [m, sols[0].sets[m]
    .filter(k => sols.every(s => s.sets[m].includes(k)))]));
  return sols.find(s => metas.every(m => s.sets[m].join()
    === meet[m].join())) ?? null;
}

// Canonical text of terms with variables renamed in order of appearance.
export function canonical(ts) {
  const names = new Map();
  const show = t => {
    if (isTv(t)) {
      if (!names.has(t.v)) names.set(t.v, `_${names.size}`);
      return names.get(t.v);
    }
    return t.args.length ? `${t.c}(${t.args.map(show).join(',')})` : t.c;
  };
  return ts.map(show).join(' ; ');
}

// The oracle's typing of a solution: each type unknown and each field
// `m.l`, resolved through its unifier.
export function typing(sol, metas, tvs) {
  const res = t => {
    while (isTv(t) && sol.sub.has(t.v)) t = sol.sub.get(t.v);
    return isTv(t) ? t : { c: t.c, args: t.args.map(res) };
  };
  return canonical([...tvs.map(v => res({ v })), ...metas.flatMap(m =>
    sol.sets[m].map(k => res({ v: `${m}.${k}` })))]);
}
