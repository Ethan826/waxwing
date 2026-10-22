import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedCorpus, driftOf, manifestOf, repinCommand }
  from './r0-corpus.mjs';

// The pin of the R0 corpus (test/r0-corpus.mjs), on injected entries:
// each kind of drift is named, and any drift stops the loader with the
// re-pin command. The repository's own corpus is loaded, pinned, by
// test/r0-exhausted.serial.test.mjs.
const one = { origin: 'a.wxw', source: 'fn main(): Int = 1;' };
const two = { origin: 'b.wxw', source: 'fn main(): Int = 2;' };
const pinned = manifestOf([one, two]);

test('a pinned corpus shows no drift and loads', () => {
  assert.deepEqual(driftOf(pinned, [one, two]),
    { added: [], removed: [], changed: [] });
  assert.deepEqual(checkedCorpus(pinned, [one, two]), [one, two]);
});

test('each kind of drift is named', () => {
  const edited = { ...two, source: 'fn main(): Int = 3;' };
  const three = { origin: 'c.wxw', source: 'fn main(): Int = 4;' };
  assert.deepEqual(driftOf(pinned, [edited, three]),
    { added: ['c.wxw'], removed: ['a.wxw'], changed: ['b.wxw'] });
});

test('any drift stops the loader with the re-pin command', () => {
  const edited = { ...one, source: 'fn main(): Int = 5;' };
  for (const entries of [[one], [one, two, { ...two, origin: 'd.wxw' }],
    [edited, two]]) {
    assert.throws(() => checkedCorpus(pinned, entries), error =>
      error.message.includes(repinCommand));
  }
});

test('a manifest of another generator count does not pin', () => {
  const other = { ...pinned, generatedPerGenerator: 1 };
  assert.throws(() => checkedCorpus(other, [one, two]), /re-pin/);
});
