import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { boundaryScanWrong, mintingWrong }
  from './r0-minting-boundary-cases.mjs';

test('only certifyPackage constructs Certified', () => {
  const compiled = Object.fromEntries(readdirSync('output')
    .filter(name => existsSync(`output/${name}/index.js`))
    .map(name => [name, readFileSync(`output/${name}/index.js`, 'utf8')]));
  assert.deepEqual(mintingWrong(compiled), []);
  assert.deepEqual(boundaryScanWrong(), []);
});
