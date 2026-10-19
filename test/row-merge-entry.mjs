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

const step = (subst, c) => {
  if (c.k === 'eq') return entry.equate(subst)(rowOf(c.l))(rowOf(c.r));
  if (c.k === 'dis') return entry.separate(subst)(rowOf(c.l))(rowOf(c.r));
  return entry.lacking(subst)(flexOf(c.v))(c.l);
};

// One step's outcome as the runner reads it: `{ skipped: what }` for a
// placeholder (work a later task does), `{ refuse: failure }` for a
// contradiction, `{ subst }` when solved. A limit reached or an internal
// failure is no verdict and no skip: it fails the run (throws), so a
// runner can never count it as an honest refusal.
export function classify(found) {
  if (found.constructor.name === 'Left') {
    const stop = found.value0;
    if (stop.constructor.name === 'Unfinished') return { skipped: stop.value0 };
    throw new Error(`row solver stopped: ${stop.constructor.name} ${
      stop.value0 ?? ''}`);
  }
  const result = found.value0;
  if (result.constructor.name === 'Contradiction') {
    return { refuse: result.value0.failure };
  }
  if (result.constructor.name === 'Solved') return { subst: result.value0 };
  throw new Error(`unexpected outcome ${result.constructor.name}`);
}

export const outcomeOf = either => entry.outcome(either);

// { v: 'accept' | 'refuse' | 'skipped', subst, base, failure?, what? }.
// `base` is the state after the hypotheses, for counting changes. Since
// B3 the run ends at the end of a body (RowEntry `finish`): a predicate
// still waiting there is placeholder P5, a skipped run.
export function run(hyp, order) {
  const base = start(hyp);
  let subst = base;
  for (const c of order) {
    const found = classify(entry.outcome(step(subst, c)));
    if ('skipped' in found) {
      return { v: 'skipped', what: found.skipped, subst, base };
    }
    if ('refuse' in found) {
      return { v: 'refuse', failure: found.refuse, subst, base };
    }
    subst = found.subst;
  }
  const end = classify(entry.finish(subst));
  if ('skipped' in end) return { v: 'skipped', what: end.skipped, subst, base };
  return { v: 'accept', subst, base };
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

export const step1 = step;
export const start1 = start;
