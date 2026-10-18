// The raw and dense problem generators of research/open-row-merge/
// perm.mjs, copied here (perm.mjs runs on import) with the same
// distribution and draw order, so a seed gives the same problems: three
// labels, two rigids, four metas, two to four constraints.
import { mulberry, sampleWith } from '../open-row-merge/random.mjs';

const LAB = ['a', 'b', 'c'], RIG = ['R', 'S'];
const META = ['m0', 'm1', 'm2', 'm3'];
const row = (fields, tails = []) => ({ fields, tails });

export function generator(seed, dense) {
  const rnd = mulberry(seed);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const sample = sampleWith(rnd);
  const randRow = useRig => {
    const f = sample(LAB, Math.floor(rnd() * 3));
    const t = sample([...META, ...(useRig ? RIG : [])],
      Math.floor(rnd() * 3));
    return row(f, t);
  };
  const denseEquation = () => ({ k: 'eq', l: row([], sample(META, 2)),
    r: row(sample(LAB, 1 + Math.floor(rnd() * 2)),
      rnd() < 0.3 ? [pick(META)] : []) });
  const gen = () => {
    const useRig = rnd() < 0.5;
    const hyp = { lacks: {}, apart: [] };
    if (useRig) {
      for (const r of RIG) hyp.lacks[r] = LAB.filter(() => rnd() < 0.6);
      if (rnd() < 0.6) hyp.apart.push(['R', 'S']);
    }
    const cs = [];
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = rnd();
      if (dense && x < 0.65) cs.push(denseEquation());
      else if (x < 0.65) {
        cs.push({ k: 'eq', l: randRow(useRig), r: randRow(useRig) });
      } else if (x < 0.85) {
        cs.push({ k: 'dis', l: row([], [pick(META)]),
          r: row([], [pick(META)]) });
      } else cs.push({ k: 'lacks', v: pick(META), l: pick(LAB) });
    }
    return { hyp, cs, universe: [...LAB, ...(useRig ? RIG : [])] };
  };
  const perms = cs => {
    const out = [cs, [...cs].reverse()];
    for (let i = 0; i < 3; i++) out.push(sample(cs, cs.length));
    return out;
  };
  return { gen, perms };
}

export const metasOf = cs => [...new Set(cs.flatMap(c => (c.k === 'lacks'
  ? [c.v] : [...c.l.tails, ...c.r.tails])).filter(t => /^m/.test(t)))];
