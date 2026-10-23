import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fixturesIn, refusalOf } from './r0-probe-support.mjs';
import { filesUnder } from '../scripts/structure.mjs';
import { A, R, arity, semantic, table } from './r0-static-sites.mjs';

// R0 Task 2.3 (AT10): static rules beside the verdict. Each raise site
// of the refusals the gates G-effects and G-coverage audited, and of
// the others the task names, is classified where today's code raises
// it (rulings R5, R8): a static rule (class a), a policy (class b′) or
// semantic (left to the verdict). Nothing moves; texts, codes and the
// first diagnostic stay (r0-first-diagnostic.serial.test.mjs). Every
// site constructor is injected directly; the classes are
// docs/findings.md, "Static rules beside the verdict".
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = pathToFileURL(resolve(root,
  process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const sites = await load('Features.Check.Generate.Static');
// The site constructors, read where they are defined.
const defined = await load('Features.Check.Generate.Static.Site');
const { Just, Nothing } = await load('Data.Maybe');

const byName = new Map(table.map(row => [row.name, row]));

const constructors = Object.entries(defined).filter(([, value]) =>
  typeof value === 'function' && value.prototype !== undefined
  && /^[A-Z]/.test(value.name));
const nullary = constructors.filter(([, value]) =>
  value.value instanceof value).map(([name]) => name);
const unary = constructors.filter(([, value]) =>
  typeof value.create === 'function').map(([name]) => name);
const raised = row => new defined[row.family](defined[row.name].value);
const named = found => [found.constructor.name, found.value0?.constructor
  .name].filter(name => name !== undefined).join(' ');

test('every site and family constructor is injected once', () => {
  assert.deepEqual(nullary.sort(), table.map(row => row.name).sort());
  assert.deepEqual(unary.sort(),
    [...new Set(table.map(row => row.family))].sort());
  assert.equal(new Set(table.map(row => row.name)).size, table.length);
});

// The classification and the refusal it gives, at a stand-in site
// (Site is a Path, uninhabited until Task 3.1).
const site = { stand: 'in' };
const refused = row => sites.staticRefusal(site)(raised(row));
test('each site injected directly has its class and refusal', () => {
  for (const row of table) {
    const found = sites.staticClass(raised(row));
    const wanted = row.wanted.replace(/^StaticRule/, 'Rule')
      .replace(/^Policy/, 'ByPolicy');
    assert.equal(named(found), wanted, row.name);
    const refusal = refused(row);
    if (row.wanted === semantic) assert.ok(refusal instanceof Nothing,
      row.name);
    else {
      assert.ok(refusal instanceof Just, row.name);
      assert.equal(named(refusal.value0), row.wanted, row.name);
      assert.equal(refusal.value0.value1, site, row.name);
    }
  }
});

// No catch-all (ruling R5): a wildcard arm would class a new site
// silently, and behaves the same as the arms it replaces, so the source
// is read. Every case arm in the module names a constructor.
test('the classification has no wildcard arm', () => {
  const source = readFileSync(join(root,
    'src/Features/Check/Generate/Static.purs'), 'utf8');
  const arms = source.split('\n').filter(text => / → /.test(text)
    && !/^\s*--/.test(text) && !/∷/.test(text));
  assert.ok(arms.length >= table.length, 'every site has its arm');
  assert.deepEqual(arms.filter(text => /^\s*(_|[a-z]\w*)\s*→/
    .test(text)), []);
});

test('every cited site holds its token', () => {
  for (const row of table) {
    const [file, line] = row.site.split(':');
    const text = readFileSync(join(root, file), 'utf8').split('\n');
    assert.ok(text[Number(line) - 1].includes(row.token), row.name);
  }
});

// Completeness: every line of src/Features naming a classified
// constructor is a site above, or a line that builds no refusal: a
// match on one, or the helper the arity sites call (whose callers are
// pinned below).
const classified = [...new Set(table.map(row => row.token))]
  .filter(token => /^[A-Z]/.test(token));
const notRaised = new Set([
  `${A}Pipe.purs:49`, // `arity`, called at Pipe.purs:33 and :36
  `${A}Call.purs:209`, // `arityAt`, called at Call.purs:123, 144, 149
  `${A}ArgumentRow.purs:62`, // a match: EffectNotAllowed rewritten
  `${A}Argument.purs:46`, // a match on MustBePure
  `${A}Argument.purs:48`, // a match on RowEquality
  `${A}Reject.purs:125` // a match on RowEquality
]);
// Lines of a module header or an import list are skipped, and so is
// this classification: they name, they do not raise.
const linesNaming = pattern => {
  const found = [];
  for (const file of filesUnder(join(root, 'src/Features'))) {
    if (!file.endsWith('.purs') || file.includes('/Generate/Static'))
      continue;
    const relative = file.slice(root.length + 1);
    let importing = false;
    readFileSync(file, 'utf8').split('\n').forEach((text, index) => {
      importing = /^(import|module)\b/.test(text)
        || (importing && /^\s+[(),]/.test(text));
      if (!importing && !/^\s*--/.test(text) && pattern.test(text))
        found.push(`${relative}:${index + 1}`);
    });
  }
  return found;
};
// The lines that call a helper, less its signature and definition.
const callers = (file, helper) => readFileSync(join(root, A, file), 'utf8')
  .split('\n').flatMap((text, index) =>
    new RegExp(`\\b${helper}\\b`).test(text)
    && !new RegExp(`\\b${helper}( span)? *[=∷]`).test(text)
      ? [index + 1] : []);
test('every raise site of a classified refusal is classified', () => {
  const cited = new Set(table.map(row => row.site));
  const words = new RegExp(`\\b(${classified.join('|')})\\b`);
  const missing = linesNaming(words).filter(at =>
    !cited.has(at) && !notRaised.has(at));
  assert.deepEqual(missing, []);
  assert.deepEqual(callers('Pipe.purs', 'arity'), [33, 36]);
  assert.deepEqual(callers('Call.purs', 'arityAt'), [123, 144, 149]);
});

// The closed gates' evidence (docs/findings.md, "Effect and coverage
// audit"): an audited structural site is a static rule, a semantic one
// is not static. The defect fixtures are no row.
test('the classes agree with the effect and coverage audit', () => {
  const audited = fixturesIn('r0/audit').filter(f => f.class !== 'defect');
  assert.ok(audited.length > 70);
  for (const f of audited) {
    const row = table.find(found => found.site === f.site);
    assert.ok(row !== undefined, f.name);
    assert.equal(row.wanted.startsWith('StaticRule'),
      f.class === 'structural', f.name);
    assert.equal(row.wanted === semantic, f.class === 'semantic', f.name);
  }
});

// The sites the audit did not probe that are raised in Resolve (Resolve
// reaches none of the online solver: r0-audit.test.mjs). Each probe is
// a run of today's compiler: stage, code and text.
const main = ' fn main(): Int = 0;';
const probes = [
  ['PatternFields', 'type P = Pair(Int, Int); fn f(p: P): Int = '
    + `match p { Pair(a) => a };${main}`, 'E_ARITY',
  'Wrong number of fields'],
  ['FunctionNeedsCall', 'fn helper(): Int = 1; fn main(): Int = helper;',
    'E_ARITY', 'Expected helper()'],
  ['OperationNeedsCall', 'effect Tick { fn tick(): Int; }; '
    + `fn f(): Int with Tick = Tick.tick;${main}`, 'E_ARITY',
  'Expected Tick.tick()'],
  ['LabelArguments', 'effect Log { fn log(n: Int): Unit; }; '
    + `fn f(): Int with Log(Int) = 1;${main}`, 'E_ARITY',
  'Wrong number of type arguments for Log'],
  ['TypeArgumentCount', `type L = N; fn f(x: L(Int)): Int = 0;${main}`,
    'E_ARITY', 'Wrong number of type arguments for L'],
  ['HandlerArguments', `fn t(h: Handler(Int -> Int)): Int = 0;${main}`,
    'E_ARITY', 'Wrong number of type arguments for Handler'],
  ['ClauseParameters', 'effect Log { fn log(n: Int): Unit; }; fn mk(): '
    + `Handler(Log) = handler Log { log(a, b) => () };${main}`, 'E_ARITY',
  'Wrong number of arguments'],
  ['FailArguments', 'fn main(): Int = Fail.fail(1, 2);', 'E_ARITY',
    'Wrong number of arguments'],
  ['EntryMissing', 'fn f(): Int = 0;', 'E_ENTRY', 'Expected fn main()'],
  ['EntryShape', 'fn main(x: Int): Int = x;', 'E_ENTRY',
    'main must have no parameters'],
  ['DisjointSame', `fn g(a: { ...r }): Int where r disjoint r = 1;${main}`,
    'E_TYPE', 'A disjoint constraint must name two different row variables'],
  ['TailTwiceInRecord', `fn g(a: { ...r, ...r }): Int = 1;${main}`,
    'E_TYPE', '...r is written twice in one record'],
  ['TailTwiceThroughType', 'type Pair(...a, ...b) = Pair({ ...a, ...b }); '
    + `fn f(p: Pair(...r, ...r)): Int = 1;${main}`, 'E_TYPE',
  '...r is written twice in one record']
];
test('the unaudited Resolve sites are refused in Resolve', () => {
  for (const [name, source, code, text] of probes) {
    const found = refusalOf(source);
    assert.deepEqual([found.phase, found.code, found.text],
      ['resolve', code, text], name);
    assert.ok(byName.get(name).site.startsWith(R), name);
  }
});

// AT10: `r disjoint r` (d03) is a policy, raised in Resolve; an arity
// error at a declared result that is never a function is a static
// rule. Both keep today's code and text; neither is a verdict.
test('AT10: d03 is a Policy, a fixed-result arity a StaticRule', () => {
  const d03 = refusalOf(
    `fn g(a: { ...r }): Int where r disjoint r = 1;${main}`);
  assert.deepEqual([d03.phase, d03.code], ['resolve', 'E_TYPE']);
  const policy = refused(byName.get('DisjointSame')).value0;
  assert.equal(named(policy), 'Policy PolicySameDisjoint');
  const arityError = refusalOf('fn size(r: { a: Int }): Int = r.a; '
    + 'fn k(): Int = { let go = fn(r) => 1 |> size(r); go({ a: 2 }) };'
    + main);
  assert.deepEqual([arityError.phase, arityError.code, arityError.text],
    ['check', 'E_ARITY', 'Wrong number of arguments']);
  const rule = refused(byName.get('PipeFixedResult')).value0;
  assert.equal(named(rule), arity);
  for (const refusal of [policy, rule])
    assert.ok(!['Solved', 'Contradiction', 'Unresolved']
      .includes(refusal.constructor.name));
});
