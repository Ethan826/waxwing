import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pursGraph } from '../scripts/structure.mjs';
import { coercionFindings, foreignImports, foreignModules,
  foreignSurfaceFindings, foreignPinFile, forgingModules }
  from '../scripts/forgery.mjs';

// Task 1.1 breaker ruling: a compiled token is plain JS, so any value of
// an arbitrary type forges one. The rule is on the primitives that make
// such values: Unsafe.Coerce and Record.Unsafe only in a reviewed
// allowlist (empty), FFI only in pinned modules with pinned signatures.
// Each probe is re-review 5's route A1-A3, compiled by purs 0.15.16 and
// copied verbatim (graph entry, index.js, foreign.js); paths are rewritten
// to where the module would live in src/.
const { probes } = JSON.parse(readFileSync(
  'test/fixtures/r0/trusted-surface/forgery.json', 'utf8'));
const inSrc = probe => `src/${probe.module.split('.').join('/')}.purs`;
const graph = Object.fromEntries(probes.map(probe =>
  [probe.module, { ...probe.graph, path: inSrc(probe) }]));
const sources = Object.fromEntries(probes.map(probe =>
  [inSrc(probe), probe.purs]));
const withJs = probes.filter(probe => probe.foreign !== undefined)
  .map(probe => probe.module);
const probeModules = foreignModules(graph, path => sources[path],
  name => withJs.includes(name));
const any = 'which can produce a value of any type';
const runtimeNode = readFileSync('src/Runtime/Node.purs', 'utf8');
const nodePin = { 'Runtime.Node': foreignImports(runtimeNode) };
const unpinned = name => `${name} has a foreign module or foreign import`
  + ` and no entry in ${foreignPinFile}; re-pin with`
  + ' `node scripts/foreign-surface-pin.mjs`; a re-pin is a reviewed change';

test('every forging route of re-review 5 is a finding', () => {
  assert.deepEqual(coercionFindings(graph), [
    `Runtime.ForgeA depends on Unsafe.Coerce, ${any}`,
    `Runtime.ForgeB depends on Unsafe.Coerce, ${any}`,
    `Runtime.Cast depends on Unsafe.Coerce, ${any}`,
    `Program.UseD depends on Record.Unsafe, ${any}`]);
  assert.deepEqual(foreignSurfaceFindings({}, probeModules),
    [unpinned('Runtime.ForgeA')]);
  // A reviewed allowlist exempts a module; library modules are not src.
  assert.deepEqual(coercionFindings(graph, ['Runtime.ForgeA',
    'Runtime.ForgeB', 'Runtime.Cast', 'Program.UseD']), []);
  assert.deepEqual(coercionFindings({ 'Data.Exists': { path:
    '.spago/p/exists-6.0.0/src/Data/Exists.purs',
    depends: ['Unsafe.Coerce'] } }), []);
});

test('the forging module set covers the installed packages', () => {
  // Surveyed (docs/findings.md): of these packages' exports, only
  // unsafeCoerce and Record.Unsafe's unsafeGet/unsafeSet/unsafeDelete
  // produce a value of an arbitrary type (other than bottom). A new or
  // upgraded package needs the survey redone.
  assert.deepEqual(forgingModules, ['Unsafe.Coerce', 'Record.Unsafe']);
  assert.deepEqual(readdirSync('.spago/p').sort(), JSON.parse(readFileSync(
    'test/fixtures/r0/trusted-surface/surveyed-packages.json', 'utf8')));
});

test('a foreign signature change, a new FFI or a stale pin is a finding',
  () => {
    const node = 'src/Runtime/Node.purs';
    const read = text => foreignModules({ 'Runtime.Node': { path: node,
      depends: [] } }, () => text, () => true);
    assert.deepEqual(foreignSurfaceFindings(nodePin, read(runtimeNode)), []);
    const cast = 'foreign import cast ∷ ∀ a b. a → b\n';
    const [finding] = foreignSurfaceFindings(nodePin,
      read(`${runtimeNode}${cast}`));
    assert.ok(finding.startsWith('Runtime.Node: foreign imports differ from'
      + ' the pin, added foreign import cast ∷ ∀ a b. a → b; re-pin'),
    finding);
    const changed = runtimeNode.replace('Effect (Array String)',
      'Effect (Array Int)');
    assert.equal(foreignSurfaceFindings(nodePin, read(changed)).length, 1);
    assert.deepEqual(foreignSurfaceFindings(nodePin, {}),
      [`${foreignPinFile} pins Runtime.Node, which has no foreign module`
      + ' or foreign import; re-pin with'
      + ' `node scripts/foreign-surface-pin.mjs`; a re-pin is a reviewed'
      + ' change']);
    // JS beside a module with no foreign import still needs a pin.
    const bare = foreignModules({ 'Runtime.Bare': { path: 'src/R/B.purs',
      depends: [] } }, () => 'module Runtime.Bare where\n', () => true);
    assert.deepEqual(foreignSurfaceFindings({}, bare),
      [unpinned('Runtime.Bare')]);
  });

// Fail closed: a foreign import the reader cannot delimit is a finding.
test('a foreign import the reader cannot read fails closed', () => {
  const head = 'module Runtime.Node where\n';
  for (const body of ['  foreign import f ∷ Int\n',
    'x = 1 where foreign import f ∷ Int\n',
    'foreign import f ∷\n-- c\n  ∀ a b. a → b\n',
    'foreign import f ∷ {- c -} Int\n',
    'foreign import f ∷\n{- c -}\n  Int\n',
    '{- foreign import f ∷ Int -}\n']) {
    const modules = foreignModules({ 'Runtime.Node': {
      path: 'src/Runtime/Node.purs', depends: [] } }, () => head + body,
    () => true);
    const findings = foreignSurfaceFindings(nodePin, modules);
    assert.equal(findings.length, 1, body);
    assert.match(findings[0], /cannot read its foreign imports .* fails/,
      body);
  }
  assert.deepEqual(foreignImports(`${head}-- the foreign code\n`
    + 'foreign import data T ∷ Type\nforeign import f ∷\n  Int\n\n  → Int\n'
    + 'g = 1\n'), ['foreign import data T ∷ Type',
    'foreign import f ∷ Int → Int']);
});

test('the real tree has no coercion and only its pinned FFI', () => {
  const { graph: real, error } = pursGraph();
  assert.equal(error, undefined);
  assert.deepEqual(coercionFindings(real), []);
  const pin = JSON.parse(readFileSync(foreignPinFile, 'utf8'));
  assert.deepEqual(Object.keys(pin), ['Runtime.Node']);
  const modules = foreignModules(real);
  assert.deepEqual(Object.keys(modules), ['Runtime.Node']);
  assert.deepEqual(foreignSurfaceFindings(pin, modules), []);
});
