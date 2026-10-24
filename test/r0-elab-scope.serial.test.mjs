import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { compileScope, expectedRejections, fixtureDir, fixtureNames }
  from './r0-elab-scope-support.mjs';
import { check } from '../output/Style.Check/index.js';

// R0 Task 7.1a, D1 spec §10 T3c (Id, Tr, Mint): fixture modules that
// return a handle out of `seal` (i), read one seal's handle in another
// (ii), `bind` on `Elab` (iii), `coerce` a handle's or an `Elab`'s scope
// (iv), match `Elab` or `Handle` with only Generate.Elab imported (v),
// or call `seal` or `generateIn` with only Features.Check.Generate
// imported (vi; `generateIn` since Task 7.1b), each fail to compile with
// its error class; the shared module, a control that uses a handle
// inside its own generation and a control that reaches `generateIn`
// through Generate.Body compile. Real purs, the
// tree's own output as externs (one compiler run). Serial because it is
// heavy: purs reads every source of the tree and the package set (about
// 1.5 s, several cores), which would load the parallel phase.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('T3c: each scope escape fails to compile, the controls compile', () => {
  const { status, errors } = compileScope(root);
  assert.equal(status, 1);
  assert.deepEqual(Object.keys(errors).sort(),
    Object.keys(expectedRejections).sort());
  for (const [name, [code, phrase]] of Object.entries(expectedRejections)) {
    assert.deepEqual(errors[name].map(found => found.code), [code], name);
    assert.ok(errors[name][0].message.includes(phrase), name);
  }
  assert.equal(errors['Test.ElabScope.Common'], undefined);
  assert.equal(errors['Test.ElabScope.Accepted'], undefined);
  assert.equal(errors['Test.ElabScope.Reached'], undefined);
});

// The fixtures are `.purs.txt` (spago would build `.purs` under test/),
// so the structure gate's style check does not reach them; it runs here.
test('T3c: the fixtures obey the style rules', () => {
  assert.equal(fixtureNames().length, 12);
  for (const name of fixtureNames())
    assert.deepEqual(check(readFileSync(`${fixtureDir}/${name}`, 'utf8')),
      [], name);
});
