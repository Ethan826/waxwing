import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf, fixturesIn } from './r0-probe-support.mjs';

// T-R0e §1.4 and W §2.3: what today's compiler does with the shapes the
// plan calls AdmittedPendingR019. A characterization: it pins observed
// results so a later change shows up as a failure. Bounded evidence for
// these sources only; it decides nothing (G-R019 stays open).
const placeholder =
  'R005B placeholder: rows with several tails are lowered in Task 8';

test('R019 probe: every AdmittedPendingR019 shape, recorded', () => {
  const fixtures = fixturesIn('r0/r019');
  assert.equal(fixtures.length, 14);
  for (const f of fixtures) {
    const result = phaseOf(f.source);
    assert.equal(result.phase, f.phase, f.name);
    assert.equal(result.code, f.code, f.name);
    assert.equal(result.text, f.text, f.name);
  }
});

test('R019 probe: each caller-less shape and its caller are paired', () => {
  const names = fixturesIn('r0/r019').map(f => f.name);
  for (const name of names.filter(n => n.endsWith('/caller')))
    assert.ok(names.includes(name.replace('/caller', '/no-caller')), name);
});

test('R019 probe: a called two-tail shape stops at the Task 8 placeholder',
  () => {
    const called = fixturesIn('r0/r019')
      .filter(f => f.name.endsWith('/caller') && f.phase === 'specialize');
    assert.ok(called.length > 0);
    for (const f of called) {
      assert.equal(f.code, 'E_INTERNAL', f.name);
      assert.equal(f.text, placeholder, f.name);
    }
  });
