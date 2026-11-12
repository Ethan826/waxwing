// Restored-defect checks for R037 (2)'s remaining repair (dossier
// §18.182), on the new row-level paths. Each mutant edits compiled output
// in an isolated copy and runs the tests that must catch it; the copy is
// never the working tree. plants.mjs forced the old arrow arms; those arms
// are gone, so these mutants break the new paths directly.
// usage: node mutants.mjs <copyRoot>  (copyRoot holds output/, src/,
// test/, scripts/ and package.json; node_modules may be a link)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.argv[2];
const js = module => join(root, 'output', module, 'index.js');
// A row with its labels dropped and its tail kept.
const dropped = call => `((r) => new r.constructor([], r.value1))(${call})`;
const rigidRow = 'Domain_Checked_Internal.rigidRow($$function.row)';
const atRow = 'Features_Check_Scheme.atRow(scheme.value)(row)';
// The site is looked for within the named top-level function only (its
// text up to `\n};\n`), as plants.mjs does, and must occur there once.
const mutants = {
  'Walked: spliced labels dropped (row unwalked)': [
    js('Features.Check.Walked'), 'walkedRow',
    'Features_Check_Subst.walkRow(subst)(Features_Check_Scheme'
      + '.flexibleRow(row))',
    'Features_Check_Scheme.flexibleRow(row)'],
  'DeclarationUse: instantiated row dropped at a use': [
    js('Features.Check.DeclarationUse'), 'declarationUse',
    `var instantiated = withRowMarks(${atRow});`,
    'var instantiated = Domain_Row.closedRow;'],
  'DeclarationUse: instantiated row\'s labels dropped, tail kept': [
    js('Features.Check.DeclarationUse'), 'declarationUse',
    `var instantiated = withRowMarks(${atRow});`,
    `var instantiated = ${dropped(`withRowMarks(${atRow})`)};`],
  'DeclarationUse: row marks not instantiated': [
    js('Features.Check.DeclarationUse'), 'declarationUse',
    `var instantiated = withRowMarks(${atRow});`,
    `var instantiated = ${atRow};`],
  'Scheme.atRow: variables not shifted by the base': [
    js('Features.Check.Scheme'), 'atRow',
    'return renameRow(shifted(scheme));',
    'return renameRow((v) => new Domain_Checked_Internal.Hole(v));'],
  'Checked.rigidRow: labels dropped': [
    js('Domain.Checked.Internal'), 'rigidRow',
    'return Domain_Type_Core.renameRow(ordOpen)(Rigid.create);',
    'return (row) => '
      + dropped('Domain_Type_Core.renameRow(ordOpen)(Rigid.create)(row)')
      + ';'],
  'Function.current: labels dropped': [
    js('Features.Check.Function'), 'current',
    `return scoped(${rigidRow});`, `return scoped(${dropped(rigidRow)});`],
  'Body.rowOf: labels dropped': [
    js('Features.Check.Generate.Body'), 'rowOf',
    `return ended(${rigidRow});`, `return ended(${dropped(rigidRow)});`],
  'Desugar.freshRow: one-tail guard removed': [
    js('Features.Check.RowMerge.Desugar'), 'freshRow',
    'var $9 = Data_Array["null"](v.tail);', 'var $9 = false;'],
  // The old defect: no guard, and `Meta 0` when there is no unknown tail.
  'Desugar.freshRow: Meta 0 invented (old default, unguarded)': [
    js('Features.Check.RowMerge.Desugar'), 'freshRow',
    ['var $9 = Data_Array["null"](v.tail);',
      'Data_Array.uncons(metas)'],
    ['var $9 = false;', 'Data_Array.uncons(metas.length === 0 '
      + '? [new Features_Check_Flex.Meta(0)] : metas)']],
};
const suites = ['test/r0-site-rows.test.mjs', 'test/r0-entry-rows.test.mjs',
  'test/fx-diagnostic-origins.test.mjs', 'test/fx008-defer.test.mjs',
  'test/r0-static.test.mjs', 'test/r0-elab-build.test.mjs',
  'test/r005b-render.test.mjs', 'test/r005b-outcome.test.mjs',
  'test/fx008-defer-run.test.mjs', 'test/fx008-nofail-k.test.mjs'];

const counts = text => ({
  pass: Number(/^# pass (\d+)/m.exec(text)?.[1]),
  fail: Number(/^# fail (\d+)/m.exec(text)?.[1]) });
const run = () => Object.fromEntries(suites.map(suite => {
  const result = spawnSync('node', ['--test', '--test-reporter=tap', suite],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return [suite.replace(/^test\/|\.test\.mjs$/g, ''),
    counts(result.stdout + result.stderr)];
}));

const clean = results => Object.values(results).every(r => r.fail === 0
  && r.pass > 0);
const pristine = run();
console.log('pristine', JSON.stringify(pristine));
if (!clean(pristine)) throw new Error('pristine copy is not clean');
// One site and its replacement, or arrays of each, edited in order.
for (const [name, [file, fn, sites, replacements]] of Object.entries(
  mutants)) {
  const text = readFileSync(file, 'utf8');
  const start = text.indexOf(`var ${fn} = `);
  const end = text.indexOf('\n};\n', start);
  let body = start === -1 || end === -1 ? '' : text.slice(start, end);
  [sites].flat().forEach((site, index) => {
    if (body.split(site).length !== 2) throw new Error(`${name}: site`);
    // A function, so `$$function`'s `$$` is not a replacement pattern.
    body = body.replace(site, () => [replacements].flat()[index]);
  });
  writeFileSync(file, text.slice(0, start) + body + text.slice(end));
  let results;
  try { results = run(); } finally { writeFileSync(file, text); }
  const caught = !clean(results);
  console.log(caught ? 'CAUGHT' : 'MISSED', name, JSON.stringify(results));
}
