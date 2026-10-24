import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { builtModules, filesUnder, foreignFiles, graphFindings,
  importFindings, pursGraph, reexportFindings, tokenAllowed,
  trustedImporters } from '../scripts/structure.mjs';
import { coercionFindings, foreignModules, foreignSurfaceFindings }
  from '../scripts/forgery.mjs';
import { compiledExports, foreignFindings, manifestFile, sourceExports,
  surfaceFindings, surfaceOf } from '../scripts/trusted-surface.mjs';

// Task 1.1 ruling (threat model): an allowed importer of a token Internal
// module is trusted, so its export surface is pinned and reviewed, and FFI
// JS outside the allowed importers may not name a token Internal module.
// Each probe in test/fixtures/r0/trusted-surface/probes.json is re-review
// 3's (I, K, J, A, E), given one reviewed export so that a baseline exists
// (purs rejects an empty export list), compiled by purs 0.15.16 and copied
// verbatim with its emitted index.js (docs/findings.md).
const { baselines, probes, forge } = JSON.parse(readFileSync(
  'test/fixtures/r0/trusted-surface/probes.json', 'utf8'));
const probe = name => probes.find(entry => entry.name === name);
const js = modules => Object.fromEntries(modules.map(module =>
  [module.module, module.js]));
const repin = '; re-pin with `node scripts/trusted-surface-pin.mjs`;'
  + ' a re-pin changes the trusted surface and needs review';
const pinOf = ({ module, purs, js: compiled }) =>
  ({ [module]: surfaceOf(module, purs, compiled) });
const present = ({ module, purs, js: compiled }) =>
  ({ [module]: { source: purs, js: compiled } });

test('the earlier checks miss probes I, K, A and E', () => {
  for (const name of ['I', 'K', 'A', 'E']) {
    const modules = js(probe(name).modules);
    assert.deepEqual(reexportFindings(modules), [], name);
    assert.deepEqual(importFindings(modules), [], name);
  }
  // J is reported only at the re-exporter; its client imports nothing.
  const client = probe('J').modules[1];
  assert.deepEqual(importFindings(js([client])), []);
});

test('an allowed importer\'s surface beyond its pin is a finding', () => {
  const expected = {
    I: ['source exports differ from the pin, added (~~)'],
    K: ['source exports differ from the pin, added (##)'],
    J: ['source exports differ from the pin, added module X',
      'compiled exports differ from the pin, added Refuted from'
      + ' ../Domain.Verdict.Internal/index.js'],
    A: ['compiled exports differ from the pin, added mintRuleSpec']
  };
  for (const [name, differences] of Object.entries(expected)) {
    const { baseline, modules } = probe(name);
    const importer = modules.find(module =>
      module.module === baselines[baseline].module);
    const manifest = pinOf(baselines[baseline]);
    assert.deepEqual(surfaceFindings(manifest, present(baselines[baseline])),
      [], name);
    assert.deepEqual(surfaceFindings(manifest, present(importer)),
      differences.map(text => `${importer.module}: ${text}${repin}`), name);
  }
});

test('an unpinned allowed importer and a stale pin are findings', () => {
  const rules = baselines.Rules;
  assert.deepEqual(surfaceFindings({}, present(rules)), [`${rules.module}`
    + ' is an allowed importer of a token Internal module with no entry in'
    + ` ${manifestFile}${repin}`]);
  assert.deepEqual(surfaceFindings(pinOf(rules), {}), [`${manifestFile}`
    + ` pins ${rules.module}, which no longer exists${repin}`]);
});

// Pinning fails closed: a header or output the parsers do not accept is a
// finding, never a pass.
test('a surface the parsers cannot read fails closed', () => {
  const rules = baselines.Rules;
  const header = 'module Features.Check.Refute.Rules (RuleSpec) where';
  const variants = [
    header.replace('(RuleSpec)', '(RuleSpec {- x -})'),
    header.replace('(RuleSpec)', '(RuleSpec -- x\n)'),
    header.replace(' where', '\r\nwhere'),
    header.replace(' (', '\t('),
    header.replace('(RuleSpec)', '(RuleSpec, (-->))'),
    header.replace('(RuleSpec)', '(RuleSpec, (<--))'),
    'module Features.Check.Refute.Rules where',
    header.replace('Rules (', 'Rulez ('),
    `{- doc -}\n${header}`, `é${header}`];
  for (const variant of variants) {
    const findings = surfaceFindings(pinOf(rules), present({ ...rules,
      purs: `${variant}\ndata RuleSpec = RuleSpec Int\n` }));
    assert.equal(findings.length, 1, variant);
    assert.match(findings[0], /cannot read its trusted surface .* fails/,
      variant);
  }
  for (const output of ['export * from "../X/index.js";\n',
    'export {\n    a b\n};\n', 'export default 1;\n']) assert.throws(() =>
    compiledExports(output), /unrecognized compiled export/, output);
});

