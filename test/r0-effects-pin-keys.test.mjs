import test from 'node:test';
import assert from 'node:assert/strict';
import { movedKeys } from './r0-effects-pin-run.mjs';
import { effectsOf } from './r0-effects-canonical.mjs';

// The effect pin's comparison and encoder (Task 14; review 2 P3-3,
// P3-4): `movedKeys` sorts movement into added, removed and changed, and
// the encoder refuses an effect problem whose fields are not the ones it
// encodes.
test('movedKeys: added, removed and changed digests', () => {
  const pinned = { 'a#f': '1', 'a#g': '2', 'b#h': '3' };
  const found = { 'a#f': '1', 'a#g': '9', 'c#k': '4' };
  assert.deepEqual(movedKeys(pinned, found),
    { added: ['c#k'], removed: ['b#h'], changed: ['a#g'] });
  assert.deepEqual(movedKeys(pinned, { ...pinned }),
    { added: [], removed: [], changed: [] });
});

const fields = ['obligations', 'instances', 'annotations', 'nodes',
  'rigidMarks', 'effectRigids', 'arities', 'ambient', 'flexEff',
  'positions', 'signature'];
const emptyOf = names => Object.fromEntries(names.map(name => [name, []]));

test('the encoder refuses a field it does not encode, or a missing one',
  () => {
    assert.deepEqual(Object.keys(effectsOf(emptyOf(fields))), fields);
    assert.throws(() => effectsOf(emptyOf([...fields, 'deferred'])),
      /effect problem fields .* are not the encoded/);
    assert.throws(() => effectsOf(emptyOf(fields.slice(1))),
      /effect problem fields .* are not the encoded/);
  });
