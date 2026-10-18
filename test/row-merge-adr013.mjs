// ADR 013's record-row rules, written independently from the ADR's text
// (docs/adr/013-records.md, "rules 1-6" and lacks) for rows with at most
// one tail: the reference the compiler's several-tail solver must equal
// on one-tail problems (R005 Tranche B ledger L1, design §2.3). Labels
// only. Rule 1: the same labels and tails; rule 2: labels on one side
// extend the other side's meta tail; rule 3: labels on both sides give two
// distinct meta tails one fresh remainder; rule 4: a binding never gives
// a meta a label it lacks, and carries its lacks into the rest; anything
// else (a closed or rigid tail asked to grow, one tail on both sides, an
// occurs cycle) is the mismatch. A row's own labels are lacked by its
// tail where the row is made (Tranche A's implied lacks).
const isMeta = v => /^m/.test(v);

class Refused extends Error {}

export function adr013(hyp, steps) {
  const st = { bound: new Map(), lacks: new Map(), fresh: 0 };
  try {
    for (const c of steps) step(st, hyp, c);
  } catch (e) {
    if (e instanceof Refused) return { v: 'refuse' };
    throw e;
  }
  return { v: 'accept', value: m => flat(st, { fields: [], tails: [m] }) };
}

// The row's labels and its one tail, through the bindings.
function flat(st, row) {
  const fields = [...row.fields];
  let tail = row.tails[0] ?? null;
  while (tail !== null && st.bound.has(tail)) {
    const image = st.bound.get(tail);
    fields.push(...image.fields);
    tail = image.tail;
  }
  return { fields: fields.sort(), tail };
}

const lacksOf = (st, hyp, t) => (isMeta(t) ? st.lacks.get(t) ?? new Set()
  : new Set(hyp.lacks[t] ?? []));

function lack(st, hyp, t, label) {
  const row = flat(st, { fields: [], tails: [t] });
  if (row.fields.includes(label)) throw new Refused();
  if (row.tail === null) return;
  if (!isMeta(row.tail)) {
    if (!lacksOf(st, hyp, row.tail).has(label)) throw new Refused();
    return;
  }
  st.lacks.set(row.tail, new Set([...lacksOf(st, hyp, row.tail), label]));
}

function made(st, hyp, row) {
  const found = flat(st, row);
  if (new Set(found.fields).size !== found.fields.length) throw new Refused();
  if (found.tail === null) return;
  found.fields.forEach(l => lack(st, hyp, found.tail, l));
}

function bind(st, hyp, m, fields, tail) {
  const lacked = lacksOf(st, hyp, m);
  if (fields.some(l => lacked.has(l))) throw new Refused();
  if (tail === m) throw new Refused();
  if (tail !== null) {
    [...lacked, ...fields].forEach(l => lack(st, hyp, tail, l));
  }
  st.bound.set(m, { fields, tail });
}

function unify(st, hyp, l, r) {
  const a = flat(st, l), b = flat(st, r);
  for (const x of [a, b]) {
    if (new Set(x.fields).size !== x.fields.length) throw new Refused();
  }
  const onlyA = a.fields.filter(x => !b.fields.includes(x));
  const onlyB = b.fields.filter(x => !a.fields.includes(x));
  const ta = a.tail, tb = b.tail;
  if (!onlyA.length && !onlyB.length) {
    if (ta === tb) return;
    if (ta !== null && isMeta(ta)) return bind(st, hyp, ta, [], tb);
    if (tb !== null && isMeta(tb)) return bind(st, hyp, tb, [], ta);
    throw new Refused();
  }
  if (!onlyA.length) {
    if (ta === null || !isMeta(ta)) throw new Refused();
    return bind(st, hyp, ta, onlyB, tb);
  }
  if (!onlyB.length) {
    if (tb === null || !isMeta(tb)) throw new Refused();
    return bind(st, hyp, tb, onlyA, ta);
  }
  if (ta === null || tb === null || !isMeta(ta) || !isMeta(tb) || ta === tb) {
    throw new Refused();
  }
  const z = `m-${++st.fresh}`;
  bind(st, hyp, ta, onlyB, z);
  bind(st, hyp, tb, onlyA, z);
}

function step(st, hyp, c) {
  if (c.k === 'lacks') return lack(st, hyp, c.v, c.l);
  if (c.k !== 'eq') throw new Error(`not a one-tail step: ${c.k}`);
  made(st, hyp, c.l);
  made(st, hyp, c.r);
  return unify(st, hyp, c.l, c.r);
}
