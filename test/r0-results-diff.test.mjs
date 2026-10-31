import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateMoves, compareResults, declarationMoves }
  from '../scripts/r0-results-diff.mjs';

// The census/window/RT8 comparison tool (scripts/r0-results-diff.mjs):
// it must stand out a status change, list a reason-only move, and be
// silent on identical sets.
const row = (verdict, extra = {}) => ({
  today: 'compiles', r0: { verdict, attempt: 'Accepted' },
  rt8: 'agree', window: null, blockers: [], compiles: true,
  categories: [], ...extra
});
const solved = row('Solved');
const blocked = row('Unresolved Unsupported Outside HandlerType',
  { window: '(a) blocked: Unresolved Unsupported Outside HandlerType',
    blockers: ['HandlerType'] });
const sets = declarations => ({ census: { a: 1 }, window: { b: [] },
  rt8: { c: 2 }, declarations });

test('identical result sets have no move and exit status 0', () => {
  const same = sets({ 'x#f': solved, 'x#g': blocked });
  assert.equal(compareResults(same, structuredClone(same)).status, 0);
});

test('a Solved status change is a STOP row, either direction', () => {
  for (const [from, to] of [[solved, blocked], [blocked, solved]]) {
    const moves = declarationMoves({ 'x#f': from }, { 'x#f': to });
    assert.equal(moves.length, 1);
    assert.equal(moves[0].stop, true);
    assert.ok(moves[0].changes.some(line => line.startsWith('status:')));
  }
});

test('a window class moving into or out of blocked is a STOP row', () => {
  const other = { ...blocked, window: 'defect' };
  assert.equal(declarationMoves({ 'x#f': blocked }, { 'x#f': other })[0]
    .stop, true);
});

test('a reason-only move is listed but not a STOP row', () => {
  const wider = row('Unresolved Unsupported Outside HandlerType, '
    + 'EffectsUnchecked [UnframedInstall]',
    { window: blocked.window, blockers: blocked.blockers });
  const result = compareResults(sets({ 'x#f': blocked }),
    sets({ 'x#f': wider }));
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].stop, false);
  assert.equal(result.status, 2);
});

test('an added or removed row is a STOP row', () => {
  assert.equal(declarationMoves({}, { 'x#f': solved })[0].stop, true);
  assert.equal(declarationMoves({ 'x#f': solved }, {})[0].stop, true);
});

test('aggregate counts and arrays report their movement', () => {
  assert.deepEqual(aggregateMoves({ n: 1, l: ['a'] }, { n: 2, l: ['a'] },
    'p'), ['p/n: 1 -> 2']);
  assert.equal(aggregateMoves({ l: ['a'] }, { l: ['b'] }, 'p').length, 1);
  assert.deepEqual(aggregateMoves({ n: 1 }, { n: 1 }), []);
});

test('an aggregate-only move gives exit status 2', () => {
  const before = sets({ 'x#f': solved });
  const after = { ...structuredClone(before), census: { a: 2 } };
  assert.equal(compareResults(before, after).status, 2);
});
