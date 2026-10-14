// FX020 one-off rewrite tool (Task 7 removes it, R4): every bare effect
// operation call and reference in the corpus gains its qualifier
// (`log(1)` → `Log.log(1)`, `print(x)` → `Console.print(x)`, `fail(e)` →
// `Fail.fail(e)`), located through the compiler's resolved output, never
// a regular expression (spec §6, amendment 4).
//
//   node scripts/fx020-migrate.mjs [--root DIR] [--compiler DIR]
//     [--harvest FILE] [--regenerate] [--paths a,b] [--write]
//     [--manifest FILE] [--edits FILE]
//
// Dry run by default: prints coverage by area and writes the manifest and
// the edit map, changing no source. `--write` rewrites files in place.
// `--paths` limits the rewrite to files under the given prefixes (for
// staged migration); every file still serves as context. The harvest
// (default .build/differential-harvest.jsonl; `--regenerate` runs the
// test suite under scripts/differential-hook.mjs) supplies the programs
// test files build at run time, so fragments can be placed. Units the
// tool cannot place go to the manifest (scripts/fx020-manual.json with
// --write, else .build/fx020-manual.json) for review by hand: `entries`
// with token-stream candidates, and `mentions`, text that names an
// operation in no recognisable shape. The edit map (.build/
// fx020-edits.json) holds, per file, every insertion with its file
// position and, per unit, its insertions in program offsets.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { compiler, regenerate } from './differential-load.mjs';
import { areaOf, areas, corpusFiles } from './fx020-corpus.mjs';
import { environment, migrateSource, unitText, unitsOf } from
  './fx020-file.mjs';
import { declared } from './fx020-tokens.mjs';

const width = 80;

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

// The operations a file can see: those its own literals declare and
// those of the modules it imports, transitively.
const scopes = files => {
  const own = new Map(files.map(({ path, text }) => [path,
    unitsOf(path, text).flatMap(unit => declared(unitText(unit)))]));
  const imports = new Map(files.map(({ path, text }) => [path,
    [...text.matchAll(/\bfrom\s+'(\.[^']+)'/g)]
      .map(match => normalize(join(dirname(path), match[1])))]));
  return path => {
    const seen = new Set([path]);
    const pending = [path];
    const scope = new Map();
    while (pending.length > 0) {
      const next = pending.pop();
      for (const [name, effect] of own.get(next) ?? []) {
        scope.set(name, (scope.get(name) ?? new Set()).add(effect));
      }
      for (const imported of imports.get(next) ?? []) {
        if (!seen.has(imported)) { seen.add(imported); pending.push(imported); }
      }
    }
    return scope;
  };
};

const harvestLines = file => existsSync(file)
  ? readFileSync(file, 'utf8').split('\n').filter(Boolean)
    .map(line => JSON.parse(line)) : [];

const wideLines = (before, after) => {
  const old = new Set(before.split('\n'));
  return after.split('\n').filter(line => !old.has(line)
    && [...line].length > width).length;
};

const tally = (rows, path, result, after, text) => {
  const row = rows.get(areaOf(path)) ?? { files: 0, units: 0, edits: 0,
    manual: 0, candidates: 0, mentions: 0, wide: 0 };
  row.files += result.edits.length > 0 ? 1 : 0;
  row.units += result.units.length;
  row.edits += result.edits.length;
  row.manual += result.manual.length;
  row.candidates += result.manual
    .reduce((total, entry) => total + entry.candidates.length, 0);
  row.mentions += result.mentioned.length;
  row.wide += wideLines(text, after);
  rows.set(areaOf(path), row);
};

const report = rows => {
  for (const [area] of areas) {
    const row = rows.get(area);
    if (row === undefined) continue;
    console.log(`${area.padEnd(14)} ${row.files} files ${row.units} units `
      + `${row.edits} edits ${row.manual} manual (${row.candidates} `
      + `candidates) ${row.mentions} mentions ${row.wide} wide lines`);
  }
};

const save = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};

const main = async () => {
  const root = resolve(option('--root', '.'));
  const write = process.argv.includes('--write');
  const harvest = resolve(option('--harvest',
    join(root, '.build/differential-harvest.jsonl')));
  if (process.argv.includes('--regenerate')) regenerate(root, harvest);
  const loaded = await compiler(resolve(option('--compiler', root)));
  const files = corpusFiles(root).map(path =>
    ({ path, text: readFileSync(join(root, path), 'utf8') }));
  const statics = files.flatMap(({ path, text }) =>
    unitsOf(path, text).map(unitText));
  const env = await environment(loaded, [...harvestLines(harvest),
    ...statics]);
  const prefixes = option('--paths', '').split(',').filter(Boolean);
  const chosen = files.filter(({ path }) => prefixes.length === 0
    || prefixes.some(prefix => path.startsWith(prefix)));
  const scopeOf = scopes(files);
  const rows = new Map();
  const manifest = { entries: [], mentions: [] };
  const map = {};
  for (const { path, text } of chosen) {
    const result = migrateSource(env, path, text, scopeOf(path));
    tally(rows, path, result, result.text, text);
    manifest.entries.push(...result.manual);
    manifest.mentions.push(...result.mentioned);
    if (result.edits.length === 0) continue;
    map[path] = { edits: result.edits, units: result.units };
    if (write) writeFileSync(join(root, path), result.text);
  }
  report(rows);
  const manifestFile = resolve(option('--manifest', join(root,
    write ? 'scripts/fx020-manual.json' : '.build/fx020-manual.json')));
  save(manifestFile, manifest);
  save(resolve(option('--edits', join(root, '.build/fx020-edits.json'))),
    map);
  console.log(`${write ? 'rewrote' : 'dry run:'} ${Object.keys(map).length}`
    + ` files; manifest ${manifestFile}`);
};

await main();
