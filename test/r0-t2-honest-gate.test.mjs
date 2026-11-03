import test from 'node:test';
import assert from 'node:assert/strict';
import { admission, gateCases } from './r0-t2-honest-gate-cases.mjs';
import { forcedTail, unjudged } from './r0-t2-honest-gate.mjs';

// Tranche 2 Task 13's gate on synthetic rows (fixture-level): the
// must-fail probes (a planted extra refusal, a removed pinned entry, a
// count one below the floor) and ruling §18.155 (7)'s admission, which
// refuses a Malformed, a read fault outside (a), an unexpected refusal
// and a fourth RequirementUnjudged. §18.157: the ForcedTail list admits
// exactly the four named refusals certify accepts (a fifth, one
// missing, one in another class, one certify refuses all fail), and
// the re-pin rule refuses a lower floor or candidate count, and a
// dropped denominator, whatever `--explain` says.
// test/r0-t2-honest.serial.test.mjs runs the gate's probes on the
// corpus.
const cases = gateCases();
const forced = 'NotCertifiable ForcedTail';
const lowered = (key, from, to) => `d: ${key} ${from} to ${to} refused; `
  + 'a lower floor or candidate count needs the author\'s ruling, '
  + 'not --explain';

test('the gate holds on its own observation', () => {
  assert.deepEqual(cases.holds(), []);
});

test('a planted extra refusal fails the gate', () => {
  assert.match(cases.extraRefusal().join('\n'), /refusal not pinned/);
});

test('a removed pinned entry fails the gate', () => {
  assert.deepEqual(cases.removedEntry(),
    [`refusal pinned, not observed: ${unjudged[0]} `
      + 'RequirementUnjudged {"decl":0}']);
});

test('a validated count one below the floor fails the gate', () => {
  assert.match(cases.belowFloor().join('\n'), /below the floor/);
});

test('a certify-accepted declaration refused and unpinned fails', () => {
  assert.match(cases.acceptedRefused().join('\n'),
    /certify accepts, not validated nor pinned/);
});

test('ruling (7) admits the identified lists only', () => {
  assert.deepEqual(cases.admitted(), []);
  assert.match(cases.malformed().join('\n'), /^Malformed: /m);
  assert.match(cases.extraFault().join('\n'), /read fault not approved/);
  assert.match(cases.missingFault().join('\n'),
    /approved read fault not observed/);
  assert.deepEqual(cases.otherRefusal(), ['unexpected validator '
    + `refusal: ${unjudged[2]} ObligationFailed {} (certify: accepted)`]);
  assert.match(cases.differentG0().join('\n'),
    /unexpected validator refusal/);
  assert.match(cases.fourUnjudged().join('\n'), /4 refusals, more than 3/);
});

test('list (b) holds the three named declarations only', () => {
  assert.deepEqual(cases.vanishedRefusal(),
    [`approved refusal not observed: ${unjudged[1]}`]);
  assert.deepEqual(cases.explainedVanish(), []);
  assert.deepEqual(cases.newRefusal(), ['unexpected validator refusal: '
    + 'v.wxw#a RequirementUnjudged {"decl":0} (certify: '
    + 'RequirementUnjudged {"decl":0})']);
});

// §18.157: exactly the four named ForcedTail refusals, recorded apart
// from list (b).
test('the four admitted ForcedTail refusals, no other', () => {
  const at = `${forced} {"at":0}`;
  assert.deepEqual(cases.fifthForced(), [`ForcedTail not pinned: `
    + `v.wxw#c ${at}`, 'validated 2 below the floor 3',
    'certify accepts, not validated nor pinned: v.wxw#c']);
  assert.deepEqual(cases.fifthAdmitted(), ['ForcedTail not admitted: '
    + `v.wxw#c ${at} (certify: accepted)`]);
  assert.deepEqual(cases.forcedMissing(), ['ForcedTail pinned, not '
    + `observed: ${forcedTail[1]} ${at}`]);
  assert.deepEqual(cases.forcedMissingAdmitted(),
    [`approved refusal not observed: ${forcedTail[1]}`]);
  assert.deepEqual(cases.forcedChanged(), [`refusal not pinned: `
    + `${forcedTail[2]} ObligationFailed {}`, 'ForcedTail pinned, not '
    + `observed: ${forcedTail[2]} ${at}`]);
  assert.match(cases.forcedCertifyRefuses().join('\n'),
    /^ForcedTail not admitted: .*\(certify: RequirementUnjudged/);
  assert.deepEqual(cases.forcedSuffix(), ['unexpected validator refusal: '
    + `${forcedTail[0]} NotCertifiable ForcedTailX {"at":0} (certify: `
    + 'accepted)', '4 refusals, more than 3']);
});

test('a declaration met twice fails the gate and admission', () => {
  assert.deepEqual(cases.repeatedAt(), ['declaration repeated: v.wxw#b']);
  assert.deepEqual(cases.repeatedAdmitted(),
    ['declaration repeated: v.wxw#b']);
});

test('the re-pin rule refuses what it must and keeps explanations',
  () => {
    assert.deepEqual(cases.repinHolds(), []);
    assert.deepEqual(cases.withoutRepin(), ['a pin exists: --repin']);
    assert.deepEqual(cases.repinVanish(),
      [`needs --explain: d: vanished ${unjudged[1]}`]);
    assert.deepEqual(cases.repinLowered(), [lowered('floor', 3, 2)]);
    assert.deepEqual(cases.repinMissing(),
      ['the old pin has no denominator d']);
    assert.deepEqual(cases.repinDropped(),
      ['the new pin drops denominator d']);
    assert.deepEqual(cases.repinDroppedExplained(),
      ['the new pin drops denominator d']);
    assert.deepEqual(cases.repinKeeps(), [
      { explanation: 'earlier', covers: [] },
      { explanation: 'why', covers: [`d: vanished ${unjudged[1]}`] }]);
  });

// §18.157: `--explain` documents a change; it never permits a lower
// floor or candidate count.
test('an explanation does not permit a lower floor or count', () => {
  assert.deepEqual(cases.explainedFloor(), [lowered('floor', 3, 2)]);
  assert.deepEqual(cases.explainedCandidates(),
    [lowered('candidates', 22, 21)]);
  assert.deepEqual(cases.explainedEqual(), []);
  assert.deepEqual(cases.explainedHigher(), []);
});

test('admission is the function the pin script calls', () => {
  assert.equal(typeof admission, 'function');
});
