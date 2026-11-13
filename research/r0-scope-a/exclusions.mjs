// Scope A's review follow-up (dossier §18.190): among the programs
// membership.mjs leaves in scope (no effect-row head), which use a holder
// head inside an `app` (D6.3) and which hold an arrow inside an `app`
// argument (D6.4). Evidence only; reads membership.json and generates
// each declaration's problem with the committed checker.
// usage: node research/r0-scope-a/exclusions.mjs <membership.json>
import { readFileSync } from 'node:fs';
import { sourcesOf } from '../../test/r0-effects-pin-run.mjs';
import { problemsOf, resolved } from '../../test/r0-generate-support.mjs';

const membership = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const inScope = new Set(membership.rows
  .filter(row => !row.decls.some(decl => decl.effectRowArgs))
  .map(row => row.origin));

const heads = (value, found = []) => {
  if (Array.isArray(value)) value.forEach(item => heads(item, found));
  else if (value !== null && typeof value === 'object') {
    if ('app' in value && 'data' in value.app.head)
      found.push(value.app.head.data);
    Object.values(value).forEach(item => heads(item, found));
  }
  return found;
};
const arrowInApp = (value, inside = false) => {
  if (Array.isArray(value)) return value.some(item => arrowInApp(item,
    inside));
  if (value === null || typeof value !== 'object') return false;
  if ('fun' in value && inside) return true;
  if ('app' in value) return value.app.args.some(arg =>
    arrowInApp(arg, true));
  return Object.values(value).some(item => arrowInApp(item, inside));
};

const holderHead = [];
const arrowArgument = [];
const sources = (await sourcesOf()).filter(s => inScope.has(s.origin));
for (const source of sources) {
  const problems = problemsOf(resolved(source.source))
    .map(found => found.problem);
  const parts = problem => [problem.d, problem.b, problem.bq];
  if (problems.some(problem => heads(parts(problem)).some(head =>
    problem.holders.holding.includes(head)))) holderHead.push(source.origin);
  if (problems.some(problem => arrowInApp(parts(problem))))
    arrowArgument.push(source.origin);
}
console.log(JSON.stringify({ inScope: sources.length, holderHead,
  arrowArgument }, null, 1));
