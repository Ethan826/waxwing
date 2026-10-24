import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { foreignFindings, manifestFile, surfaceFindings }
  from './trusted-surface.mjs';
import { coercionFindings, foreignModules, foreignPinFile,
  foreignSurfaceFindings } from './forgery.mjs';
import { internalModules, restricts, tokenModules }
  from './structure-modules.mjs';
import { elabFindings } from './structure-elab.mjs';

export const filesUnder = root =>
  readdirSync(root, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory()
    ? filesUnder(join(root, entry.name)) : [join(root, entry.name)]);

const maximumFileLines = 250;
const maximumPureScriptColumns = 80;
const bytesPerKibibyte = 1024;
const graphBufferMebibytes = 4;
const graphBufferBytes = graphBufferMebibytes * bytesPerKibibyte ** 2;

export const layers = ['Domain', 'Features', 'Format', 'Runtime', 'Program'];
const pureLayers = ['Domain', 'Features', 'Format'];
// Control.Monad.Rec.Class supplies tailRecM, the only stack-safe loop for
// long inputs (BACKLOG E002); the rest of Control stays out of pure layers.
const coreLibraries = new RegExp('^(Prelude$|Control\\.Monad\\.Rec\\.Class$|'
  + 'Data\\.(Map|Set|Tuple|Enum|Array|Array\\.NonEmpty)$|'
  + 'Data\\.(Either|Maybe|Int|String|Foldable|Traversable)(\\.|$))');
const partialModules = /(^|\.)(Unsafe|Partial)(\.|$)/;
// Commands run over capability ports only, so tests can pass fake hosts.
const portCommands = ['Program.Command'];
const hostEffects = /^(Effect|Runtime)(\.|$)/;

export const layerOf = moduleName => moduleName.split('.')[0];

const projectFinding = (name, dependency) => {
  const own = layers.indexOf(layerOf(name));
  const target = layers.indexOf(layerOf(dependency));
  if (target > own)
    return [`${name} (${layerOf(name)}) imports ${dependency}`
      + ` (${layerOf(dependency)})`];
  // One finding however many rules refuse the import (a Generate.*
  // Internal module is under both E3 and its own rule).
  return internalModules.some(rule => restricts(rule, dependency)
    && !rule.importers.test(name)) ? [`${name} imports ${dependency}`] : [];
};

const libraryFinding = (name, dependency) => {
  if (!pureLayers.includes(layerOf(name))) return [];
  if (partialModules.test(dependency) || !coreLibraries.test(dependency))
    return [`pure module ${name} imports ${dependency}`];
  return [];
};

const commandFinding = (name, dependency) =>
  portCommands.includes(name) && hostEffects.test(dependency)
    ? [`port command ${name} imports ${dependency}`] : [];

export const graphFindings = graph =>
  Object.entries(graph).flatMap(([name, module]) => {
  if (!module.path.startsWith('src/')) return [];
  if (!layers.includes(layerOf(name))) return [`unlayered module: ${name}`];
  return module.depends.flatMap(dependency =>
    [...commandFinding(name, dependency),
    ...(layers.includes(layerOf(dependency)) ? projectFinding(name,
      dependency) : libraryFinding(name, dependency))]);
});

// Read from the compiler's output rather than from source: purs 0.15.16
// emits every `module X` re-export of a value as `export { … } from
// "../M/index.js"`, whatever the source's comments, layout or aliases
// (docs/findings.md, "The verdict token boundary", fix round 2).
const forwarded = new RegExp('export\\s*(\\{[^}]*\\}|\\*(\\s+as\\s+\\w+)?)'
  + '\\s*from\\s*"\\.\\./([^/"]+)/index\\.js"', 'g');

export const reexportFindings = modules =>
  Object.entries(modules).flatMap(([name, js]) =>
  [...js.matchAll(forwarded)].filter(match =>
    tokenModules.includes(match[3])).map(match =>
    `${name} re-exports ${match[1].replace(/\s+/g, ' ')} from ${match[3]}`));