test('the source parser reads each export form', () => {
  assert.deepEqual(sourceExports('A.B', '-- c\n\n--> d\nmodule A.B\n'
    + '  ( module X.Y, class C, type (~>), T, U(..), V(), W(P, Q), x\n'
    + '  , (<!>)\n  ) where\nimport Prelude\n'), ['module X.Y', 'class C',
    'type (~>)', 'T', 'U(..)', 'V()', 'W(P, Q)', 'x', '(<!>)']);
  assert.deepEqual(compiledExports('var a = 1;\nexport {\n    a,\n    b\n};\n'
    + 'export {\n    c\n} from "./foreign.js";\n//# x\n'),
  ['a', 'b', 'c from ./foreign.js']);
});

test('FFI naming a token Internal module is a finding (probe E)', () => {
  const mint = probe('E').modules[0];
  const internal = 'Domain.Verdict.Internal';
  for (const file of ['src/Runtime/Mint.js',
    'output/Runtime.Mint/foreign.js'])
    assert.deepEqual(foreignFindings({ [file]: { module: mint.module,
      js: mint.foreign } }, tokenAllowed),
    [`${file} (FFI of ${mint.module}) names ${internal}`]);
  assert.deepEqual(foreignFindings({ x: { module: 'Domain.Verdict',
    js: mint.foreign } }, tokenAllowed), []);
  assert.deepEqual(foreignFindings({ x: { module: 'Features.Check.Decide',
    js: 'import "../Domain.Recorded.Internal/index.js";' } }, tokenAllowed),
  ['x (FFI of Features.Check.Decide) names Domain.Recorded.Internal']);
});

test('the real tree matches its pin and its FFI names no token module',
  () => {
    const { graph, error } = pursGraph();
    assert.equal(error, undefined);
    const importers = trustedImporters(graph, builtModules('output'));
    // Task 2.3 added the static-rule classification, Generate.Static*;
    // Task 3.2 the generator and its static rules; Task 5.1 Refute.Rules
    // and Refute.Theorems; Task 4.2 Strategy.Substitution; Task 7.1a
    // D1's Assemble, Elab, Elab.* and Gen, and the importers of its two
    // token modules: Domain.Elaborating(.Build), Domain.Verdict.Judged
    // and Features.Check.Decide (rules E2 and E5); Task 7.1b the port's
    // Block, Body, Callee, Node and Update, folding Rigid into Signature.
    const generate = ['', '.Assemble', '.Block', '.Body', '.Builtin',
      '.Call', '.Callee', '.Context', '.Control', '.Effect', '.Elab',
      '.Elab.Image', '.Elab.Internal', '.Elab.Labels', '.Elab.Log',
      '.Elab.Recorded', '.Elab.Stages', '.Expr', '.Facts', '.Failure',
      '.Fault', '.Fresh', '.Gen', '.Inputs', '.Lookup', '.Node', '.Operator',
      '.Out', '.Pattern', '.Record', '.Signature', '.Static',
      '.Static.Problem', '.Static.Rules', '.Static.Site', '.Static.Walk',
      '.Translate', '.Update']
      .map(name => `Features.Check.Generate${name}`);
    assert.deepEqual(Object.keys(importers).sort(),
      ['Domain.Elaborating', 'Domain.Elaborating.Build', 'Domain.Recorded',
        'Domain.Verdict', 'Domain.Verdict.Judged', 'Features.Check.Decide',
        ...generate, 'Features.Check.Refute.Rules',
        'Features.Check.Refute.Theorems',
        'Features.Check.Strategy.Substitution'].sort());
    assert.deepEqual(surfaceFindings(JSON.parse(readFileSync(manifestFile,
      'utf8')), importers), []);
    const files = foreignFiles(filesUnder('src'), 'output');
    assert.ok('src/Runtime/Node.js' in files);
    assert.ok('output/Runtime.Node/foreign.js' in files);
    assert.deepEqual(foreignFindings(files, tokenAllowed), []);
  });

// Re-review 4's Runtime.Forge: `foreign import forge ∷ CX → Refuted` (JS
// `x => x`) and `forge2 = unsafeCoerce` return the CX, which is a Refuted
// once the newtype is erased. Its graph entry and output are verbatim; the
// scratch path is rewritten to where the module would live. The rule on
// the primitives (scripts/forgery.mjs, test/structure-forgery.test.mjs)
// reports both routes.
test('FFI or unsafeCoerce forging a token is a finding (Forge)', () => {
  const path = 'src/Runtime/Forge.purs';
  const graph = { [forge.module]: { ...forge.graph, path } };
  assert.deepEqual([reexportFindings({ [forge.module]: forge.js }),
    importFindings({ [forge.module]: forge.js }),
    foreignFindings({ 'src/Runtime/Forge.js': { module: forge.module,
      js: forge.foreign }, 'output/Runtime.Forge/foreign.js': {
      module: forge.module, js: forge.outputForeign } }, tokenAllowed),
    graphFindings(graph)], [[], [], [], []]);
  assert.deepEqual(coercionFindings(graph), ['Runtime.Forge depends on'
    + ' Unsafe.Coerce, which can produce a value of any type']);
  const modules = foreignModules(graph, () => forge.purs, () => forge.foreign);
  assert.deepEqual(Object.keys(modules), ['Runtime.Forge']);
  assert.equal(foreignSurfaceFindings({}, modules).length, 1);
});
