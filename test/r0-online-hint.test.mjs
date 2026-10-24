import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

// Task 4.5 fix round 1 (the author's ruling R-b3; plan Task 4.5 Step 2,
// "with the old text as a hint"): when today's solver refuses, the
// online search's `NoCandidate` carries today's text and place as an
// untrusted search hint, worded as the legacy solver's reason for
// stopping, never as evidence of a contradiction. The text comes from
// the renderer the shadow assembly is given (Format.Diagnostic here),
// so no Features module renders.
const online = await onlineFrom(load);
const a01 = readFileSync(
  'research/division-campaign/r0/probes/a01-clash-ground.wxw', 'utf8');

test('a no-candidate hint is today\'s text and place, untrusted', () => {
  const program = online.programOf(a01);
  const decision = online.decisionOf(program, 'f').value0;
  assert.equal(decision.verdict.constructor.name, 'Unresolved');
  assert.deepEqual(decision.verdict.value0.hints.map(hint => hint.value0), [
    'untrusted search hint: the legacy solver stopped at 1:15, reporting'
      + ' "Expected Int, found Bool" (its reason for stopping, never'
      + ' evidence of a contradiction)']);
});
