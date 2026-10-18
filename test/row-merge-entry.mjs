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

const RIGIDS = ['R', 'S'];

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

// { v: 'accept' | 'refuse' | 'skipped', subst, base, failure?, what? }.
// `base` is the state after the hypotheses, for counting changes.
export function run(hyp, order) {
  const base = start(hyp);
  let subst = base;
  for (const c of order) {
    const found = entry.outcome(step(subst, c));
    if (found.constructor.name === 'Left') {
      return { v: 'skipped', what: found.value0, subst, base };
    }
    const result = found.value0;
    if (result.constructor.name === 'Contradiction') {
      return { v: 'refuse', failure: result.value0.failure, subst, base };
    }
    subst = result.value0;
  }
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
    upper: facts.upper.map(u => ({ meta: `m${u.meta}`,
      atoms: [...u.labels, ...u.rigids.map(nameOf)] })),
  };
}

export const changes = subst => entry.changes(subst);
export const solverMetas = subst => entry.solverMetas(subst);

// The homes `left = right` excludes under `subst` (ledger L31).
export const exclusions = (subst, c) =>
  entry.exclusions(subst)(rowOf(c.l))(rowOf(c.r)).map(e => ({
    meta: `m${e.meta}`, atom: e.labels[0] ?? nameOf(e.rigids[0]) }));

export const step1 = step;
export const start1 = start;
