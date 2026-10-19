// Compiles every case of the experiment (README) in every order of its
// steps with the installed `purs`, in each mode and encoding of
// translate.mjs, and compares the orders: acceptance, the inferred type
// (mode `gen`: from the MissingTypeDeclaration warning) and, apart, the
// error codes and texts. Beside each order it records research/
// row-merge-qt's QT (strict) and QS-EHZ verdicts. Writes the programs
// to programs/<case>/ and every outcome to results.json; prints one
// summary line per case, mode and encoding. Scratch output goes to
// ../../.build/purs-row-experiment/ (git-ignored).
// Usage: node run.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync }
  from 'node:fs';
import { moduleText, hasRigid } from './translate.mjs';
import { verdictQT } from '../row-merge-qt/qt-drive.mjs';
import { normalType, normalError } from './normal.mjs';

const here = new URL('.', import.meta.url).pathname;
const out = `${here}../../.build/purs-row-experiment/output`;
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const perms = xs => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
  perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
// Steps up to this many run in every order; longer cases (the
// controls) run in the given order and reversed.
const MAX_ALL = 4;
const QSEHZ = { mode: 'sym', empty: true, home: true, zero: true };

function cases() {
  const qt = `${here}../row-merge-qt/fixtures/`;
  const fx = `${here}../../test/fixtures/r005b/`;
  const own = `${here}cases/`;
  const list = readdirSync(qt).filter(f => f.startsWith('order-')).sort()
    .map(f => ({ kind: 'order fixture', ...read(qt + f) }));
  for (const f of readdirSync(own).sort()) {
    list.push({ kind: 'domain B (QT order difference)', ...read(own + f) });
  }
  for (const name of ['design-composition', 'diag-15']) {
    const f = read(`${fx}${name}.json`);
    list.push({ kind: 'control', name: `control-${name}`, hyp: f.rows.hyp,
      steps: f.rows.steps });
  }
  return list;
}

// A fresh output directory each time: purs skips a module whose output
// is up to date, and then reports no warnings (so no inferred type).
function compile(file) {
  rmSync(out, { recursive: true, force: true });
  const r = spawnSync('purs', ['compile', '--json-errors', '-o', out, file],
    { encoding: 'utf8' });
  const json = JSON.parse(r.stdout.trim().split('\n').pop());
  const missing = json.warnings.find(w =>
    w.errorCode === 'MissingTypeDeclaration');
  if (json.errors.length) {
    return { v: 'error', codes: json.errors.map(e => e.errorCode),
      text: normalError(json.errors[0].message) };
  }
  return { v: 'accept', type: missing ? normalType(missing.message)
    : null, printed: missing ? missing.message.replace(/\s+/g, ' ')
    .replace(/^.*The inferred type of test was: /, '')
    .replace(/ in value declaration.*$/, '') : null };
}

const key = o => (o.v === 'accept' ? `accept ${o.type ?? ''}`
  : `error ${o.codes.join(',')}`);

const results = [];
mkdirSync(out, { recursive: true });
for (const c of cases()) {
  const all = [...c.steps.keys()];
  const orders = all.length <= MAX_ALL ? perms(all)
    : [all, [...all].reverse()];
  const dir = `${here}programs/${c.name}`;
  mkdirSync(dir, { recursive: true });
  const qt = orders.map(ix => verdictQT(c.hyp, ix.map(i => c.steps[i])).v);
  const qs = orders.map(ix => verdictQT(c.hyp, ix.map(i => c.steps[i]),
    QSEHZ).v);
  const entry = { name: c.name, kind: c.kind, orders, qt, qsehz: qs,
    purs: {} };
  for (const mode of hasRigid(c.steps) ? ['sig'] : ['sig', 'gen']) {
    for (const enc of ['nub', 'union']) {
      const runs = orders.map((ix, k) => {
        const mod = `M${c.name.replace(/[^A-Za-z0-9]/g, '')}${mode}`
          + `${enc}${k}`;
        const file = `${dir}/${mode}-${enc}-${k}.purs`;
        writeFileSync(file, moduleText(mod,
          { hyp: c.hyp, steps: ix.map(i => c.steps[i]) }, enc, mode));
        return compile(file);
      });
      entry.purs[`${mode}-${enc}`] = runs;
      const accept = new Set(runs.map(o => o.v)).size;
      const types = new Set(runs.map(key)).size;
      const texts = new Set(runs.map(o => o.text ?? '')).size;
      console.log(`${c.name} ${mode}-${enc}: QT ${qt.join(',')} | purs `
        + `${runs.map(o => o.v).join(',')} | acceptance `
        + `${accept > 1 ? 'DIFFERS' : 'same'}, outcome/type `
        + `${types > 1 ? 'DIFFERS' : 'same'}, error text `
        + `${texts > 1 ? 'differs' : 'same'}`);
    }
  }
  results.push(entry);
}
const version = spawnSync('purs', ['--version'], { encoding: 'utf8' })
  .stdout.trim();
console.log(`purs ${version}`);
writeFileSync(`${here}results.json`, JSON.stringify({ purs: version,
  cases: results }, null, 1) + '\n');
