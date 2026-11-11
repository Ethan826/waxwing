// R037 (2) remaining sites (dossier §18.180): each fallback forced, in an
// isolated copy of the repository and its compiled output, to measure
// what follows if its invariant breaks. Evidence only; never the working
// tree. Per plant: the corpus results dump (scripts/r0-results-dump.mjs)
// compared with the unplanted one (scripts/r0-results-moved.mjs), and
// focused suites.
// usage: node plants.mjs <copyRoot> <evidenceDir>
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const [root, evidence] = process.argv.slice(2);
const js = module => join(root, 'output', module, 'index.js');
const arrow = 'v instanceof Domain_Type_Core.TFun';
// Within the named top-level function only: its text up to `\n};\n`.
const within = (name, from, to) => text => {
  const start = text.indexOf(`var ${name} = `);
  const end = text.indexOf('\n};\n', start);
  if (start === -1 || end === -1) throw new Error(`${name}: not found`);
  const body = text.slice(start, end);
  if (body.split(from).length !== 2) throw new Error(`${name}: site`);
  return text.slice(0, start) + body.replace(from, to) + text.slice(end);
};

const plants = {
  'Walked.walkedRow (row unwalked)':
    [js('Features.Check.Walked'), within('walkedRow', arrow, 'false')],
  'DeclarationUse.arrowRow (closedRow)':
    [js('Features.Check.DeclarationUse'), within('arrowRow', arrow,
      'false')],
  'Function.current (Row [] Nothing)':
    [js('Features.Check.Function'), within('current', arrow, 'false')],
  'Body.rowOf (Row [] Nothing)':
    [js('Features.Check.Generate.Body'), within('rowOf', arrow, 'false')],
  'Desugar.freshRow (guard removed, Meta 0)':
    [js('Features.Check.RowMerge.Desugar'), within('freshRow',
      'var $9 = Data_Array.length(metas) < 2;', 'var $9 = false;')],
  'Core.stagesThrough (second loop without look)':
    [js('Domain.Type.Core'), within('stagesThrough',
      'var v1 = look(rest);', 'var v1 = rest;')],
};
const suites = ['test/r0-entry-rows.test.mjs',
  'test/fx-diagnostic-origins.test.mjs', 'test/fx008-defer.test.mjs',
  'test/r0-static.test.mjs'];

const run = (args, options = {}) => spawnSync('node', args,
  { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    timeout: 1800000, ...options });
const counts = text => ({
  pass: Number(/^# pass (\d+)/m.exec(text)?.[1]),
  fail: Number(/^# fail (\d+)/m.exec(text)?.[1]) });
const measure = tag => {
  const dump = join(evidence, `dump-${tag}.json`);
  const dumped = run(['scripts/r0-results-dump.mjs', dump]);
  const moved = dumped.status === 0
    ? run(['scripts/r0-results-moved.mjs', join(evidence, 'dump-pristine.json'),
      dump]) : null;
  if (moved) writeFileSync(join(evidence, `moved-${tag}.txt`), moved.stdout);
  return {
    dump: dumped.status === 0 ? 'ok'
      : `failed ${dumped.status}: ${(dumped.stderr || '').slice(-400)}`,
    moved: moved ? { status: moved.status,
      head: moved.stdout.split('\n').slice(0, 12).join('\n') } : null,
    suites: Object.fromEntries(suites.map(suite => [suite,
      counts(run(['--test', '--test-reporter=tap', suite]).stdout)])) };
};

const record = (name, result) => {
  console.log(`## ${name}\n${JSON.stringify(result, null, 1)}`);
};
const pristineDump = run(['scripts/r0-results-dump.mjs',
  join(evidence, 'dump-pristine.json')]);
if (pristineDump.status !== 0) throw new Error(pristineDump.stderr);
record('pristine', { suites: measure('pristine-again').suites });
for (const [index, [name, [file, plant]]] of Object.entries(plants)
  .entries()) {
  const text = readFileSync(file, 'utf8');
  writeFileSync(file, plant(text));
  try { record(name, measure(`p${index + 1}`)); }
  finally { writeFileSync(file, text); }
}
