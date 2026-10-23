// Helpers for RT1's translator's rule-level tests (Task 3.3): a source
// translated, one rule's entries read back, and builders for the
// canonical forms the expected values are written in.
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { translateProgram } from './r0-translator.mjs';
import { stableStringify } from './r0-canonical.mjs';

// The resolved program and each declaration's problem, by name.
export const translated = source => {
  const parsed = parse(source);
  assert.equal(parsed.constructor.name, 'Right', 'the source parses');
  const named = resolve(parsed.value0);
  assert.equal(named.constructor.name, 'Right', 'the source resolves');
  const program = named.value0;
  const problems = translateProgram(program);
  return Object.fromEntries(program.functions.map(decl =>
    [decl.name, problems[decl.id]]));
};

// `root:step/step/…`, the paths' written form here.
export const pathOf = text => {
  const [root, rest] = text.split(':');
  const steps = rest === '' ? [] : rest.split('/')
    .map(step => (/^\d+$/.test(step) ? Number(step) : step));
  return { root, steps };
};
export const written = path => `${path.root}:${path.steps.join('/')}`;

// Every entry rule `rule` emitted: [list, path, index, row, kind, value],
// list by list (d, q, b, bq, outside, adm, split), each in emission order.
export const ruleEntries = (problem, rule) =>
  ['d', 'q', 'b', 'bq', 'outside', 'adm', 'split'].flatMap(list =>
    problem[list].filter(entry => entry.origin.rule === rule).map(entry =>
      [list, written(entry.origin.atom.path), entry.origin.atom.index,
        entry.origin.row, entry.origin.kind, entry.value]));

// A variable's `vars` entry: [sort, quant, rule, position].
export const varInfo = (problem, variable) => {
  const found = problem.vars.find(([key]) =>
    stableStringify(key) === stableStringify(variable));
  assert.ok(found, `in vars: ${stableStringify(variable)}`);
  const info = found[1];
  return [info.sort, info.quant, info.origin.rule, info.position];
};

export const typeAt = (problem, path) => {
  const found = problem.types.find(([key]) =>
    stableStringify(key) === stableStringify(pathOf(path)));
  assert.ok(found, `in types: ${path}`);
  return found[1];
};

// Builders.
export const Int = { base: 'Int' };
export const Bool = { base: 'Bool' };
export const Text = { base: 'Text' };
export const Unit = { base: 'Unit' };
export const data = id => ({ base: { data: id } });
export const rv = index => ({ rigid: index });
export const fv = (path, role) => ({ fresh: { path: pathOf(path), role } });
export const tv = variable => ({ tvar: variable });
export const fun = (params, result) => ({ fun: { params, result } });
export const rec = (fields, tails = []) => ({ record: {
  fields: Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : 1)),
  tails } });
export const app = (id, args) => ({ app: { head: { data: id }, args } });
export const eq = (left, right) => ({ eq: [left, right] });
export const lacks = (variable, label) => ({ lacks: [variable, label] });
export const disjoint = (a, b) => ({ disjoint: [a, b] });
export const slot = (path, index) => ({ slot: [pathOf(path), index] });
export const nodeType = path => ({ nodeType: pathOf(path) });
