// Random raw problems and program-shaped merge scenarios (alternating),
// solver verdicts compared with the independent oracle. Draft 2 ran this
// against the first author's oracle; this copy uses oracle.mjs (same
// meaning, no solution cap), so `skipped-cap` no longer occurs.
// Usage: node programs.mjs <seed> <problems>; SHARE=1 lets a merge's r
// meet the first meta, as two callbacks sharing a parameter do.
// Prints a tally: `<kind>:<verdict>` per problem, and any of BUG-unsound,
// BUG-hard-reject-sat, accept-no-least, accept-not-least (defects) and
// INCOMPLETE-least-exists (D4 although a least solution exists).
import * as S from './solver.mjs';
import { allSolutions, leastOf } from './oracle.mjs';
import { mulberry } from './random.mjs';
import { rawProblem, shapedProblem, LABELS } from './programs-gen.mjs';

const rand = mulberry(Number(process.argv[2] ?? 1));

const runChecker = p => {
  const st = S.makeState(p.hyp, 100);
  try {
    for (const c of p.constraints) {
      if (c.k === 'eq') {
        S.wellFormed(st, c.l);
        S.wellFormed(st, c.r);
        S.drain(st);
        S.unify(st, c.l, c.r);
      } else if (c.k === 'dis') {
        S.wellFormed(st, c.l);
        S.wellFormed(st, c.r);
        S.requireDisjoint(st, c.l, c.r);
      } else S.requireLacks(st, c.v, c.l);
      S.drain(st);
    }
    S.drain(st);
    if (S.stuck(st).length) return { verdict: 'ambiguous', st };
    return { verdict: 'accept', st, sol: S.solution(st, p.metas) };
  } catch (e) {
    if (e instanceof S.Fail) return { verdict: e.kind, st };
    throw e;
  }
};

// The oracle's encoding of the hypotheses: apart pairs as arrays.
const oracleHyp = hyp =>
  ({ lacks: hyp.lacks, apart: hyp.apart.map(k => k.split('|')) });

const same = (x, y, metas) => metas.every(m =>
  [...x[m]].sort().join() === [...y[m]].sort().join());
const tally = {};
const bump = k => { tally[k] = (tally[k] ?? 0) + 1; };
const examples = {};
const keep = (k, p, extra) => {
  examples[k] ??= [];
  if (examples[k].length < 3) examples[k].push({ p, ...extra });
};

const judge = (p, out, sols, lo, kind) => {
  if (out.verdict === 'accept') {
    const valid = sols.some(s => same(s, out.sol, p.metas));
    if (!valid) {
      bump('BUG-unsound');
      keep('unsound', p, { sol: out.sol });
    } else if (!lo) {
      bump('accept-no-least');
      keep('noleast', p, {});
    } else if (!same(lo, out.sol, p.metas)) {
      bump('accept-not-least');
      keep('notleast', p, { sol: out.sol, lo });
    }
  } else if (out.verdict === 'ambiguous') {
    if (sols.length === 0) bump('ambiguous-but-unsat');
    else if (lo) {
      bump('INCOMPLETE-least-exists:' + kind);
      keep('incomplete', p, { lo });
    } else bump('ambiguous-genuine:' + kind);
  } else if (sols.length > 0) {
    bump(`BUG-hard-reject-sat:${out.verdict}`);
    keep('hardreject', p, { verdict: out.verdict, sol: sols[0] });
  }
};

const N = Number(process.argv[3] ?? 3000);
for (let i = 0; i < N; i++) {
  const p = i % 2 ? rawProblem(rand) : shapedProblem(rand);
  if (p.metas.length > 7) {
    bump('skipped-size');
    continue;
  }
  const atoms = [...LABELS, ...p.rigids];
  const out = runChecker(p);
  const sols = allSolutions(p.metas, atoms, oracleHyp(p.hyp), p.constraints);
  const lo = leastOf(p.metas, oracleHyp(p.hyp), p.constraints, sols);
  const kind = i % 2 ? 'raw' : 'shaped';
  bump(`${kind}:${out.verdict}`);
  judge(p, out, sols, lo, kind);
  bump(`stats-commits:${out.st.stats.commits > 0}`);
}
console.log(JSON.stringify(tally, null, 1));
console.log(JSON.stringify(examples, null, 0).slice(0, 6000));
