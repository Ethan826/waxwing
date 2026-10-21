// Stream 7b: what a verified signature checker would face on the
// repository's Waxwing corpus. Read-only: it copies the built compiler
// (output/) to a scratch directory, wraps six constraint-making
// functions (in five modules) of the copy with a logger, and runs each
// function's check (Features.Check.Function `recheck`) once with the
// logger on. No compiler source is changed.
//
//   node research/division-campaign/integration/measure/measure.mjs \
//     <scratch-dir> [--json <file>]
//
// SEEDS (default 200): programs taken from each record generator.
//
// The scratch directory receives output/ (about 80 MB); delete it after.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync }
  from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import assert from 'node:assert/strict';
import { corpus } from './corpus.mjs';
import { expectations, read } from './expect.mjs';
import { joinSource, rewriter } from './joins.mjs';
import { measureFunction } from './metrics.mjs';
import { report } from './report.mjs';

const [scratch, flag, jsonFile] = process.argv.slice(2);
if (!scratch) throw new Error('usage: measure.mjs <scratch-dir>');
const root = resolvePath('.');
const copy = resolvePath(scratch, 'output');

// Each wrapper logs its call to the recorder current at the time and
// then calls the original. Appended at the end of the module, it
// reassigns the module's own variable, which its `export` binds live.
const wrappers = {
  'Features.Check.Unify': `unify = (o => s => l => r =>
    (globalThis.__wxRec?.({ kind: 'eq', left: l, right: r }), o(s)(l)(r)))
    (unify);`,
  'Features.Check.Disjoint': `requireLack = (o => v => k => s => t => l =>
    (globalThis.__wxRec?.({ kind: 'lacks', tail: t, labels: [l],
      origin: 'require' }), o(v)(k)(s)(t)(l)))(requireLack);
  requireApart = (o => v => k => s => a => b =>
    (globalThis.__wxRec?.({ kind: 'apart', one: a, other: b,
      origin: 'require' }), o(v)(k)(s)(a)(b)))(requireApart);
  seedApart = (o => a => b => c =>
    (globalThis.__wxRec?.({ kind: 'apart', one: a, other: b,
      origin: 'seed' }), o(a)(b)(c)))(seedApart);`,
  'Features.Check.Lacks': `addLackTable = (o => t => m =>
    (globalThis.__wxRec?.({ kind: 'lacks', tail: t, table: m,
      origin: 'seed' }), o(t)(m)))(addLackTable);`,
  'Features.Check.RowMerge.Predicate': `made = (o => s => l => r => t =>
    (globalThis.__wxRec?.({ kind: 'merge', left: l, right: r, result: t }),
      o(s)(l)(r)(t)))(made);`
};

const prepare = () => {
  if (!existsSync(join(root, 'output'))) {
    throw new Error('build first: npm run build');
  }
  rmSync(copy, { recursive: true, force: true });
  cpSync(join(root, 'output'), copy, { recursive: true });
  for (const [module, code] of Object.entries(wrappers)) {
    const file = join(copy, module, 'index.js');
    const text = readFileSync(file, 'utf8');
    const at = text.lastIndexOf('export {');
    writeFileSync(file,
      `${text.slice(0, at)}// stream 7b recorder\n${code}\n${text.slice(at)}`);
  }
};

const load = async name => import(join(copy, name, 'index.js'));

prepare();
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { recheck } = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const keysOf = table =>
  Map.toUnfoldable(unfoldableArray)(table).map(pair => pair.value0);

const rewrite = rewriter(await load('Domain.Syntax.Core'));
const joinDecl = () => parse(joinSource).value0.functions[0];

// As written; if Resolve refuses, again with two-spread literals joined.
const resolved = source => {
  const parsed = parse(source);
  if (parsed.constructor.name !== 'Right') return { stage: 'parse' };
  const program = resolve(parsed.value0);
  if (program.constructor.name === 'Right') {
    return { stage: 'resolved', program: program.value0, joins: 0 };
  }
  const again = parse(source).value0;
  const joins = rewrite(again);
  if (joins === 0) return { stage: 'resolve' };
  again.functions = [...again.functions, joinDecl()];
  const joined = resolve(again);
  if (joined.constructor.name !== 'Right') return { stage: 'resolve+join' };
  return { stage: 'resolved', program: joined.value0, joins };
};

// A snippet without `main` is retried with one appended.
const withMain = source => {
  const first = resolved(source);
  if (first.program || /\bfn\s+main\b/.test(source)) return first;
  const second = resolved(`${source}\nfn main(): Int = 0;\n`);
  return second.program ? second : first;
};

// Every function of one source, measured; null when it does not
// resolve (the stage that refused it is kept in `refused`).
const measureSource = (entry, refused) => {
  const found = withMain(entry.source);
  if (!found.program) {
    refused.push({ origin: entry.origin, stage: found.stage });
    return [];
  }
  const program = found.program;
  const holders = functional(program.ctors);
  return program.functions.filter(definition => definition.name !== 'wxJoin')
    .map(definition => {
      const atoms = [];
      globalThis.__wxRec = atom => { atoms.push(atom); };
      let verdict;
      try {
        const checked = recheck(holders)(program)(definition);
        verdict = checked.constructor.name === 'Right'
          ? 'accepted' : 'refused';
      } catch (error) {
        verdict = `threw: ${error.message.slice(0, 60)}`;
      } finally {
        globalThis.__wxRec = undefined;
      }
      return {
        origin: entry.origin,
        name: definition.name,
        verdict,
        joined: found.joins > 0,
        ...measureFunction(definition, atoms, keysOf)
      };
    });
};

// The hand-computed expectations first: a wrong recorder stops here.
for (const expected of expectations) {
  const row = measureSource({ origin: 'expect', source: expected.source }, [])
    .find(found => found.name === expected.name);
  const got = Object.fromEntries(
    Object.keys(expected.sizes).map(key => [key, read(row, key)]));
  assert.deepEqual(got, expected.sizes, `${expected.name}: ${expected.why}`);
}
console.log(`Expectations: ${expectations.length} hold.`);

const refused = [];
const seeds = Number(process.env.SEEDS ?? 200);
const results = (await corpus(root, seeds))
  .flatMap(entry => measureSource(entry, refused));
const sources = new Set(results.map(row => row.origin));
console.log(report(results, refused, sources.size));
if (flag === '--json' && jsonFile) {
  writeFileSync(jsonFile, JSON.stringify({ results, refused }, null, 1));
}
