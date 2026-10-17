// Classifies the examples of docs/plans/2026-10-17-open-row-merge-
// diagnostics.md with the research prototype (labels only).
// Run: node diag.mjs <path to research/open-row-merge>
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = pathToFileURL(resolve(process.argv[2]) + '/');
const { verdict, row, tail } = await import(new URL('drive.mjs', dir));
const O = await import(new URL('oracle.mjs', dir));
const dis = (a, b) => ({ k: 'dis', l: tail(a), r: tail(b) });
const eq = (l, r) => ({ k: 'eq', l, r });
const has = (m, ...ls) => eq(tail(m), row(ls));
const lacks = (v, l) => ({ k: 'lacks', v, l });
const H0 = { lacks: {}, apart: [] };
const run = (name, steps, H = H0) => {
  const metas = [...new Set(steps.flatMap(c => (c.k === 'lacks' ? [c.v]
    : [...c.l.tails, ...c.r.tails])).filter(O.isMeta))].sort();
  const atoms = [...new Set(steps.flatMap(c => (c.k === 'lacks' ? [c.l]
    : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails]))
    .filter(a => !O.isMeta(a)))].sort();
  const v = verdict(H, steps);
  const n = O.allSolutions(metas, atoms, H, steps).length;
  console.log(`${name}: ${v.v}${v.why ? ` (${v.why})` : ''}; ${n} sol.`);
};
const two = [dis('m0', 'm1')];
const three = [dis('m0', 'm1'), dis('m0', 'm2'), dis('m1', 'm2')];
const sum2 = r => eq(row([], ['m0', 'm1']), r);
const sum3 = r => eq(row([], ['m0', 'm1', 'm2']), r);
const xy = row(['x', 'y']), xyz = row(['x', 'y', 'z']);
const fix2 = [...two, has('m0', 'x'), has('m1', 'y'), sum2(xy)];
run('1', [...two, sum2(xy)]);
run('1 fix', fix2);
run('2', [...three, sum3(xy)]);
run('2 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2'),
  sum3(xy)]);
run('3', [...three, sum3(xyz), has('m2', 'v')]);
run('3 fix', [...three, sum3(xyz), has('m2', 'z'), has('m0', 'x'),
  has('m1', 'y')]);
run('4 (inner equation)', [...two, sum2(xy)]);
run('4 fix', fix2);
run('5', [...two, sum2(xy), has('m1', 'z')]);
run('5 fix', [...two, sum2(xy), has('m1', 'y')]);
run('6', [...two, sum2(xy)]);
run('6 fix (one tail)', [eq(tail('m0'), xy)]);
run('7 (annotation.mjs order)', [...two, sum2(xy)]);
run('7 fix', [...two, sum2(xy), has('m0', 'x'), has('m1', 'y')]);
run('8', [...three, has('m0', 'x'), sum3(xyz)]);
run('8 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2', 'z'),
  sum3(xyz)]);
run('9', [...two, sum2(xy)]);
run('9 fix', fix2);
run('10', [...two, sum2(xy)]);
run('10 fix', fix2);
run('11', [...two, sum2(xy), has('m0', 'x'), has('m1', 'y')]);
run('11 after p only', [...two, sum2(xy), has('m0', 'x')]);
run('12', [...three, sum3(xyz), has('m0', 'x')]);
run('12 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2', 'z'),
  sum3(xyz), has('m0', 'x')]);
run('13', [...two, sum2(xy), has('m0', 'z')]);
run('13 fix', [...two, sum2(xy), has('m0', 'x')]);
run('14', [...two, sum2(xy), lacks('m0', 'x'), lacks('m1', 'x')]);
run('14 lacks first', [...two, lacks('m0', 'x'), lacks('m1', 'x'),
  sum2(xy)]);
run('14 fix', [...two, sum2(xy), lacks('m0', 'y'), lacks('m1', 'x')]);
run('15', [...two, has('m0', 'x'), has('m1', 'x')]);
run('15 fix', [...two, has('m0', 'x'), has('m1', 'y')]);
run('16', [{ k: 'dis', l: tail('R'), r: tail('S') }]);
run('16 fix', [{ k: 'dis', l: tail('R'), r: tail('S') }],
  { lacks: {}, apart: [['R', 'S']] });
run('17', [...three, sum3(xy), has('m0', 'x'), has('m1', 'y'),
  has('m2', 'z')]);
run('17 fix', [...three, sum3(xyz), has('m0', 'x'), has('m1', 'y'),
  has('m2', 'z')]);
run('18', [...two, sum2(row([], ['T']))]);
run('18 fix', [...two, eq(tail('m0'), row([], ['T'])), has('m1'),
  sum2(row([], ['T']))]);
run('18 wrong fix', [{ k: 'dis', l: tail('T'), r: tail('T') }]);
const bound = [...two, sum2(xy), dis('m2', 'm3'),
  eq(tail('m0'), tail('m2')), eq(row([], ['m2', 'm3']), row(['y', 'z']))];
run('19 no argument', bound);
run('19', [...bound, has('m0', 'z')]);
run('19 with { x: 1 }', [...bound, has('m0', 'x')]);
run('19 fix', [...bound, has('m0', 'y')]);
run('lone meta, lack, { x }', [lacks('m0', 'x'), has('m0', 'x')]);
run('lone meta, lack, { x, y }', [lacks('m0', 'x'), has('m0', 'x', 'y')]);
