// The compiler's row solver driven on labels-only problems (R005 Tranche
// B plan, Task 4), through Features.Check.RowEntry: each 'eq' and 'dis'
// step records both rows' own disjointness first, as the prototype's
// driver does (research/open-row-merge/drive.mjs), and every step's
// result is read through the three-way outcome. A placeholder (work a
// later task does) is never a verdict: the run is `skipped`. Encoding as
// the research scripts': labels lowercase, metas `m<n>`, rigids R and S.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const entry = await load('Features.Check.RowEntry');
const { Meta, Rigid } = await load('Features.Check.Flex');
const { Tuple } = await load('Data.Tuple');

const RIGIDS = ['R', 'S', 'T', 'U'];

export const flexOf = name => (name.startsWith('m')
  ? new Meta(Number(name.slice(1))) : new Rigid(RIGIDS.indexOf(name)));
export const nameOf = flex => (flex instanceof Meta ? `m${flex.value0}`
  : RIGIDS[flex.value0]);

const rowOf = r => entry.row(r.fields)(r.tails.map(flexOf));

const start = hyp => entry.hypotheses(
  Object.entries(hyp.lacks).map(([r, ls]) => Tuple.create(flexOf(r))(ls)))(
  (hyp.apart ?? []).map(([r, s]) => Tuple.create(flexOf(r))(flexOf(s))));

const stepOf = (subst, c) => {
  if (c.k === 'eq') return entry.equate(subst)(rowOf(c.l))(rowOf(c.r));
  if (c.k === 'dis') return entry.separate(subst)(rowOf(c.l))(rowOf(c.r));
  return entry.lacking(subst)(flexOf(c.v))(c.l);
};

// One step's outcome as the runner reads it (RowOutcome `stepped`):
// `{ skipped: what }` for a placeholder (work a later task does),
// `{ refuse: failure }` for a contradiction, `{ subst }` when it went on.
// A limit reached or an internal failure is no verdict and no skip: it
// fails the run (throws), so a runner can never count it as an honest
// refusal.
export function classify(found) {
  if (found.constructor.name === 'Left') return stopped(found.value0);
  const result = found.value0;
  if (result.constructor.name === 'Left') {
    return { refuse: result.value0.failure };
  }
  return { subst: result.value0 };
}

// The end of a body as the runner reads it (RowOutcome `concluded`):
// `{ subst }` Solved, `{ unresolved: subst, merges }`, `{ refuse:
// failure }` (H's refusal among them), or a placeholder's skip.
export function classifyEnd(found) {
  if (found.constructor.name === 'Left') return stopped(found.value0);
  const result = found.value0;
  const name = result.constructor.name;
  if (name === 'Contradiction') return { refuse: result.value0.failure };
  if (name === 'Solved') return { subst: entry.settledSubst(result.value0) };
  if (name === 'Unresolved') {
    return { unresolved: entry.settledSubst(result.value0),
      merges: result.value1 };
  }
  throw new Error(`unexpected outcome ${name}`);
}

const stopped = stop => {
  if (stop.constructor.name === 'Unfinished') return { skipped: stop.value0 };
  throw new Error(`row solver stopped: ${stop.constructor.name} ${
    stop.value0 ?? ''}`);
};

export const outcomeOf = either => entry.stepped(either);

// Whether a failure is H's refusal (B4): `Homeless` inside its predicate.
export const byH = failure => failure?.constructor.name === 'FromMerge'
  && failure.value1.constructor.name === 'Homeless';

// { v: 'accept' | 'refuse' | 'unresolved' | 'skipped', subst, base,
// failure?, what? }. `base` is the state after the hypotheses, for
// counting changes. The run ends at the end of a body (RowEntry
// `finish`, or `end` given: `finishWithoutH` for H off, or a judge):
// since B4 a predicate still waiting there is H's refusal or Unresolved.
export function run(hyp, order, end = entry.finish) {
  const base = start(hyp);
  let subst = base;
  for (const c of order) {
    const found = classify(entry.stepped(stepOf(subst, c)));
    if ('skipped' in found) {
      return { v: 'skipped', what: found.skipped, subst, base };
    }
    if ('refuse' in found) {
      return { v: 'refuse', failure: found.refuse, subst, base };
    }
    subst = found.subst;
  }
  const last = classifyEnd(end(subst));
  if ('skipped' in last) {
    return { v: 'skipped', what: last.skipped, subst, base };
  }
  if ('refuse' in last) {
    return { v: 'refuse', failure: last.refuse, subst, base, atEnd: true };
  }
  if ('unresolved' in last) {
    return { v: 'unresolved', subst: last.unresolved, base,
      merges: last.merges };
  }
  return { v: 'accept', subst: last.subst, base };
}

// The state read out raw, in the research encoding: each binding one
// level deep, and the facts. Interpreting it is the test's own business.
export function stateOf(subst) {
  const facts = entry.facts(subst);
  return {
    bindings: new Map(entry.bindings(subst).map(b =>
      [`m${b.meta}`, { fields: b.labels, tails: b.tails.map(nameOf) }])),
    lacks: facts.lacks.map(f => ({ tail: nameOf(f.tail), labels: f.labels })),
    apart: facts.apart.map(p => [nameOf(p.value0), nameOf(p.value1)]),
    merges: entry.merges(subst).map(m => ({ left: rowRead(m.left),
      right: rowRead(m.right), result: rowRead(m.result) })),
  };
}

const rowRead = r => ({ fields: r.labels, tails: r.tails.map(nameOf) });

// Each predicate's case-3 moves (rules §5's lineage), by identity.
export const lineages = subst => entry.lineages(subst);

export const changes = subst => entry.changes(subst);
export const solverMetas = subst => entry.solverMetas(subst);

export const step1 = stepOf;
export const start1 = start;

// The end of a body without H, or with an injected judge (plan §4.2).
export const finishWithoutH = subst => entry.finishWithoutH(subst);
export const finishWith = judge => subst => entry.finishWith(judge)(subst);
