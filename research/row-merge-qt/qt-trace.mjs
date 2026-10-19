// The adopted configuration (QT-strict + Sym + H; the implementation
// plan, docs/plans/2026-10-19-row-merge-implementation-plan.md) driven
// as qt-drive.mjs drives it, with each step's source position (its
// index in the problem as written) recorded, so that a diagnostic can be
// modelled from provenance rather than from the order of processing:
//   - a predicate's site is the step whose row made it (case 3 keeps
//     the predicate, so it keeps its site); `seq` orders the predicates
//     one step makes;
//   - a fact's provenance is the earliest step that stated it, carried
//     through the bind rule when a bound meta's facts move to its image;
//     a fact made while a predicate is solved has none (in the compiler
//     it has no written reason);
//   - a failure's site is the step being checked (location rule 1).
// The trace only records: with or without it every verdict is the same
// (checked by `node qt-render.mjs`, which compares both).
import * as F from './qt-facts.mjs';
import { desugar } from './qt-preds.mjs';
import { improveStrict, finishStrict } from './qt-strict.mjs';
import { ADAPT } from './qt-adapt.mjs';

export const ADOPTED = ADAPT['QT-strict+Sym+H'];

export function makeTrace(st) {
  const tr = { now: null, prov: new Map(), emptied: new Set(),
    mismatches: [] };
  tr.fact = k => {
    if (tr.now === null) return;
    const was = tr.prov.get(k);
    if (was === undefined || tr.now < was) tr.prov.set(k, tr.now);
  };
  tr.enter = k => {
    const back = tr.now;
    tr.now = tr.prov.get(k) ?? null;
    return back;
  };
  tr.leave = back => { tr.now = back; };
  tr.subtract = (left, empty) => {
    const f = F.flatten(st, left);
    if (empty && !f.fields.length && f.tails.length === 1
      && F.isMeta(f.tails[0])) tr.emptied.add(f.tails[0]);
  };
  tr.mismatch = (L, R) => tr.mismatches.push([L, R]);
  return tr;
}

// One run: the steps in this order, each carrying `idx`, its position
// as written. Returns the verdict, the state, the trace and, for a
// refusal, the failing step.
export function runTraced(hyp, steps, opts = ADOPTED) {
  const st = F.makeState(hyp, opts);
  const tr = makeTrace(st);
  st.trace = tr;
  let seq = 0, failedAt = null;
  const tag = idx => {
    for (const p of st.preds) {
      if (p.site === undefined) Object.assign(p, { site: idx, seq: seq++ });
    }
  };
  const settle = () => {
    const back = tr.now;
    tr.now = null;
    improveStrict(st);
    tr.now = back;
  };
  const made = (row, idx) => {
    const r = desugar(st, row);
    tag(idx);
    F.wellFormed(st, r);
    return r;
  };
  try {
    for (const c of steps) {
      failedAt = c.idx;
      tr.now = c.idx;
      seq = 0;
      if (c.k === 'eq') {
        const l = made(c.l, c.idx), r = made(c.r, c.idx);
        settle();
        F.unify(st, l, r);
      } else if (c.k === 'dis') {
        F.requireDisjoint(st, made(c.l, c.idx), made(c.r, c.idx));
      } else {
        F.requireDisjoint(st, F.tailRow(c.v), { fields: [c.l], tails: [] });
      }
      settle();
    }
  } catch (e) {
    if (!(e instanceof F.Fail)) throw e;
    return { v: 'refuse', why: e.message, st, tr, failedAt };
  }
  failedAt = null;
  tr.now = null;
  const v = finishStrict(st);
  return { v, why: st.why, st, tr, failedAt };
}

export const indexed = steps => steps.map((c, idx) => ({ ...c, idx }));
export const renamed = s => (s ?? '').replace(/m\d+/g, 'm');
