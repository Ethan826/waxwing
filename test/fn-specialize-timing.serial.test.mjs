// Routine half of the specialization-key test; its 2 s time bound is in
// fn-specialize-timing.perf.test.mjs (npm run perf).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { specializationKeys } from '../output/Features.Specialize/index.js';
import { checkedPoly } from './phases.mjs';
import { keyTexts } from './poly-keys.mjs';
import { width, wide } from './fn-specialize-support.mjs';

const spelled = last => [...Array(width - 1).fill('Int'), last, 'Int']
  .join(' -> ');

test('5,000-parameter function types key by number, kept distinct', () => {
  const checked = checkedPoly(wide);
  const result = specializationKeys(checked);
  if (!(result instanceof Right)) assert.fail(JSON.stringify(result));
  const keys = keyTexts(wide);
  assert.equal(new Set(keys).size, keys.length, 'keys are unique');
  for (const last of ['Int', 'Bool']) {
    const arrow = spelled(last);
    for (const key of [`fn id[${arrow}]`, `fn keep[${arrow}]`,
      `fn probe[${arrow}]`, `type Box[${arrow}]`, `fn keep[Box(${arrow})]`]) {
      assert.ok(keys.includes(key), key.slice(0, 40));
    }
  }
});
