// Z3 as an independent second oracle for the labels-only problems,
// cross-checked against research/open-row-merge/oracle.mjs (brute
// force). Per problem: satisfiable or not; the number of solutions
// (blocking-clause enumeration up to CAP); the least solution, computed
// as the design's §2.7 says (an atom is in the meet iff the problem with
// it excluded is unsatisfiable; the meet is least iff it is a solution).
// Then each verdict claim of the current design's prototype and of
// alternative A is checked against Z3 alone: accept => Z3 confirms the
// emitted assignment satisfies the problem and equals the meet;
// refuse => Z3 says unsatisfiable. Z3 is not a dependency of the
// repository: pass the module's path (README, "Z3").
// Usage: Z3_MODULE=<.../z3-solver/build/node.js> node z3-oracle.mjs
//   <raw|dense|fixtures> [seed] [problems]
import { readdirSync, readFileSync } from 'node:fs';
import { verdict } from '../open-row-merge/drive.mjs';
import { allSolutions, leastOf, isMeta } from '../open-row-merge/oracle.mjs';
import * as S from '../open-row-merge/solver.mjs';
import { verdictA } from './alt-drive.mjs';
import * as A from './alt-solver.mjs';
import { generator, metasOf } from './gen.mjs';
import { encoder, readModel } from './z3-encode.mjs';

const CAP = 64;
const { init } = await import(process.env.Z3_MODULE);
const { Context, Z3: low } = await init();
const Z3 = Context('main');
const encode = encoder(Z3);
const tally = {};
const bump = k => { tally[k] = (tally[k] || 0) + 1; };
const key = s => JSON.stringify(Object.keys(s).sort()
  .map(m => [m, [...s[m]].sort()]));

async function analyse(p) {
  const { formulas, vars } = encode(p);
  const solver = new Z3.Solver();
  solver.add(...formulas);
  const sat = (await solver.check()) === 'sat';
  const sols = [];
  solver.push();
  while (sols.length < CAP && (await solver.check()) === 'sat') {
    const s = readModel(Z3, solver.model(), vars);
    sols.push(s);
    solver.add(Z3.Or(...[...vars].flatMap(([m, row]) => [...row]
      .map(([a, b]) => (s[m].includes(a) ? Z3.Not(b) : b)))));
  }
  solver.pop();
  let least = null;
  if (sat) {
    const meet = {};
    for (const [m, row] of vars) {
      meet[m] = [];
      for (const [a, b] of row) {
        if ((await solver.check(Z3.Not(b))) === 'unsat') meet[m].push(a);
      }
    }
    if (await holds(solver, vars, meet)) least = meet;
  }
  return { sat, sols, least, solver, vars };
}

async function holds(solver, vars, asg) {
  const fixed = [...vars].flatMap(([m, row]) => [...row]
    .map(([a, b]) => (asg[m].includes(a) ? b : Z3.Not(b))));
  return (await solver.check(...fixed)) === 'sat';
}

async function crossCheck(p, orders) {
  const z = await analyse(p);
  const bf = allSolutions(p.metas, p.universe, p.hyp, p.cs);
  const bfLeast = leastOf(p.metas, p.hyp, p.cs, bf);
  bump('problems');
  if (z.sat !== bf.length > 0) bump('DIFF-sat');
  if (z.sols.length < CAP && z.sols.length !== bf.length) bump('DIFF-count');
  if (z.sols.length === CAP && bf.length < CAP) bump('DIFF-count');
  if (z.sols.length < CAP) {
    const want = new Set(bf.map(key));
    if (z.sols.some(s => !want.has(key(s)))) bump('DIFF-solutions');
  } else bump('countCapped');
  if ((z.least === null) !== (bfLeast === null)
    || (z.least && key(z.least) !== key(bfLeast))) bump('DIFF-least');
  for (const order of orders) {
    for (const [name, v, sol] of [
      ['current', verdict(p.hyp, order), S.solution],
      ['A', verdictA(p.hyp, order), A.solution]]) {
      bump(`${name}:${v.v}`);
      if (v.v === 'refuse' && z.sat) bump(`Z3-REJECTS-${name}-refuse`);
      if (v.v !== 'accept') continue;
      const got = sol(v.st, p.metas);
      if (!(await holds(z.solver, z.vars, got))) {
        bump(`Z3-REJECTS-${name}-solution`);
      }
      if (!z.least || key(got) !== key(z.least)) {
        bump(`Z3-REJECTS-${name}-least`);
      }
    }
  }
}

const fixtures = () => {
  const dir = new URL('../../test/fixtures/r005b/', import.meta.url);
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(f =>
    JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter(f => f.rows)
    .map(f => {
      const cs = f.rows.steps;
      const metas = metasOf(cs).sort();
      const universe = [...new Set(cs.flatMap(c => (c.k === 'lacks' ? [c.l]
        : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails])))]
        .filter(a => !isMeta(a)).sort();
      return { name: f.name, hyp: f.rows.hyp, cs, metas, universe };
    });
};

const kind = process.argv[2] ?? 'raw';
const start = Date.now();
if (kind === 'fixtures') {
  for (const p of fixtures()) {
    await crossCheck(p, [p.cs, [...p.cs].reverse()]);
    const z = await analyse(p);
    if (['odd-cycle', 'determinate', 'diag-01'].includes(p.name)) {
      console.log(`${p.name}: Z3 ${z.sols.length} solutions`);
    }
  }
} else {
  const { gen, perms } = generator(Number(process.argv[3] ?? 21),
    kind === 'dense');
  for (let i = 0; i < Number(process.argv[4] ?? 500); i++) {
    const q = gen();
    const p = { ...q, metas: metasOf(q.cs) };
    await crossCheck(p, perms(p.cs));
  }
}
console.log(JSON.stringify({ z3: low.get_full_version?.() ?? 'unknown',
  kind, args: process.argv.slice(3), ms: Date.now() - start, tally }));
process.exit(0);
