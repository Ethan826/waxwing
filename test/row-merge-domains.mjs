// Task 0's exhaustive domains (R005 Tranche B plan), ported from
// research/open-row-merge/exhaustive-run.mjs: every problem of two
// equations between rows of at most one field and two tails (repeats
// allowed), plus nothing, one `lacks` or one `dis` of two tails, once up
// to renaming metas and labels. A: labels a, b; one rigid R with every
// lacks hypothesis; metas m0-m2. B: label a; metas m0-m3 (quiet
// equations). `oneTail` keeps the problems whose rows have at most one
// tail and no `dis` (ADR 013's domain, ledger L1).
const DOMAINS = {
  A: { labels: ['a', 'b'], metas: ['m0', 'm1', 'm2'], rigids: ['R'] },
  B: { labels: ['a'], metas: ['m0', 'm1', 'm2', 'm3'], rigids: [] },
};
const row = (fields, tails = []) => ({ fields, tails });
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));

function domain(name, oneTail) {
  const { labels, metas, rigids } = DOMAINS[name];
  const vars = [...metas, ...rigids];
  const tailSets = [[]];
  vars.forEach((v, i) => {
    tailSets.push([v]);
    if (!oneTail) vars.slice(i).forEach(w => tailSets.push([v, w]));
  });
  const rows = [[], ...labels.map(l => [l])]
    .flatMap(f => tailSets.map(t => row(f, t)));
  const eqs = [];
  rows.forEach((l, i) => rows.slice(i).forEach(r =>
    eqs.push({ k: 'eq', l, r })));
  const extras = [null,
    ...vars.flatMap(v => labels.map(l => ({ k: 'lacks', v, l }))),
    ...(oneTail ? [] : vars.flatMap((v, i) => vars.slice(i).map(w =>
      ({ k: 'dis', l: row([], [v]), r: row([], [w]) }))))];
  const renames = perms(metas).flatMap(ms => perms(labels).map(ls => {
    const map = Object.fromEntries([...metas.map((m, i) => [m, ms[i]]),
      ...labels.map((l, i) => [l, ls[i]]), ...rigids.map(r => [r, r])]);
    return x => map[x];
  }));
  const hyps = rigids.length
    ? [[], ...labels.map(l => [l]), labels].map(h => ({ R: h })) : [{}];
  const universe = [...labels, ...rigids];
  return { eqs, extras, renames, hyps, rigids, universe };
}

const rowText = (f, r) => `${r.fields.map(f).sort()}/${r.tails.map(f).sort()}`;
const cText = (f, c) => (c.k === 'lacks' ? `L${f(c.v)}${f(c.l)}`
  : [rowText(f, c.l), rowText(f, c.r)].sort().join(c.k));
const pText = (f, cs) => cs.map(c => cText(f, c)).sort().join(' ');

// Every problem of the domain, or, with `stride`, those among the
// candidates whose index is `w` modulo `stride` (a deterministic sample:
// the candidates are counted before the renaming check, so the sample
// costs its own size).
export function* problems(name, { oneTail = false, w = 0, stride = 1 } = {}) {
  const { eqs, extras, renames, hyps, rigids, universe } = domain(name,
    oneTail);
  const canonical = cs => {
    const own = pText(x => x, cs);
    return renames.every(f => pText(f, cs) >= own);
  };
  let index = -1;
  for (let i = 0; i < eqs.length; i++) {
    for (let j = i; j < eqs.length; j++) {
      for (const extra of extras) {
        index++;
        if (index % stride !== w) continue;
        const cs = [eqs[i], eqs[j], ...(extra ? [extra] : [])];
        if (!canonical(cs)) continue;
        const rigid = cs.some(c => (c.k === 'lacks' ? [c.v]
          : [...c.l.tails, ...c.r.tails]).some(t => rigids.includes(t)));
        for (const lacks of rigid ? hyps : [{}]) {
          yield { hyp: { lacks, apart: [] }, cs, universe };
        }
      }
    }
  }
}

export const everyOrder = perms;
