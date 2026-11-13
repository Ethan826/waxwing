// Scope A membership (dossier §18.190): for each program DataApplication
// alone blocks (research/r0-census-analysis/lost-programs.json), what
// its recorded problems hold that the proposed boundary reads. Evidence
// only; it generates each declaration's problem with the committed
// checker and changes nothing. Per declaration with a DataApplication
// marker:
// - `effectRowArgs`: an applied type whose declared type has an effect
//   row parameter (the recorder drops row arguments, Elab/Recorded.purs
//   :36-38, so those rows are erased; G-erased's question);
// - `recordRowArgs`: one with a record-row parameter (DataOverRecords);
// - `appInD`: an `app` node in a declared hypothesis (CX's projection
//   leaves it undefined, Refute/Project.purs:80);
// - `appInBQ`: a printability or comparability atom whose type holds an
//   `app` (its meaning waits on G-ValidR's holder policy);
// - `bqOverApp` splits those into ground and non-ground.
// usage: node research/r0-scope-a/membership.mjs > out.json
import { readFileSync } from 'node:fs';
import { sourcesOf } from '../../test/r0-effects-pin-run.mjs';
import { problemsOf, resolved } from '../../test/r0-generate-support.mjs';

const lost = JSON.parse(readFileSync(
  'research/r0-census-analysis/lost-programs.json', 'utf8')).programs;
const scope = new Set(lost.filter(p => p.causes.join() === 'DataApplication')
  .map(p => p.origin));
const sources = (await sourcesOf()).filter(s => scope.has(s.origin));
if (sources.length !== scope.size) throw new Error('a source is missing');

// Every `app` head in a canonical value, and whether it holds a variable.
const apps = (value, found = []) => {
  if (Array.isArray(value)) value.forEach(item => apps(item, found));
  else if (value !== null && typeof value === 'object') {
    if ('app' in value) found.push(value.app.head);
    Object.values(value).forEach(item => apps(item, found));
  }
  return found;
};
const hasVar = value => JSON.stringify(value).includes('"tvar"')
  || JSON.stringify(value).includes('"tails":[{');
const sortsOf = (program, head) => ('data' in head
  ? program.types[head.data]?.sorts.map(s => s.constructor.name) ?? ['?']
  : ['handler']);

const rows = sources.map(source => {
  const program = resolved(source.source);
  const decls = problemsOf(program)
    .filter(({ problem }) => problem.outside.some(entry =>
      JSON.stringify(entry).includes('DataApplication')))
    .map(({ decl, problem }) => {
      const heads = apps([problem.d, problem.b, problem.bq]);
      const sorts = heads.map(head => sortsOf(program, head));
      const bq = problem.bq.filter(entry => apps(entry).length > 0);
      return { name: decl.name,
        effectRowArgs: sorts.some(s => s.includes('RowSort')),
        recordRowArgs: sorts.some(s => s.includes('RecordSort')),
        unknownHead: sorts.some(s => s.includes('?')),
        appInD: apps(problem.d).length > 0,
        appInBQ: bq.length,
        bqOverAppGround: bq.filter(entry => !hasVar(entry)).length,
        bqOverAppOpen: bq.filter(entry => hasVar(entry)).length };
    });
  return { origin: source.origin, decls };
});

const any = (row, key) => row.decls.some(d => d[key]);
const count = key => rows.filter(row => any(row, key)).length;
console.log(JSON.stringify({
  programs: rows.length,
  declarations: rows.reduce((n, row) => n + row.decls.length, 0),
  programsWith: Object.fromEntries(['effectRowArgs', 'recordRowArgs',
    'unknownHead', 'appInD', 'appInBQ', 'bqOverAppGround',
    'bqOverAppOpen'].map(key => [key, count(key)])),
  rows }, null, 1));
