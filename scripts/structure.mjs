import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

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
// Each internal IR is visible only to the phase that produces it and the one
// that consumes it: Check produces the checked IR, Specialize alone reads it
// and produces the monomorphic IR, and Go generation alone reads that.
const internalModules = [
  { module: 'Domain.Checked.Internal',
    importers: /^Features\.(Check|Specialize)(\.|$)/ },
  { module: 'Domain.IR.Internal',
    importers: /^(Features\.Specialize|Format\.Go|Domain\.IR\.Parts)(\.|$)/ },
  // R0 tokens (T-R0a §3.1): only the trusted checkers mint Valid, Refuted,
  // NonForced and ForcednessEvidence; Domain.Verdict re-exports the types.
  { module: 'Domain.Verdict.Internal',
    importers: new RegExp('^(Domain\\.Verdict|Features\\.Check\\.('
      + 'Strategy\\.Substitution|Refute\\.Rules'
      + '|Admit\\.Forcedness\\.Check))$') },
  // Only generation builds a recorded problem (T-R0a §2 property 2).
  { module: 'Domain.Recorded.Internal',
    importers: /^(Domain\.Recorded$|Features\.Check\.Generate(\.|$))/ }
];
// Each token Internal module and the one public module that re-exports
// its types. purs graph does not show re-exports, so exportFindings reads
// source: the public module imports its Internal module only as bare type
// names (`import X.Internal (T, …) as Exports`: no `(..)`, no values, no
// open import), and no other module re-exports an Internal module.
const reexported = [
  { internal: 'Domain.Verdict.Internal', public: 'Domain.Verdict' },
  { internal: 'Domain.Recorded.Internal', public: 'Domain.Recorded' }
];
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
  return internalModules.filter(rule => rule.module === dependency
    && !rule.importers.test(name))
    .map(() => `${name} imports ${dependency}`);
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

// Comments are removed first, so none can hide an import, end the export
// list early (`-- ) where`) or break an anchor. A `--` followed by a
// symbol character is an operator, not a comment.
const commentless = source => source.replace(/\{-[^]*?-\}/g, ' ')
  .replace(/--+(?![!#$%&*+./<=>?@\\^|~:])[^\n]*/g, '');
const aliasName = "[A-Z][\\w']*(\\.[A-Z][\\w']*)*";
const typeName = "[A-Z][\\w']*";
const bareTypes = new RegExp(`^\\(\\s*${typeName}(\\s*,\\s*${typeName})*\\s*\\)`
  + `(\\s+as\\s+${aliasName})?$`);
const aliased = /(^|\s)as\s/;
const importsOf = (source, internal) => [...source.matchAll(new RegExp(
  `^import\\s+${internal.replaceAll('.', '\\.')}(?![\\w.])((?:.|\\n[ \\t])*)`,
  'gm'))].map(match => match[1].trim());
const exportedModules = source => [...(source.match(
  /^module\s+[\w.]+\s*\(((?:.|\n)*?)\)\s*where/m)?.[1] ?? '')
  .matchAll(/\bmodule\s+([\w.]+)/g)].map(match => match[1]);

// In the public module every import of its Internal module lists bare
// type names. Elsewhere any alias on such an import is a finding, whether
// or not the alias is exported (review I1: purs accepts dotted aliases),
// and so is exporting the Internal module under its own name.
export const exportFindings = (file, text) => {
  const source = commentless(text);
  const name = source.match(/^module\s+([\w.]+)/m)?.[1];
  const exported = exportedModules(source);
  return reexported.flatMap(rule => {
    const imports = importsOf(source, rule.internal);
    if (name === rule.public) return imports.filter(body =>
      !bareTypes.test(body)).map(() =>
      `${file}: imports ${rule.internal} beyond bare type names`);
    return [...imports.filter(body => aliased.test(body)).map(() =>
      `${file}: imports ${rule.internal} under an alias`),
    ...exported.filter(module => module === rule.internal).map(() =>
      `${file}: re-exports ${rule.internal}`)];
  });
};

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
  findings.push(...files.filter(file => file.startsWith('src/')
    && file.endsWith('.purs')).flatMap(file =>
    exportFindings(file, readFileSync(file, 'utf8'))));
  findings.push(...files.filter(file =>
    file.startsWith('src/') && !file.startsWith('src/Runtime/')
    && file.endsWith('.js')).map(file => `${file}: FFI outside Runtime`));
  const result =
    spawnSync('purs', ['graph', 'src/**/*.purs', '.spago/p/*/src/**/*.purs'], {
    encoding: 'utf8', maxBuffer: graphBufferBytes });
  if (result.error || result.status !== 0)
    findings.push(`purs graph failed: ${result.error?.message
    ?? result.stderr}`);
  else findings.push(...graphFindings(JSON.parse(result.stdout)));
  return findings;
};
