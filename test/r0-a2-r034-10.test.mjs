import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { ownerCases, ownerMissed } from './r0-a2-prerequisites-cases.mjs';

// BACKLOG R034 (10), dossier §18.161 (2): record check 4 counts owners
// (`Install`, `HandlerLit`, `Defer`) by provenance, whatever their
// values, so an owner recorded twice at one identity is a defect at
// check 4 even when each copy finds its companions once. Owners only:
// a repeated `Equal` or `Consume` stays accepted (the every-obligation
// rule is a separate follow-up). Cases from
// test/r0-a2-prerequisites-cases.mjs, named after the proposal's table.
const cases = await ownerCases(load);
const { Record, Effect } = cases;

test('the unchanged problems record no defect', () => {
  for (const [name, problem] of Object.entries(cases.problems))
    assert.equal(Record.recordDefect(problem).constructor.name, 'Nothing',
      name);
});

// Every rejected case records two owners at the expected provenance.
test('every rejected case repeats an owner', () => {
  const owner = placed => [Effect.Install, Effect.HandlerLit, Effect.Defer]
    .some(kind => placed.value instanceof kind);
  for (const [name, [problem, provenance]] of Object.entries(cases.rejected))
    assert.equal(problem.effects.obligations.filter(placed => owner(placed)
      && Effect.eqProvenance.eq(placed.provenance)(provenance)).length, 2,
    name);
});

// (a), (b), (d), (e) and (f): check 4 at the first copy's provenance.
// (b) separates identity from value: the copy's handler differs.
// (d) has no companions at all, so the count rests on owners alone.
// (f) is the nearest weaker case, already a companion-count defect.
test('an owner recorded twice is check 4 at its provenance', () => {
  assert.equal(Object.keys(cases.rejected).length, 6);
  assert.deepEqual(ownerMissed(cases), []);
});

// (b)'s copy is unequal to the original, and is recorded after it.
test('the unframed copy differs from the owner in value only', () => {
  const [problem] = cases.rejected['Install beside an unframed copy'];
  const installs = problem.effects.obligations.filter(placed =>
    placed.value instanceof Effect.Install);
  assert.equal(installs.length, 2);
  assert.ok(Effect.eqProvenance.eq(installs[0].provenance)(
    installs[1].provenance));
  assert.ok(!Effect.eqObligation.eq(installs[0].value)(installs[1].value));
});

// (c), (g) and (h): accepted before and after.
test('repeated non-owners and distinct owners are accepted', () => {
  assert.deepEqual(Object.keys(cases.accepted), ['Equal twice',
    'Consume AtCall twice', 'two Installs at two paths',
    'a HandlerLit inside an Install']);
});
