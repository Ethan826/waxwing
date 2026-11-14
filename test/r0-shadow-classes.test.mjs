import test from 'node:test';
import assert from 'node:assert/strict';
import { t6Classes, windowClassOf, windowClasses }
  from './r0-shadow-classes.mjs';
import { boundHoleClass } from './r0-rt8-account.mjs';
import { rt8DefectClass } from './r0-shadow-table.mjs';

// Task 4.5: the window classifier with each input injected directly
// (common context: every classifier tested with every case injected).
// Facts are as test/r0-shadow-run.mjs builds them: RT8's class, today's
// diagnostic (`null` when today compiles), R0's verdict and online
// attempt, the static refusals, the erased-row detector's sources and
// `g0Guard`'s reasons.
const facts = (rt8, more = {}) => ({ at: 'p.wxw#f', rt8, today: null,
  r0: { verdict: 'Solved', attempt: 'Accepted' }, staticRefusals: [],
  erased: [], guard: [], ...more });
const refused = { code: 'E_TYPE', text: 'Expected Int, found Bool' };
const noCandidate = (verdict, more = {}) => facts(
  'agree: no candidate (Exhausted)', { today: refused,
    r0: { verdict, attempt: 'Searched Exhausted' }, ...more });

const cases = [
  ['agree, no row', facts('agree: Solved'), null],
  ['erased row', facts('agree: Solved', { erased: ['own'] }),
    'erased row: compiles today, census detector fires'],
  ['bound hole', facts(boundHoleClass), boundHoleClass],
  ['bound hole with an erased row', facts(boundHoleClass,
    { erased: ['perform'] }),
  'erased row: compiles today, census detector fires'],
  ['rigid decline', facts('(b) declined by g0Guard', { guard: ['rigid'] }),
    'BQ at a rigid variable: online declines'],
  ['fragment decline', facts('(b) declined by g0Guard',
    { guard: ['fragment'] }),
  'outside the unitary fragment: online declines'],
  ['RequirementOpen', facts('(a) RequirementOpen'),
    'RequirementOpen: compiles today'],
  ['Heuristic', facts('ambiguous several-tail read-back (Heuristic)'),
    'ambiguous several-tail read-back (Heuristic)'],
  ['open atom', facts('(a) blocked: Unresolved Unsupported'
    + ' RequirementAtoms'), 'BQ pending G-ValidR: compiles today'],
  ['markers', facts('(a) blocked: Unresolved Unsupported Outside'
    + ' HandlerType, Outside Deferred'),
  'markers: compiles today, R0 Unsupported Outside'],
  ['static refusal, no row', facts('agree: no candidate (Exhausted)',
    { today: { code: 'E_ARITY', text: 'Wrong number of arguments' },
      staticRefusals: ['StaticRule StaticArity'] }), null],
  ['refused, markers', noCandidate('Unresolved Unsupported Outside'
    + ' DataApplication'), 'today refuses, R0 Unsupported Outside'],
  ['refused, open atom', noCandidate('Unresolved Unsupported'
    + ' RequirementAtoms'), 'today refuses, BQ pending G-ValidR'],
  ['refused, no candidate', noCandidate('Unresolved Inference NoCandidate'),
    'today\'s refusal becomes Unresolved (no candidate)'],
  // Scope A (dossier §18.200): h5-type-depth#deepest's shape.
  ['refused, a limit', noCandidate('Unresolved Limit InferredTypeDepth@body'),
    'today refuses, R0 Limit'],
  ['refused, out of budget', facts('agree: no candidate (OutOfBudget)', {
    today: refused, r0: { verdict: 'Unresolved Inference NoCandidate',
      attempt: 'Searched OutOfBudget' } }),
  'today\'s refusal becomes Unresolved (no candidate)'],
  ['D6', noCandidate('Unresolved Inference NoCandidate', { at:
    'research/division-campaign/r0/probes/c01-h-label.wxw#route' }),
  'false contradiction (D6) becomes Unresolved'],
  ['refused, rigid decline', facts('(b) declined by g0Guard, today'
    + ' refuses', { today: refused, guard: ['rigid'] }),
  'today refuses, BQ at a rigid variable: online declines'],
  ['refused, fragment decline', facts('(b) declined by g0Guard, today'
    + ' refuses', { today: refused, guard: ['fragment'] }),
  'today refuses, outside the unitary fragment: online declines'],
  ['known-valid, no candidate', noCandidate('Unresolved Inference'
    + ' NoCandidate', { at:
    'research/composition-assessment/programs/p4.wxw#main' }),
  'known-valid program; current solver cannot decide'],
  // Injected: no listed known-valid program is declined on the corpus.
  ['known-valid, declined', facts('(b) declined by g0Guard, today'
    + ' refuses', { today: refused, guard: ['fragment'], at:
    'research/composition-assessment/programs/p4.wxw#main' }),
  'known-valid program; current solver cannot decide'],
  ['defect', facts('today\'s own internal failure (SearchBroke)', { at:
    'test/fixtures/r0/audit/fx010-record-payload.pinned.json#k',
  today: refused }), 'defect'],
  // T6 (§18.161 (4)): an RT8 defect is reported as its own class; a
  // check's decline has its own class either way.
  ['an RT8 defect', facts('DEFECT: candidate refused, Unsatisfied'),
    rt8DefectClass],
  ['check decline', facts('declined by the check, a limitation'
    + ' (NotCertifiable): Unresolved Unsupported EffectLimit ForcedTail'),
  'the check declines the candidate (a limitation): compiles today'],
  ['read-fault decline', facts('declined by the check, a read fault'
    + ' (PackageUnread): Unresolved Unsupported EffectsUnread'),
  'the check declines the candidate (a read fault): compiles today'],
  ['refused, check decline', facts('declined by the check, a limitation'
    + ' (NotCertifiable), today refuses', { today: refused }),
  'today refuses, the check declines the candidate (a limitation)'],
  ['refused, read-fault decline', facts('declined by the check, a read'
    + ' fault (PackageUnread), today refuses', { today: refused }),
  'today refuses, the check declines the candidate (a read fault)'],
  ['refused, open requirement', facts('declined by the check, an open'
    + ' requirement (RequirementOpen), today refuses', { today: refused }),
  'today refuses, the check declines the candidate (an open requirement)']
];

