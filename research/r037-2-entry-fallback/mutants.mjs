// Restored-defect checks for R037 (2)'s repair (dossier §18.178), on the
// new path. Each mutant edits compiled output in an isolated copy and runs
// the tests that must catch it; the copy is never the working tree.
// usage: node mutants.mjs <copyRoot>  (copyRoot holds output/, test/,
// scripts/ and package.json; node_modules may be a link)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = process.argv[2];
const entryJs = `${root}/output/Features.Check.Entry/index.js`;
const coreJs = `${root}/output/Domain.Type.Core/index.js`;
const pristine = { [entryJs]: readFileSync(entryJs, 'utf8'),
  [coreJs]: readFileSync(coreJs, 'utf8') };
const entries = 'return map(resolved)((Features_Check_RowSide.expanded(subst)'
  + '(Features_Check_RowSide.written(span)'
  + '(Features_Check_Scheme.flexibleRow(row)))).entries);';
const unexpanded = 'return map(resolved)((Features_Check_RowSide.written(span)'
  + '(Features_Check_Scheme.flexibleRow(row))).entries);';
const renamed = 'return substituteRow1(renaming(change));';

const mutants = {
  'effect-check bypass (no entries)': [entryJs, entries,
    'return [];'],
  'truncation after the first label': [entryJs, entries,
    entries.replace('return ', 'return ((xs) => xs.slice(0, 1))(')
      .replace(/;$/, ');')],
  'truncation of the last label (zip analog)': [entryJs, entries,
    entries.replace('return ', 'return ((xs) => xs.slice(0, -1))(')
      .replace(/;$/, ');')],
  'no tail expansion': [entryJs, entries, unexpanded],
  'occurrences paired with the wrong labels': [entryJs, entries,
    entries.replace('return ', 'return ((xs) => xs.map((x, i, a) => '
      + '({ label: x.label, occurrence: a[a.length - 1 - i].occurrence })))(')
      .replace(/;$/, ');')],
  'renameRow merges repeated labels': [coreJs, renamed,
    'return (row) => { const r = substituteRow1(renaming(change))(row); '
      + 'const seen = new Set(); return new Domain_Row.Row(r.value0.filter('
      + '(l) => { const k = JSON.stringify(l.value0); if (seen.has(k)) '
      + 'return false; seen.add(k); return true; }), r.value1); };'],
};
const suites = ['test/r0-entry-rows.test.mjs',
  'test/fx-diagnostic-origins.test.mjs', 'test/fx-scale-labels.test.mjs'];

const counts = text => ({
  pass: Number(/^# pass (\d+)/m.exec(text)?.[1]),
  fail: Number(/^# fail (\d+)/m.exec(text)?.[1]),
  failed: [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]) });
const run = () => Object.fromEntries(suites.map(suite => {
  const result = spawnSync('node', ['--test', '--test-reporter=tap', suite],
    { cwd: root, encoding: 'utf8' });
  return [suite, counts(result.stdout + result.stderr)];
}));

console.log('pristine', JSON.stringify(run()));
for (const [name, [file, site, replacement]] of Object.entries(mutants)) {
  const text = pristine[file];
  if (text.split(site).length !== 2) throw new Error(`${name}: site`);
  writeFileSync(file, text.replace(site, replacement));
  const results = run();
  writeFileSync(file, text);
  const caught = Object.values(results).some(r => r.fail > 0);
  console.log(caught ? 'CAUGHT' : 'MISSED', name, JSON.stringify(results));
}
