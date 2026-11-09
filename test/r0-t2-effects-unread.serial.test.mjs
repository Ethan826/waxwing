import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { faultNames, named, readingOf, unreadCases, wrongUnreadCases }
  from './r0-t2-effects-unread-cases.mjs';
import { load } from './r0-generate-support.mjs';
import { declarationsOf } from './r0-rt8-run.mjs';
import { describe } from './r0-decide-support.mjs';
import { windowClassOf } from './r0-shadow-classes.mjs';
import { compilingDecline, t6Classes } from './r0-shadow-table.mjs';

const { reading } = await load('Features.Check.Decide.Reading');

test('each read fault reaches RT8 and the window as a decline', () => {
  assert.deepEqual(wrongUnreadCases(), []);
  assert.equal(faultNames.length, 13);
  assert.equal(unreadCases().length, 13 * 8 + 2);
});

test('Decide reads PackageUnread as a real EffectsUnread decline', () => {
  for (const fault of faultNames) {
    const read = reading(readingOf(fault));
    assert.equal(named(read), 'Declines', fault);
    assert.equal(named(read.value0), 'EffectsUnread', fault);
    assert.equal(read.value0.value0, fault);
  }
});

// A real declaration, the real Online and the real Decide.
test('a real read fault, through the whole shadow path', () => {
  const origin = 'docs/plans/2026-10-21-c001-explicit/baseline/'
    + 'c7-pure-stages-construction.wxw';
  const rows = declarationsOf({ origin,
    source: readFileSync(origin, 'utf8') });
  const row = rows.find(found => found.decl.name === 'statsEvidence');
  const described = describe(row.decision);
  assert.equal(described.verdict,
    'Unresolved Unsupported EffectsUnread UnreadImage');
  assert.equal(row.class, 'declined by the check, a read fault '
    + '(PackageUnread): Unresolved Unsupported EffectsUnread UnreadImage');
  const found = windowClassOf({ at: row.at, rt8: row.class, today: null,
    r0: { verdict: described.verdict, attempt: described.attempts[0] },
    staticRefusals: [], erased: [], guard: [] });
  assert.equal(found, compilingDecline('a read fault'));
  assert.equal(t6Classes[found].section, '§3.2(b)');
});