test('each window class is assigned on its injected facts', () => {
  for (const [name, input, expected] of cases)
    assert.equal(windowClassOf(input), expected, name);
  const assigned = new Set(cases.map(found => found[2]));
  for (const name of [...Object.keys(windowClasses),
    ...Object.keys(t6Classes)])
    assert.ok(assigned.has(name), `no case for ${name}`);
});

// No catch-all: an input no case names throws rather than becoming a
// class.
const unknown = [
  ['a check decline with no verdict', facts('declined by the check,'
    + ' a limitation (NotCertifiable)')],
  // Fix round 1: the old unkinded form, and a kind not compiling.
  ['an unkinded check decline', facts('declined by the check'
    + ' (NotCertifiable): Unresolved Unsupported EffectLimit ForcedTail')],
  ['an open requirement where today compiles', facts('declined by the'
    + ' check, an open requirement (RequirementOpen): Solved')],
  ['SearchBroke outside the defect list', facts('today\'s own internal'
    + ' failure (SearchBroke)', { today: refused })],
  ['an unknown compiling class', facts('(a) blocked: Unresolved Limit')],
  ['a block mixing kinds and atoms', facts('(a) blocked: Unresolved'
    + ' Unsupported Outside Deferred, RequirementAtoms')],
  ['a decline with no reason', facts('(b) declined by g0Guard')],
  ['a decline with two reasons', facts('(b) declined by g0Guard',
    { guard: ['fragment', 'rigid'] })],
  ['a static refusal under another code', facts('agree: no candidate'
    + ' (Exhausted)', { today: refused,
    staticRefusals: ['StaticRule StaticArity'] })],
  ['an unmapped static code', facts('agree: no candidate (Exhausted)', {
    today: { code: 'E_ARITY', text: '' },
    staticRefusals: ['StaticRule StaticEntry'] })],
  ['no candidate, an unexpected verdict', noCandidate('Solved')],
  ['an unknown refused class', facts('agree: Solved', { today: refused })]
];

test('anything else throws', () => {
  for (const [name, input] of unknown)
    assert.throws(() => windowClassOf(input), /r0-shadow-classes/, name);
});

// The author's ruling R-b1: no refusal today gets Contradiction as its
// target by default; R-b2: strategy limitations stay (b); every label
// says where it comes from.
test('no class of today\'s refusals targets Contradiction', () => {
  for (const [name, found] of Object.entries({ ...windowClasses,
    ...t6Classes })) {
    assert.doesNotMatch(found.target, /^Contradiction/, name);
    assert.equal(found.sectionReading,
      found.sectionSource.startsWith('reading'), name);
  }
  for (const name of ['false contradiction (D6) becomes Unresolved',
    'known-valid program; current solver cannot decide',
    'today\'s refusal becomes Unresolved (no candidate)'])
    assert.equal(windowClasses[name].section, '§3.2(b)', name);
  assert.equal(windowClasses[boundHoleClass].section,
    '§3.2(a), pending policy');
});

