// PROTOTYPE, the drain and the read-outs (see solver-facts.mjs).
import { isMeta, freshMeta, flatten, constantsOf, bind }
  from './solver-facts.mjs';
import { examine, residue } from './solver-solve.mjs';

const metasOf = p => [...p.left.tails, ...p.right.tails].filter(isMeta);

export const drain = st => {
  for (;;) {
    const before = st.version;
    for (const id of [...st.pending.keys()]) {
      const p = st.pending.get(id);
      if (!p) continue;
      // re-examine only if a meta it names changed since it was last seen
      if (!metasOf(p).some(m => (st.touched.get(m) ?? -1) > p.seen)) {
        continue;
      }
      st.stats.reexam++;
      examine(st, p, id);
    }
    if (st.version !== before) continue;
    // Fixpoint. Expand a quiet equation that shares an unbound meta with a
    // stuck one (oldest first), then drain again; otherwise stop. Off by
    // default: the design does not adopt it (opts.expand).
    if (!st.opts.expand) return;
    const stuckMetas = new Set(stuck(st).flatMap(p => {
      const r = residue(st, p.left, p.right);
      return [...r.m1, ...r.m2];
    }));
    const q = [...st.pending.entries()].find(([, p]) => {
      const r = residue(st, p.left, p.right);
      return r.c1.length + r.c2.length === 0
        && [...r.m1, ...r.m2].some(m => stuckMetas.has(m));
    });
    if (!q) return;
    expand(st, q[0]);
  }
};

// The k x l basis for a quiet equation (linear AC unification).
const expand = (st, id) => {
  const p = st.pending.get(id);
  st.pending.delete(id);
  const r = residue(st, p.left, p.right);
  if (r.m1.length < 2 || r.m2.length < 2) return examine(st, p, null);
  st.stats.expansions = (st.stats.expansions ?? 0) + 1;
  const content = new Map([...r.m1, ...r.m2].map(m => [m, []]));
  for (const x of r.m1) {
    for (const y of r.m2) {
      const z = freshMeta(st);
      content.get(x).push(z);
      content.get(y).push(z);
    }
  }
  for (const [m, tails] of content) bind(st, m, { fields: [], tails });
};

// Pending equations that still hold a constant (quiet ones excluded).
export const stuck = st => [...st.pending.values()].filter(p => {
  const r = residue(st, p.left, p.right);
  return r.c1.length + r.c2.length > 0;
});

// Each meta's constants, unsolved parts empty (the default).
export const solution = (st, metas) => Object.fromEntries(metas.map(m => {
  const r = flatten(st, { fields: [], tails: [m] });
  return [m, constantsOf(r).sort()];
}));
