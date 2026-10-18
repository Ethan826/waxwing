// The compiler's row solver driven on labels-only problems (R005 Tranche
// B plan, Tasks 4-5), through Features.Check.RowEntry: each 'eq' and 'dis'
// step records both rows' own disjointness first, as the prototype's
// driver does (research/open-row-merge/drive.mjs), and every step drains
// the pending equations (design P8). A run's result is read only through
// the three-way outcome of the whole run (`concluded`): a step's failure
// classified, the last state through the end of a body. A single
// successful step is no verdict (Task 5). Encoding as the research
// scripts': labels lowercase, metas `m<n>`, rigids R and S. `wake` picks
// which pending equations a drain re-examines: the indexed wake-up the
// checker uses, or `rescan` (every one, to a fixpoint), the reference.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
export const entry = await load('Features.Check.RowEntry');
const { Meta, Rigid } = await load('Features.Check.Flex');
const { Tuple } = await load('Data.Tuple');
const { Left, Right } = await load('Data.Either');

const RIGIDS = ['R', 'S'];
export const WAKES = { indexed: entry.indexed, rescan: entry.rescan };

export const flexOf = name => (name.startsWith('m')
  ? new Meta(Number(name.slice(1))) : new Rigid(RIGIDS.indexOf(name)));
export const nameOf = flex => (flex instanceof Meta ? `m${flex.value0}`
  : RIGIDS[flex.value0]);

const rowOf = r => entry.row(r.fields)(r.tails.map(flexOf));

const start = hyp => entry.hypotheses(
  Object.entries(hyp.lacks).map(([r, ls]) => Tuple.create(flexOf(r))(ls)))(
  (hyp.apart ?? []).map(([r, s]) => Tuple.create(flexOf(r))(flexOf(s))));

const step = (wake, subst, c) => {
  if (c.k === 'eq') return entry.equate(wake)(subst)(rowOf(c.l))(rowOf(c.r));
  if (c.k === 'dis') {
    return entry.separate(wake)(subst)(rowOf(c.l))(rowOf(c.r));
  }
  if (c.k === 'lacksOlder') {
    return entry.lackingOlder(wake)(subst)(flexOf(c.v))(c.l);
  }
  return entry.lacking(wake)(subst)(flexOf(c.v))(c.l);
};

// The outcome of a whole run as the runner reads it: `{ skipped: what }`
// for a placeholder (work a later task does), `{ refuse: failure }` for a
// contradiction, `{ subst }` when solved, `{ subst, unresolved }` when
// equations still wait. A limit reached or an internal failure is no
// verdict and no skip: it fails the run (throws), so a runner can never
// count it as an honest refusal.
export function classify(found) {
  if (found.constructor.name === 'Left') {
    const stop = found.value0;
    if (stop.constructor.name === 'Unfinished') return { skipped: stop.value0 };
    throw new Error(`row solver stopped: ${stop.constructor.name} ${
      stop.value0 ?? ''}`);
  }
  const result = found.value0;
  const name = result.constructor.name;
  if (name === 'Contradiction') return { refuse: result.value0.failure };
  if (name === 'Solved') return { subst: entry.settledSubst(result.value0) };
  if (name === 'Unresolved') {
    return { subst: entry.settledSubst(result.value0), unresolved: true };
  }
  throw new Error(`unexpected outcome ${name}`);
}

export const concluded = either => entry.concluded(either);

// { v: 'accept' | 'refuse' | 'D4' | 'skipped', subst, base, failure?,
// what? }. `base` is the state after the hypotheses, for counting changes.
export function run(hyp, order, wake = WAKES.indexed) {
  const base = start(hyp);
  let subst = base;
  for (const c of order) {
    const next = step(wake, subst, c);
    if (next instanceof Left) {
      const found = classify(concluded(next));
      if ('skipped' in found) {
        return { v: 'skipped', what: found.skipped, subst, base };
      }
      return { v: 'refuse', failure: found.refuse, subst, base };
    }
    subst = next.value0;
  }
  const found = classify(concluded(new Right(subst)));
  if ('skipped' in found) {
    return { v: 'skipped', what: found.skipped, subst, base };
  }
  return { v: found.unresolved ? 'D4' : 'accept', subst: found.subst, base };
}

// The state read out raw, in the research encoding: each binding one
// level deep, the facts and the pending equations (each side's labels
// and tails). Interpreting it is the test's own business.
export function stateOf(subst) {
  const facts = entry.facts(subst);
  const side = s => ({ fields: s.labels, tails: s.tails.map(nameOf) });
  return {
    bindings: new Map(entry.bindings(subst).map(b =>
      [`m${b.meta}`, { fields: b.labels, tails: b.tails.map(nameOf) }])),
    lacks: facts.lacks.map(f => ({ tail: nameOf(f.tail), labels: f.labels })),
    apart: facts.apart.map(p => [nameOf(p.value0), nameOf(p.value1)]),
    upper: facts.upper.map(u => ({ meta: `m${u.meta}`,
      atoms: [...u.labels, ...u.rigids.map(nameOf)] })),
    pending: entry.pending(subst).map(p => ({ id: p.id, quiet: p.quiet,
      l: side(p.left), r: side(p.right) })),
  };
}

export const changes = subst => entry.changes(subst);
export const solverMetas = subst => entry.solverMetas(subst);

// The homes `left = right` excludes under `subst` (ledger L31).
export const exclusions = (subst, c) =>
  entry.exclusions(subst)(rowOf(c.l))(rowOf(c.r)).map(e => ({
    meta: `m${e.meta}`, atom: e.labels[0] ?? nameOf(e.rigids[0]) }));

export const step1 = (subst, c) => step(WAKES.indexed, subst, c);
export const start1 = start;
export { Left, Right };
