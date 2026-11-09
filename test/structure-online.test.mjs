import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { facts } from '../output/Style.Trace/index.js';
import { onlineImportFindings } from '../scripts/structure-online.mjs';

// Tranche 2 Task 12 review I1: Online takes exactly `certify` and
// `certifySound` from Strategy.Substitution, so its `validate` (A2's
// validator) cannot reach the online strategy. Read from the syntax tree.
const online = 'src/Features/Check/Strategy/Online.purs';
const source = readFileSync(online, 'utf8');
const header = 'module Features.Check.Strategy.Online where\n';
const found = text => onlineImportFindings({ [online]: text }, facts);
const imports = list => `${header}import Features.Check.Strategy`
  + `.Substitution ${list}\n`;

test('the tree passes: Online takes certifyPackage, certifySound', () => {
  assert.deepEqual(found(source), []);
  assert.deepEqual(found(imports('(certifySound, certifyPackage)')), []);
});

test('validate, an open, hiding or missing import is a finding', () => {
  const rule = 'structure: Features.Check.Strategy.Online must import'
    + ' exactly certifyPackage, certifySound from'
    + ' Features.Check.Strategy.Substitution';
  for (const list of ['(certifyPackage, certifySound, validate)', '',
    'as S', 'hiding (validate)', '(certifyPackage)', '(certify, certifySound)'])
    assert.deepEqual(found(imports(list)), [rule], list);
  assert.deepEqual(found(`${header}import Prelude\n`), [rule]);
  assert.deepEqual(found(`${imports('(certifyPackage, certifySound)')}`
    + 'import Features.Check.Strategy.Substitution (validate)\n'), [rule]);
  assert.deepEqual(onlineImportFindings({}, facts),
    ['structure: 0 modules named Features.Check.Strategy.Online']);
});