// purs inlines constructors: a client of an operator alias for a
// constructor (`infix 4 Valid as <!>`), or of a re-export, imports the
// Internal module's JS directly though its source never names it (fix
// round 3). So a token Internal module's compiled JS may be imported only
// by its allowed importers, the same rule as the graph check; the public
// re-exporter is one of them.
const imported =
  /^import\s+(?:[^"';]*?\s+from\s*)?"\.\.\/([^/"]+)\/index\.js"/gm;

export const importFindings = modules =>
  Object.entries(modules).flatMap(([name, js]) =>
  [...js.matchAll(imported)].flatMap(match => internalModules.filter(rule =>
    rule.module === match[1] && tokenModules.includes(rule.module)
    && !rule.importers.test(name)).map(() =>
    `${name}'s compiled JS imports ${match[1]}`)));

// Refute.Theorems's importer names TheoremRef without constructors
// (preflight row 37): an explicit list, no `hiding`, nothing in
// parentheses after TheoremRef. purs graph sees modules only, so this
// reads each src module's import of Theorems, continuation lines included.
const theoremsImport = new RegExp('^[ \\t]*import\\s+Features\\.Check\\.Refute'
  + '\\.Theorems(?![\\w.])([^\\n]*(?:\\n[ \\t]+[^\\n]*)*)', 'gm');
const constructorNamed = list => !list.startsWith('(')
  || /\bhiding\b|\bTheoremRef\s*\(|\(\s*\.\.\s*\)/.test(list);

export const theoremImportFindings = sources =>
  Object.entries(sources).flatMap(([file, source]) =>
  [...source.matchAll(theoremsImport)].filter(match =>
    constructorNamed(match[1].replace(/--[^\n]*/g, '').trim())).map(() =>
    `${file} imports Features.Check.Refute.Theorems without naming`
    + ' TheoremRef alone'));

// May `name` import the token Internal module `internal`?
export const tokenAllowed = (name, internal) => internalModules.some(rule =>
  rule.module === internal && tokenModules.includes(internal)
  && rule.importers.test(name));

const trusted = name => tokenModules.some(internal =>
  tokenAllowed(name, internal));

// Each allowed importer present in src/ (by purs graph) or output/, with
// its source and compiled index.js; a missing one is left undefined.
export const trustedImporters = (graph, built) => Object.fromEntries([
  ...new Set([...Object.keys(graph).filter(name =>
    graph[name].path.startsWith('src/')), ...Object.keys(built)])]
  .filter(trusted).map(name => [name, {
    source: graph[name]?.path.startsWith('src/')
      ? readFileSync(graph[name].path, 'utf8') : undefined,
    js: built[name] }]));

// FFI JS in src/ (module named by path) and its copies in output/.
export const foreignFiles = (sources, root) => Object.fromEntries([
  ...sources.filter(file => file.startsWith('src/') && file.endsWith('.js'))
    .map(file => [file, file.slice('src/'.length, -'.js'.length)
    .split('/').join('.')]),
  ...readdirSync(root).filter(name =>
    existsSync(join(root, name, 'foreign.js'))).map(name =>
    [join(root, name, 'foreign.js'), name])].map(([file, module]) =>
  [file, { module, js: readFileSync(file, 'utf8') }]));

export const pursGraph = () => {
  const result =
    spawnSync('purs', ['graph', 'src/**/*.purs', '.spago/p/*/src/**/*.purs'], {
    encoding: 'utf8', maxBuffer: graphBufferBytes });
  if (result.error || result.status !== 0)
    return { error: `purs graph failed: ${result.error?.message
    ?? result.stderr}` };
  return { graph: JSON.parse(result.stdout) };
};

export const builtModules = root => Object.fromEntries(readdirSync(root,
  { withFileTypes: true }).filter(entry => entry.isDirectory()
  && existsSync(join(root, entry.name, 'index.js'))).map(entry =>
  [entry.name, readFileSync(join(root, entry.name, 'index.js'), 'utf8')]));

const disabledGate = new RegExp('\\.(skip|only|todo)\\s*\\('
  + '|@ts-(ignore|nocheck|expect-error)|eslint[-]disable');

export const textFindings = (file, source) => {
  const findings = [];
  const lines = source.split('\n').length - (source.endsWith('\n') ? 1 : 0);
  if (lines > maximumFileLines)
    findings.push(`${file}: ${lines} lines exceeds ${maximumFileLines}`);
  if (file.endsWith('.purs')) source.split('\n').forEach((line, index) => {
    if ([...line].length > maximumPureScriptColumns)
      findings.push(`${file}:${index
      + 1}: exceeds ${maximumPureScriptColumns} columns`);
  });
  if (!source.endsWith('\n')) findings.push(`${file}: missing final newline`);
  if (file.endsWith('.purs') && /\b(unsafe\w*|Partial|fromJust)\b/.test(source))
    findings.push(`${file}: partial escape`);
  if (disabledGate.test(source)) {
    findings.push(`${file}: disabled gate or test`);
  }
  return findings;
};

export const checkStructure = async () => {
  const { check } = await import('../output/Style.Check/index.js');
  const files =
    ['src', 'test', 'scripts',
    'tools/style/src'].flatMap(filesUnder).filter(file =>
    /\.(purs|mjs|js)$/.test(file));
  const findings =
    files.flatMap(file => textFindings(file, readFileSync(file, 'utf8')));
  findings.push(...files.filter(file => file.endsWith('.purs')).flatMap(file =>
    check(readFileSync(file, 'utf8')).map(message => `${file}: ${message}`)));
  // verify builds before this runs, so output/ is current.
  const built = builtModules('output');
  findings.push(...reexportFindings(built), ...importFindings(built));
  findings.push(...foreignFindings(foreignFiles(files, 'output'),
    tokenAllowed));
  findings.push(...elabFindings());
  findings.push(...theoremImportFindings(Object.fromEntries(files.filter(file =>
    file.startsWith('src/') && file.endsWith('.purs')).map(file =>
    [file, readFileSync(file, 'utf8')]))));
  findings.push(...files.filter(file =>
    file.startsWith('src/') && !file.startsWith('src/Runtime/')
    && file.endsWith('.js')).map(file => `${file}: FFI outside Runtime`));
  const { graph, error } = pursGraph();
  if (error !== undefined) return [...findings, error];
  findings.push(...graphFindings(graph), ...coercionFindings(graph),
    ...foreignSurfaceFindings(JSON.parse(readFileSync(foreignPinFile,
      'utf8')), foreignModules(graph)));
  findings.push(...surfaceFindings(JSON.parse(readFileSync(manifestFile,
    'utf8')), trustedImporters(graph, built)));
  return findings;
};
