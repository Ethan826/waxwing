// Diagnostics of the adopted configuration modelled from provenance
// (implementation plan Task B0; qt-trace.mjs records the provenance),
// compared across orders apart from the verdict kind, and the R10.2
// question for case 2's empty bindings.
//   render   per problem and order, the diagnostic the rules select:
//            a refusal met while solving: its reason and the step being
//            checked (location rule 1, the approved R7 for D6);
//            H's refusal: the predicate's site, the field, and the
//            proposed stable location: the latest written position
//            among the provenances of the facts that rule the field
//            out of each part (none written: the predicate's site);
//            Unresolved: the proposed R11 (the earliest predicate with
//            a field two parts may hold, else the earliest predicate),
//            its field and its candidate parts (left, right).
//            Counts `kindDiff` (verdict kind differs between orders)
//            and, separately, `renderDiff` (the modelled diagnostic
//            differs), by form; and checks the trace changes no verdict.
//   case2    how often case 2 binds a meta to `{}` (the right part and
//            the result have the same labels), and whether a later
//            failure meets such a meta (a mismatch whose rows reach
//            it), by the failure's other orders' reasons.
// Families: the 72 fixtures (their orders), raw and dense seeds, program
// shapes. Usage: node qt-render.mjs render|case2 [n]
import { readFileSync, readdirSync } from 'node:fs';
import * as F from './qt-facts.mjs';
import { verdictQT } from './qt-drive.mjs';
import { ADOPTED, runTraced, indexed, renamed } from './qt-trace.mjs';
import { generator } from '../row-merge-alternatives/gen.mjs';
import { shapedProblem } from '../open-row-merge/programs-gen.mjs';
import { mulberry } from '../open-row-merge/random.mjs';

const here = new URL('.', import.meta.url).pathname;
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const flat = (st, r) => F.flatten(st, r);
const holds = (st, row, c) => flat(st, row).tails.filter(F.isMeta)
  .some(m => !F.cannotHold(st, m, c));

// The labels of the result side left after cancelling the parts.
function constants(st, p) {
  const R = flat(st, p.r), S = flat(st, p.s), T = flat(st, p.t);
  return F.minus(T.fields, [...R.fields, ...S.fields]);
}

function unresolved(st) {
  const ps = [...st.preds].sort((a, b) => a.site - b.site || a.seq - b.seq);
  const pick = p => constants(st, p).find(c => holds(st, p.r, c)
    && holds(st, p.s, c));
  const p = ps.find(pick) ?? ps[0];
  const c = pick(p) ?? constants(st, p)[0] ?? null;
  const can = c === null ? [] : ['left', 'right']
    .filter((k, i) => holds(st, i ? p.s : p.r, c));
  return { form: 'D4', site: p.site, seq: p.seq, field: c, can };
}

// H's refusal as the stable rule renders it.
function homeless(st, tr) {
  for (const p of [...st.preds].sort((a, b) => a.site - b.site
    || a.seq - b.seq)) {
    const R = flat(st, p.r), S = flat(st, p.s), T = flat(st, p.t);
    const sides = F.residue(st, { fields: [...R.fields, ...S.fields],
      tails: [...R.tails, ...S.tails] }, T);
    for (const [i, side] of sides.entries()) {
      for (const c of side.ks) {
        const ms = sides[1 - i].ms;
        if (!ms.every(m => F.cannotHold(st, m, c))) continue;
        const why = ms.map(m => earliest(st, tr, m, c));
        const written = why.filter(x => x !== null);
        return { form: 'H', site: p.site, seq: p.seq, field: c,
          at: written.length ? Math.max(...written) : p.site,
          notes: [...new Set(written)].sort((a, b) => a - b) };
      }
    }
  }
  return { form: 'H?' };
}

// The earliest written provenance of a fact that rules c out of m.
function earliest(st, tr, m, c) {
  const keys = [...(st.excl.get(m) ?? [])].map(a => `${m}>${a}`);
  const ok = keys.filter(k => F.excludes(st, m, c)
    ? k === `${m}>${F.isLab(c) ? F.nameOf(c) : c}` : true);
  const ps = ok.map(k => tr.prov.get(k)).filter(x => x !== undefined);
  return ps.length ? Math.min(...ps) : null;
}

export function diagnostic(run) {
  if (run.v === 'accept') return { form: 'accept' };
  if (run.v === 'D4') return unresolved(run.st);
  if (run.why === 'no home') return homeless(run.st, run.tr);
  return { form: 'solve', why: renamed(run.why), at: run.failedAt };
}

