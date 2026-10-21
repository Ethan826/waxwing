// Runs each example of translation.md through the compiler's phases, in
// order, and prints the first phase that refuses it (code, message and
// line:column) or the last phase it passed. A phase whose compiled module
// is missing from the output directory is reported as unavailable, never
// as a pass: at b5647cc the tree does not build (translation.md, F0), so
// only Parse and Resolve could be run there.
//
//   node research/division-campaign/source/run.mjs [output-dir]
//
// The output directory defaults to ./output (npm run build). Nothing is
// written; no Go toolchain is used (Program.Compile stops at Go text).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = new URL('.', import.meta.url).pathname;
const output = resolve(process.argv[2] ?? 'output');
const load = async (module, name) => {
  const file = join(output, module, 'index.js');
  if (!existsSync(file)) return null;
  return (await import(pathToFileURL(file).href))[name];
};

const { Left } = await import(
  pathToFileURL(join(output, 'Data.Either', 'index.js')).href);
const wire = await load('Format.Diagnostic', 'wire');
const parse = await load('Format.Parse', 'parse');
const resolveNames = await load('Features.Resolve', 'resolve');
const check = await load('Features.Check', 'check');
const specialize = await load('Features.Specialize', 'specialize');
const phases = [['parse', parse], ['resolve', resolveNames],
  ['check', check], ['specialize', specialize]];

const shown = diagnostic => {
  const at = diagnostic.span.start;
  return `${diagnostic.code} ${at.line}:${at.column} ${diagnostic.message}`;
};

const outcome = source => {
  let value = source;
  let passed = 'nothing';
  for (const [name, phase] of phases) {
    if (phase === null) return `passed ${passed}; ${name} unavailable`;
    const result = phase(value);
    if (result instanceof Left) {
      return `refused at ${name}: ${shown(wire(result.value0))}`;
    }
    value = result.value0;
    passed = name;
  }
  return 'accepted (through specialization)';
};

const directory = join(here, 'examples');
for (const file of readdirSync(directory).sort()) {
  if (!file.endsWith('.wxw')) continue;
  const source = readFileSync(join(directory, file), 'utf8');
  console.log(`${file.padEnd(36)} ${outcome(source)}`);
}
