// The Waxwing corpus of the repository, as { origin, source } entries,
// each distinct source once (the first origin found is kept):
//   - every *.wxw file;
//   - every JSON fixture under test/fixtures with a string `source`;
//   - every ```waxwing or ```wxw block in Markdown under docs/, research/
//     (except this stream's two documents) and the top level;
//   - every string a test data module exports that writes `fn` (below);
//   - programs from the two record generators, by seed (below).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const skipped = new Set(
  ['node_modules', '.git', '.claude', '.build', 'output', '.lake',
    '.history', '.spago']);

// Stream 9's application-shaped programs are measured on their own
// (apps/measure-apps.mjs), so they do not change this corpus.
const ownPrograms = 'research/division-campaign/integration/apps';

const walk = (root, directory, keep) => {
  const found = [];
  for (const name of readdirSync(directory)) {
    if (skipped.has(name)) continue;
    const path = join(directory, name);
    if (relative(root, path) === ownPrograms) continue;
    if (statSync(path).isDirectory()) found.push(...walk(root, path, keep));
    else if (keep(name)) found.push(path);
  }
  return found;
};

const wxw = root => walk(root, root, name => name.endsWith('.wxw'))
  .map(path => ({ origin: relative(root, path),
    source: readFileSync(path, 'utf8') }));

const fixtures = root =>
  walk(root, join(root, 'test/fixtures'), name => name.endsWith('.json'))
    .flatMap(path => {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      return typeof data.source === 'string'
        ? [{ origin: relative(root, path), source: data.source }]
        : [];
    });

const fenced = new RegExp('```(?:waxwing|wxw)\\n([\\s\\S]*?)```'
  + '|~~~(?:waxwing|wxw)\\n([\\s\\S]*?)~~~', 'g');

// This stream's and stream 9's documents quote the join and the
// application programs; they are skipped.
const ownDocs = ['measurements.md', 'recorder-interface.md',
  'app-measurements.md']
  .map(name => `research/division-campaign/integration/${name}`);

const markdown = root => [
  ...walk(root, join(root, 'docs'), name => name.endsWith('.md')),
  ...walk(root, join(root, 'research'), name => name.endsWith('.md'))
    .filter(path => !ownDocs.includes(relative(root, path))),
  ...readdirSync(root).filter(name => name.endsWith('.md'))
    .map(name => join(root, name))
].flatMap(path => {
  const text = readFileSync(path, 'utf8');
  return [...text.matchAll(fenced)].map((match, index) => ({
    origin: `${relative(root, path)}#${index + 1}`,
    source: match[1] ?? match[2]
  }));
});

// Test data modules (test/*programs*.mjs and the like) imported, and
// every string they export, at any depth of arrays and plain objects,
// that writes `fn name(`. Programs built by exported functions, and
// programs written inline in *.test.mjs files, are not collected.
const program = /\bfn\s+\w+\s*\(/;
const strings = (value, depth, into) => {
  if (typeof value === 'string') {
    if (program.test(value)) into.push(value);
  } else if (depth > 0 && Array.isArray(value)) {
    value.forEach(item => strings(item, depth - 1, into));
  } else if (depth > 0 && value?.constructor === Object) {
    Object.values(value).forEach(item => strings(item, depth - 1, into));
  }
  return into;
};

const testData = async root => {
  const names = readdirSync(join(root, 'test')).filter(name =>
    /(programs|forms|lambdas)\.mjs$/.test(name));
  const found = [];
  for (const name of names) {
    const module = await import(join(root, 'test', name));
    for (const [key, value] of Object.entries(module)) {
      strings(value, 5, []).forEach((source, index) => found.push({
        origin: `test/${name}:${key}#${index + 1}`, source
      }));
    }
  }
  return found;
};

// The two record generators of the FX001 corpus, seeds 1..count each
// (test/fx-gen-record-extension.mjs, test/fx-gen-record-patterns.mjs).
const generators =
  ['fx-gen-record-extension.mjs', 'fx-gen-record-patterns.mjs'];
const generated = async (root, count) => {
  const found = [];
  for (const name of generators) {
    const { generate } = await import(join(root, 'test', name));
    for (let seed = 1; seed <= count; seed++) {
      found.push({ origin: `generated:${name}@${seed}`,
        source: generate(seed).source });
    }
  }
  return found;
};

export const corpus = async (root, count) => {
  const seen = new Set();
  const entries = [];
  for (const entry of
    [...wxw(root), ...fixtures(root), ...markdown(root),
      ...await testData(root), ...await generated(root, count)]) {
    if (seen.has(entry.source)) continue;
    seen.add(entry.source);
    entries.push(entry);
  }
  return entries;
};
