// The handler family's recorded shape (amin tranche 1, Task 9;
// statements §4 E4, E5), checked against the nodes it names. Shared by
// the corpus survey (r0-obligations-handler-survey.mjs) and the fixture
// tests (r0-obligations-handler.test.mjs). Each takes { at, effects,
// nodes, ambient, found }: `nodes` and `ambient` keyed by the shaped
// path's JSON, shaped values; `found` counts what was checked. It loads
// no compiler output, so a regression probe can run it over a compiler
// under test (test/regression-r0-amin-handler.mjs).
import { shape } from './regression-r0-amin-support.mjs';

// Key order differs between records built apart, so compare stably (as
// r0-canonical.mjs `stableStringify`, which loads the build's output).
export const key = value => JSON.stringify(value, (name, found) =>
  (found && typeof found === 'object' && !Array.isArray(found)
    ? Object.fromEntries(Object.keys(found).sort()
      .map(field => [field, found[field]]))
    : found));
const fresh = (path, role) => ({ EffFresh: [path, role] });
const tailOnly = variable => ({ labels: [], tail: { Just: [variable] } });
export const childPath = (path, ...names) => ({ root: path.root,
  steps: [...path.steps, ...names.map(name => (typeof name === 'number'
    ? { Index: [name] } : { Named: [name] }))] });

// The declaration's atom-free obligations, shaped, with their site.
const sited = effects => effects.obligations.map(item => ({
  provenance: shape(item.provenance), value: shape(item.value) }))
  .filter(item => item.provenance.AtSite)
  .map(item => ({ ...item.provenance.AtSite[0], value: item.value }));
const atPath = (items, path, rule) => items.filter(item =>
  key(item.path) === key(path) && key(item.rule) === key(rule));
// An obligation's role and value, as compared.
const entry = (role, value) => key([role, value]);
const consumption = (site, source, target, { marks, bare }) => entry(
  { Consumed: [site, 0] }, { Consume: [{ site, source, target, marks,
    bare }] });

// E4 at a literal: HandlerLit names the node's own mark and tails (A4),
// one clause row per clause, and the only obligations at the literal's
// path under E20 are it and each clause's two consumptions (A3).
export const literalProblems = ({ at, effects, nodes, ambient, found }) => {
  const items = sited(effects);
  const problems = [];
  const literals = items.filter(item => item.value.HandlerLit);
  for (const { path, role, value } of literals) {
    found.literals += 1;
    const where = `${at}: literal at ${key(path.steps)}`;
    const lit = value.HandlerLit[0];
    const node = nodes.get(key(path))?.MHandler;
    const clauseRows = lit.clauseRows.map((_, k) =>
      fresh(path, { Clauses: [k] }));
    const expected = { m: { Literal: [path] },
      inference: fresh(path, { HandlerInference: [] }),
      clauses: fresh(path, { HandlerClauses: [] }), clauseRows };
    if (!role.LiteralSite) problems.push(`${where}: role ${key(role)}`);
    if (key(lit) !== key(expected))
      problems.push(`${where}: HandlerLit is ${key(lit)}`);
    if (node === undefined || key(node[0].mark) !== key({ At: [lit.m] })
      || key(node[1].inference) !== key(tailOnly(lit.inference))
      || key(node[1].clauses) !== key({ Just: [tailOnly(lit.clauses)] }))
      problems.push(`${where}: HandlerLit differs from its node`);
    const count = lit.clauseRows.length;
    const body = k => childPath(path, 'Handler', 'clauses', k, 'body');
    if ((count > 0 && !nodes.has(key(body(count - 1))))
      || nodes.has(key(body(count))))
      problems.push(`${where}: ${count} clause rows`);
    // R9 Q5: clause k's ambient row is its clause row, the same variable.
    const ownAmbient = (row, k) => key(ambient.get(key(body(k))))
      === key(tailOnly(row));
    if (!lit.clauseRows.every(ownAmbient))
      problems.push(`${where}: a clause row is not its clause's ambient row`);
    // Each c_k into R ignoring marks, into C with marks, C bare.
    const clauseInto = (row, k) => [
      consumption({ ClauseIntoR: [k] }, tailOnly(row),
        tailOnly(lit.inference), { marks: false, bare: false }),
      consumption({ ClauseIntoC: [k] }, tailOnly(row),
        tailOnly(lit.clauses), { marks: true, bare: true })];
    const wanted = [entry({ LiteralSite: [] }, value),
      ...lit.clauseRows.flatMap(clauseInto)].sort();
    const there = atPath(items, path, { ExprRule: [20] })
      .map(item => entry(item.role, item.value)).sort();
    if (key(there) !== key(wanted))
      problems.push(`${where}: E20 obligations ${there.length}, `
        + `not HandlerLit and ${2 * count} clause consumptions`);
  }
  const minted = shape(effects.positions).filter(item => item.Literal)
    .map(item => key(item.Literal[0])).sort();
  const recorded = literals.map(item => key(item.path)).sort();
  if (key(minted) !== key(recorded))
    problems.push(`${at}: ${minted.length} literals, `
      + `${recorded.length} HandlerLit`);
  return problems;
};

