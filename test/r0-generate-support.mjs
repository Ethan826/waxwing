// Support for Task 3.2's generator tests (T-R0b §3, §9 RT5-RT7): run
// generation on a source, read problems through the canonical form
// (test/r0-canonical.mjs), resolve a recorded path to its node (RT6),
// and check `vars` (RT7). Written from T-R0b and Task 3.2's code only.
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalOf } from './r0-canonical.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = pathToFileURL(join(root, 'output')).href;
export const load = name => import(`${output}/${name}/index.js`);
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${JSON.stringify(result.value0)}`);
  return result.value0;
};

// The resolved program of a source, or a thrown refusal.
export const resolved = source =>
  right(resolve(right(parse(source), 'parse')), 'resolve');

// A generation result's problem; a generation fault fails the caller.
export const generatedOrThrow = (result, name) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${name}: generation fault`
      + ` ${result.value0.constructor.name}`);
  return result.value0;
};

// Every declaration of a resolved program with its canonical problem.
export const problemsOf = program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.map(decl => ({ decl,
    problem: canonicalOf(generatedOrThrow(
      Generate.generate(tables)(signatures)(decl), decl.name)) }));
};

// The named declaration's problem (and the declaration) of a source.
export const generated = (source, name = 'f') => {
  const found = problemsOf(resolved(source)).find(item =>
    item.decl.name === name);
  if (found === undefined) throw new Error(`no declaration ${name}`);
  return found;
};

export const entryLists = ['d', 'q', 'b', 'bq', 'outside', 'adm', 'split'];

// One rule's entries as `[list, path steps, index, value]`, ordered by
// AtomId (path, then index), so a rule's listed order reads in turn:
// the multiset of `(AtomId, entry)` a rule test pins.
export const ruleEntries = (problem, rule) => entryLists.flatMap(list =>
  problem[list].filter(entry => entry.origin.rule === rule).map(entry =>
    [list, [entry.origin.atom.path.root, ...entry.origin.atom.path.steps],
      entry.origin.atom.index, entry.value]))
  .sort((a, b) => bySteps(a[1], b[1]) || a[2] - b[2]);
// Step by step, a prefix first; names by code units, as `Ord String`.
const bySteps = (a, b) => {
  for (let at = 0; at < Math.min(a.length, b.length); at += 1) {
    const [x, y] = [String(a[at]), String(b[at])];
    if (x !== y) return x < y ? -1 : 1;
  }
  return a.length - b.length;
};

// Canonical builders.
export const B = name => ({ base: name });
export const data = id => ({ base: { data: id } });
export const rigid = index => ({ rigid: index });
export const fresh = (steps, role, rootName = 'body') =>
  ({ fresh: { path: { root: rootName, steps }, role } });
export const tv = variable => ({ tvar: variable });
export const rec = (fields, tails = []) => ({ record: { fields, tails } });
export const fun = (params, result) => ({ fun: { params, result } });
export const app = (head, args) => ({ app: { head, args } });
export const eq = (left, rightSide) => ({ eq: [left, rightSide] });

// Every variable an entry, a type or a site mentions.
export const mentioned = value => {
  const found = [];
  const visit = item => {
    if (Array.isArray(item)) { item.forEach(visit); return; }
    if (!item || typeof item !== 'object') return;
    if ('rigid' in item || 'fresh' in item) { found.push(item); return; }
    Object.values(item).forEach(visit);
  };
  visit(value);
  return found;
};

export const key = variable => JSON.stringify(variable);
