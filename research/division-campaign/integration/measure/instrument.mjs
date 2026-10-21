// The instrumented compiler shared by measure.mjs (stream 7b, the corpus)
// and apps/measure-apps.mjs (stream 9, application-shaped programs).
// Read-only: it copies the built compiler (output/) to a scratch
// directory and wraps six constraint-making functions (in five modules)
// of the copy with a logger. No compiler source is changed.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync }
  from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { joinSource, rewriter } from './joins.mjs';

// Each wrapper logs its call to the recorder current at the time and
// then calls the original. Appended at the end of the module, it
// reassigns the module's own variable, which its `export` binds live.
// `unify` also hands its result to `__wxSolved` when one is set (stream
// 9 keeps the last successful substitution); unset, it is called once.
const wrappers = {
  'Features.Check.Unify': `unify = (o => s => l => r =>
    (globalThis.__wxRec?.({ kind: 'eq', left: l, right: r }),
      globalThis.__wxSolved?.(o(s)(l)(r)) ?? o(s)(l)(r)))(unify);`,
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

const prepare = (root, copy) => {
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

// The instrumented phases. `resolved(source)` parses and resolves, as
// written or, if Resolve refuses, with two-spread literals joined;
// `record(program, definition)` checks one function alone and returns
// its verdict and the atoms logged meanwhile.
export const instrument = async (root, scratch) => {
  const copy = resolvePath(scratch, 'output');
  prepare(root, copy);
  const load = async name => import(join(copy, name, 'index.js'));
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

  // `solved` is the substitution of the last successful top-level
  // `unify`: an approximation of the solver's final state (later
  // merge cases unify through `unifyPlain`, not seen here, and a
  // speculative branch's state may be the last one seen).
  const record = (program, definition) => {
    const atoms = [];
    let solved = null;
    globalThis.__wxRec = atom => { atoms.push(atom); };
    globalThis.__wxSolved = result => {
      if (result.constructor.name === 'Right') solved = result.value0;
      return result;
    };
    let verdict;
    try {
      const checked =
        recheck(functional(program.ctors))(program)(definition);
      verdict = checked.constructor.name === 'Right' ? 'accepted' : 'refused';
    } catch (error) {
      verdict = `threw: ${error.message.slice(0, 60)}`;
    } finally {
      globalThis.__wxRec = undefined;
      globalThis.__wxSolved = undefined;
    }
    return { verdict, atoms, solved };
  };

  return { resolved, record, keysOf, load };
};