// `f L + ρ`, the label under the frame mark in front of ρ.
const framed = (path, handler, outer) => handler.MHandler
  ? { labels: [{ ...handler.MHandler[0], mark: { At: [{ Frame: [path] }] } },
    ...outer.labels], tail: outer.tail }
  : outer;

// E5 at a `with`: Install names the frame, the handler child's type by
// identity and ρ; the body's ambient row is `f L + ρ` over it; an
// MHandler records InstallR and the installed-C site, any other type
// UnframedInstall and neither.
export const installProblems = ({ at, effects, nodes, ambient, found }) => {
  const items = sited(effects);
  const problems = [];
  const installs = items.filter(item => item.value.Install);
  for (const { path, role, value } of installs) {
    found.installs += 1;
    const where = `${at}: with at ${key(path.steps)}`;
    const install = value.Install[0];
    const handler = nodes.get(key(childPath(path, 'With', 'handler')));
    if (!role.InstallSite) problems.push(`${where}: role ${key(role)}`);
    if (key(install.frame) !== key({ Frame: [path] }))
      problems.push(`${where}: frame ${key(install.frame)}`);
    if (key(install.handler) !== key(handler))
      problems.push(`${where}: Install's handler is not the handler child's`);
    const body = ambient.get(key(childPath(path, 'With', 'body')));
    if (key(body) !== key(framed(path, install.handler, install.ambient)))
      problems.push(`${where}: the body's ambient row is not f L + ρ`);
    const rows = install.handler.MHandler?.[1];
    if (rows) found.framed += 1;
    // R into ρ ignoring marks; C (owned, else R's alias) with marks, bare.
    const wanted = (rows ? [consumption({ InstallR: [] }, rows.inference,
      install.ambient, { marks: false, bare: false }),
    consumption({ AtInstalledC: [] }, rows.clauses.Just?.[0]
      ?? rows.inference, install.ambient, { marks: true, bare: true })]
      : [entry({ UnframedWith: [] },
      { Unsupported: [{ UnframedInstall: [] }] })])
      .concat([entry({ InstallSite: [] }, value)]).sort();
    const there = atPath(items, path, { ExprRule: [21] })
      .filter(item => !item.role.WithNode)
      .map(item => entry(item.role, item.value)).sort();
    if (key(there) !== key(wanted))
      problems.push(`${where}: E21 records ${there.join(' ').slice(0, 300)}`);
  }
  const withs = items.filter(item => item.role.WithNode).length;
  if (withs !== installs.length)
    problems.push(`${at}: ${withs} with nodes, ${installs.length} Install`);
  return problems;
};