function* problems(n) {
  const dir = `${here}../../test/fixtures/r005b/`;
  for (const f of readdirSync(dir).sort()) {
    const x = JSON.parse(readFileSync(dir + f, 'utf8'));
    if (!x.rows) continue;
    const ss = indexed(x.rows.steps);
    yield ['fixtures', x.name, x.rows.hyp,
      ss.length <= 7 ? perms(ss) : [ss, [...ss].reverse()]];
  }
  for (const [mode, seed] of [['raw', 21], ['dense', 21]]) {
    const { gen, perms: five } = generator(seed, mode === 'dense');
    for (let i = 0; i < n; i++) {
      const q = gen();
      yield [mode, i, q.hyp, five(indexed(q.cs))];
    }
  }
  const rand = mulberry(1);
  for (let i = 0; i < n; i++) {
    const q = shapedProblem(rand);
    const hyp = { lacks: q.hyp.lacks,
      apart: q.hyp.apart.map(k => k.split('|')) };
    const cs = indexed(q.constraints);
    yield ['shapes', i, hyp, [cs, [...cs].reverse()]];
  }
}

const bump = (t, k) => { t[k] = (t[k] ?? 0) + 1; };

function render(n) {
  const out = {}, examples = [];
  let traceChanged = 0;
  for (const [fam, name, hyp, orders] of problems(n)) {
    const t = out[fam] ??= {};
    const runs = orders.map(o => runTraced(hyp, o));
    for (const [i, r] of runs.entries()) {
      if (verdictQT(hyp, orders[i], ADOPTED).v !== r.v) traceChanged++;
    }
    const kinds = new Set(runs.map(r => r.v));
    const shown = runs.map(r => JSON.stringify(diagnostic(r)));
    bump(t, 'problems');
    for (const x of new Set(shown.map(j => JSON.parse(j).form))) {
      bump(t, `has:${x}`);
    }
    if (kinds.size > 1) bump(t, 'kindDiff');
    else if (new Set(shown).size > 1) {
      const form = JSON.parse(shown[0]).form;
      bump(t, `renderDiff:${form}`);
      if (examples.length < 6) examples.push([fam, name, [...new Set(shown)]]);
    }
  }
  for (const [fam, t] of Object.entries(out)) {
    console.log(fam, JSON.stringify(t));
  }
  console.log('trace changed a verdict:', traceChanged);
  for (const e of examples) console.log('example', JSON.stringify(e));
  return traceChanged === 0;
}

// Does a mismatch's row reach a meta case 2 emptied?
const reaches = (st, tr, row) => {
  const seen = new Set(), work = [...row.tails];
  while (work.length) {
    const m = work.pop();
    if (seen.has(m)) continue;
    seen.add(m);
    if (tr.emptied.has(m)) return true;
    work.push(...(st.bind.get(m)?.tails ?? []));
  }
  return false;
};

function case2(n) {
  const out = {}, mixed = [];
  for (const [fam, name, hyp, orders] of problems(n)) {
    const t = out[fam] ??= {};
    const kinds = orders.map(o => {
      const r = runTraced(hyp, o);
      if (r.tr.emptied.size) bump(t, 'runsWithCase2Empty');
      if (r.v !== 'refuse') return r.v;
      const hit = r.tr.mismatches.some(([L, R]) => reaches(r.st, r.tr, L)
        || reaches(r.st, r.tr, R));
      const k = hit ? 'mismatchAtCase2Empty'
        : /^mismatch/.test(r.why) ? 'mismatchOther'
          : r.why === 'no home' ? 'H' : 'fact';
      bump(t, k);
      return k;
    });
    if (kinds.includes('mismatchAtCase2Empty')
      && kinds.some(k => k !== 'mismatchAtCase2Empty')) {
      bump(t, 'problemsWhereOtherOrdersSayOtherwise');
      if (mixed.length < 6) mixed.push([fam, name, kinds]);
    }
  }
  for (const [fam, t] of Object.entries(out)) {
    console.log(fam, JSON.stringify(t));
  }
  for (const m of mixed) console.log('example', JSON.stringify(m));
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const run = { render, case2 }[process.argv[2]];
  if (!run) throw new Error('usage: render | case2 [n]');
  process.exitCode = run(Number(process.argv[3] ?? 2000)) ? 0 : 1;
}
