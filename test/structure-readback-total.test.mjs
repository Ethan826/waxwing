import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forgingModules } from '../scripts/forgery.mjs';
import { pursGraph } from '../scripts/structure.mjs';
import { scanModule } from './readback-total-loops.mjs';
import { besideJs, closure, forbiddenImports, readSource, srcClosure,
  surfaceFindings, tableFindings } from './readback-total-scan.mjs';

// R036 (1), T5 (dossier §18.161 (3)): the read-back's termination and
// partiality audit (docs/plans/2026-11-04-readback-termination-audit.md).
// The scan and the reviewed arguments are evidence, not a proof of
// totality or exception freedom. Over the src closure of
// ReadBack.Package: no forbidden import or `Partial` constraint, no src
// FFI, and every loop and reference cycle the scan finds has a reviewed
// row in test/fixtures/r0/readback-termination.json, and every row is
// found. A new loop or cycle fails here until its argument is added.
const { graph, error } = pursGraph();
const table = JSON.parse(readFileSync(
  'test/fixtures/r0/readback-termination.json', 'utf8')).entries;
const forbidden = [...forbiddenImports, ...Object.keys(forgingModules)];
const modules = graph === undefined ? [] : srcClosure(graph);
const compiled = name => readFileSync(`output/${name}/index.js`, 'utf8');

test('the closure is read', () => {
  assert.equal(error, undefined);
  // Floors (fall only with the owner's approval): the closure's size
  // when the audit was written, so an empty or truncated scan fails.
  assert.ok(closure(graph).length >= 170, `${closure(graph).length}`);
  assert.ok(modules.length >= 72, `${modules.length} src modules`);
  assert.ok(modules.includes('Domain.Type.Traverse'));
  assert.ok(modules.includes('Features.Check.Strategy.ReadBack.Least'));
});

test('no partiality, unsafe effect, laziness, forging import or FFI', () => {
  assert.deepEqual(surfaceFindings(graph, modules, readSource, besideJs,
    forbidden), []);
});

test('every loop and cycle has a reviewed argument, and every row is found',
  () => {
    const entries = modules.flatMap(name => scanModule(name, compiled(name)));
    assert.ok(entries.length >= 60, `${entries.length} entries`);
    assert.deepEqual(tableFindings(entries, table), []);
  });

// Must-fail cases: planted modules the scan must report.
const planted = (name, source) => ({ graph: { [name]: { path:
  `src/${name}.purs`, depends: [] } }, read: () => source });

test('a planted forbidden import, Partial constraint or FFI is reported',
  () => {
    for (const imported of forbidden) {
      const { graph: one, read } = planted('P', `module P where\nimport `
        + `${imported} (x)\n`);
      assert.deepEqual(surfaceFindings(one, ['P'], read, () => false,
        forbidden), [`P imports ${imported}`]);
    }
    const constraint = planted('C', 'f ∷ Partial ⇒ Int\n');
    assert.deepEqual(surfaceFindings(constraint.graph, ['C'],
      constraint.read, () => false), ['C has a Partial constraint']);
    const ffi = planted('F', 'foreign import f ∷ Int\n');
    assert.deepEqual(surfaceFindings(ffi.graph, ['F'], ffi.read,
      () => false), ['F has FFI']);
    const beside = planted('J', 'module J where\n');
    assert.deepEqual(surfaceFindings(beside.graph, ['J'], beside.read,
      () => true), ['J has FFI']);
  });

const js = body => 'import * as Control_Monad_Rec_Class from '
  + `"../Control.Monad.Rec.Class/index.js";\n${body}`;

test('a planted loop, cycle or tailRec is found, and an unlisted one fails',
  () => {
    const found = scanModule('Features.Check.MarkStore', js(`
var looped = function (n) { while (n > 0) { n = n - 1; }; return n; };
var even = function (n) { return n === 0 ? true : odd(n - 1); };
var odd = function (n) { return n === 0 ? false : even(n - 1); };
var self = function (n) { return self(n); };
var go = function (n) { var inner = function (k) { return inner(k); };
  return inner(n); };
var rec = function (s) { return Control_Monad_Rec_Class.tailRec(s); };
var Ctor = (function () { function Ctor() {}; Ctor.value = new Ctor();
  return Ctor; })();
`)).map(entry => `${entry.kind} ${entry.key}`).sort();
    const name = 'Features.Check.MarkStore';
    assert.deepEqual(found, [`cycle ${name}.go/{inner}`,
      `cycle ${name}.{even,odd}`, `cycle ${name}.{self}`,
      `loop ${name}.looped`, `tailRec ${name}.rec`].sort());
    const unlisted = { key: `${name}.planted`, kind: 'tailRec', count: 1 };
    assert.deepEqual(tableFindings([unlisted], []),
      [`no reviewed termination argument for tailRec ${name}.planted ×1`]);
    assert.deepEqual(tableFindings([], [{ ...unlisted, argument: 'x' }]),
      [`the table lists tailRec ${name}.planted ×1, which the scan no `
        + 'longer finds']);
    assert.deepEqual(tableFindings([unlisted], [{ ...unlisted,
      argument: ' ' }]), [`the table's row tailRec ${name}.planted ×1 `
        + 'states no argument']);
  });
