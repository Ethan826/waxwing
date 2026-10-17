// Seeded generators shared by the scripts, so every run is reproducible
// from its seed. `mulberry` is the 32-bit mixer the campaigns used (perm,
// programs, switch, switch2); `lcg` the linear congruential generator of
// growth and sat13. Each returns a function giving numbers in [0, 1).
export const mulberry = start => {
  let seed = start;
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const lcg = start => {
  let seed = start;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
};

// k distinct elements of xs, drawn with `next`.
export const sampleWith = next => (xs, k) => {
  const pool = [...xs];
  const out = [];
  while (out.length < k && pool.length) {
    out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  }
  return out;
};

// A positive one-in-three clause list: m clauses of 3 distinct variables
// out of n, drawn with `next`.
export const clausesWith = (next, n, m) => [...Array(m)].map(() => {
  const vars = new Set();
  while (vars.size < 3) vars.add(Math.floor(next() * n));
  return [...vars];
});

// Whether some assignment of n variables puts exactly one true variable
// in every clause.
export const oneInThree = (n, clauses) => {
  for (let a = 0; a < 1 << n; a++) {
    if (clauses.every(c => c.filter(v => a & (1 << v)).length === 1)) {
      return true;
    }
  }
  return false;
};
