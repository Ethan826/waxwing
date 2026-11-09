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

// Online's own name for each fault, through the real strategy: the
// certificate's package replaced by that fault.
test('each read fault carries its own name to the verdict', async () => {
  const { forgedFrom, id2Source } =
    await import('./r0-forged-witness-support.mjs');
  const { outcomeOf } = await forgedFrom(load);
  const Fault = await load('Features.Check.Strategy.ReadBack.Fault');
  const { Left, Right } = await load('Data.Either');
  const Trace = await load('Features.Check.Trace');
  const made = name => (name === 'MarkClash' ? Fault.MarkClash.value
    : name === 'Clash' ? new Fault.Clash(Trace.AppliedKey.value)
      : new Fault[name](null, null));
  for (const name of faultNames) {
    const forge = certificate => ({ ...certificate,
      effects: new Left(made(name)) });
    const { decision } = outcomeOf(id2Source, 'id2', forge).decision.value0;
    const { verdict } = describe(new Right(decision));
    assert.match(verdict, name === 'Clash'
      ? /^Unresolved Unsupported EffectsUnread Clash /
      : new RegExp(`^Unresolved Unsupported EffectsUnread ${name}$`), name);
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
