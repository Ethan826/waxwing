import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { c2c, sources, validateCases }
  from './regression-r0-a2-validate.mjs';

// A2 Task 11 (docs/plans/2026-10-31-a2-validator-plan.md): spec §12's
// cases C1, C2, C3, C5, C13, C15 and C16 end to end, through
// `prerequisites` and `judgeObligations` (Effects.Validate) and, where G0
// accepts the package, `validate` (Strategy.Substitution). Each checks
// the recorded obligations against a fixture package; expected check
// indices are read from the obligation's own check, not fixed.
const cases = await validateCases(load);
const { describe, honest, judge, prerequisites, validate, indexOf,
  obligations, labelled, user, closed, role, isFrame, problemOf, M, N, J,
  Effect } = cases;

const kindAt = (problem, kind, nth = 0) => obligations(problem)
  .map((placed, index) => [placed.value.constructor.name, index])
  .filter(([name]) => name === kind)[nth][1];
const roleOf = (problem, result) => {
  const at = result.value0.value1 ?? result.value0.value0;
  return at.provenance.value0.role.constructor.name;
};
// The check index the obligation's own check reports on this package.
const ownCheck = (problem, input, index, check) =>
  check(cases.context(problem, input))(
    obligations(problem)[index].value.value0).value0.check;
const at = (result, problem, index, check) => {
  const found = result.value0.value1 ?? result.value0.value0;
  assert.equal(indexOf(problem, result.value0), index);
  assert.equal(found.check, check);
};
// d, the `defer` item's effect row, holding `effect` at `mark`.
const deferred = (effect, mark) => variable => role(variable) === 'EffectOf'
  ? labelled(user(effect, mark)) : closed;
const frameM = position => isFrame(position) ? M : N;

test('C2(a): a term naming an unknown mark is Malformed', () => {
  const problem = problemOf(sources.c2, 'work');
  const input = honest(problem, { rows: deferred(0, J('z')) });
  assert.equal(describe(prerequisites(problem, input)),
    'Malformed UnknownMark');
  assert.equal(describe(validate(problem, input)), 'Malformed UnknownMark');
});

test('C2(b): Defer before its AtDefer, by recorded order', () => {
  const problem = problemOf(sources.c2, 'work');
  const marked = validate(problem, honest(problem,
    { rows: deferred(0, M) }));
  assert.equal(describe(marked), 'ObligationFailed');
  assert.equal(roleOf(problem, marked), 'DeferRegistration');
  const unmarked = validate(problem, honest(problem,
    { rows: deferred(0, N) }));
  assert.equal(describe(unmarked), 'ObligationFailed');
  assert.equal(roleOf(problem, unmarked), 'DeferInto');
});

test('C2(c): the Defer (2) is reported, not the AtCallback (7)', () => {
  const { problem, input } = c2c(cases);
  const result = validate(problem, input);
  assert.equal(describe(result), 'ObligationFailed');
  assert.equal(roleOf(problem, result), 'DeferRegistration');
  at(result, problem, 2, ownCheck(problem, input, 2,
    cases.Sites.deferCheck));
  // The later AtCallback fails on the same package: it is masked only by
  // recorded order.
  const callback = kindAt(problem, 'Consume', 2);
  assert.equal(callback, 7);
  assert.equal(cases.Consume.consumeCheck(cases.context(problem, input))(
    obligations(problem)[7].value.value0).constructor.name, 'Left');
});

const unsupportedFor = (problem, input, kind, index) => {
  for (const result of [prerequisites(problem, input),
    validate(problem, input)]) {
    assert.equal(describe(result), 'NotCertifiable UnsupportedRecorded');
    assert.equal(result.value0.value0.value0.constructor.name, kind);
    at(result, problem, index, 0);
  }
};

test('C3: Unsupported refuses any package', () => {
  const problem = problemOf(sources.c3, 'g');
  unsupportedFor(problem, honest(problem), 'OperationWithRow', 0);
  // A malformed package too: step 1 precedes I3.
  unsupportedFor(problem, cases.pkg({}), 'OperationWithRow', 0);
});

test('C5: Unsupported before I3, with or without a frame term', () => {
  const problem = problemOf(sources.c5, 'main');
  const index = kindAt(problem, 'Unsupported');
  assert.ok(index > kindAt(problem, 'Install'));
  for (const terms of [() => N, () => M])
    unsupportedFor(problem, honest(problem, { terms }), 'UnframedInstall',
      index);
  unsupportedFor(problem, cases.pkg({ effects: problem.effects.flexEff
    .map(variable => [variable, closed]) }), 'UnframedInstall', index);
});

test('C13 blocked: an image variable installed is UnframedInstall', () => {
  const problem = problemOf(sources.c13, 'use');
  unsupportedFor(problem, honest(problem, { terms: frameM }),
    'UnframedInstall', kindAt(problem, 'Unsupported'));
});

// C1's A: least terms, the frame M, d holding Ask at M.
const c1 = (terms = frameM) => {
  const problem = problemOf(sources.c1, 'use');
  return { problem, input: honest(problem,
    { terms, rows: deferred(1, M) }) };
};
const end = (problem, input) => {
  assert.equal(describe(prerequisites(problem, input)), 'Right');
  return judge(problem, input);
};

test('C1 A: ForcedTail DeferRegistration, through the frame', () => {
  const { problem, input } = c1();
  const result = end(problem, input);
  assert.equal(describe(result), 'NotCertifiable ForcedTail');
  assert.equal(roleOf(problem, result), 'DeferRegistration');
  const defer = kindAt(problem, 'Defer');
  at(result, problem, defer, ownCheck(problem, input, defer,
    cases.Sites.deferCheck));
  assert.equal(describe(validate(problem, input)),
    'NotCertifiable ForcedTail');
});

test('C1 A\': the frame forged to N: ForcedTail Install', () => {
  const { problem, input } = c1(() => N);
  const result = end(problem, input);
  assert.equal(describe(result), 'NotCertifiable ForcedTail');
  assert.equal(roleOf(problem, result), 'InstallSite');
  at(result, problem, 0, ownCheck(problem, input, 0,
    cases.Sites.installCheck));
});

test('C1 B: a forced binding is BindsForced, not an extra key', () => {
  const { problem, input } = c1();
  const [forced] = cases.forcedOf(problem);
  const bound = { ...input, effects: cases.Maps.insert(Effect.ordEVar)(
    forced)(closed)(input.effects) };
  assert.equal(describe(prerequisites(problem, bound)),
    'Malformed BindsForced');
  assert.equal(describe(validate(problem, bound)), 'Malformed BindsForced');
});

// C15: t, s's instance slot, closed (least) or `{ [], e }`, e use2's
// declared rigid.
const c15 = source => {
  const problem = problemOf(sources.c15, 'use2');
  const [rigid] = problem.effects.effectRigids;
  const tail = source === 'rigid' ? cases.rigidTail(rigid) : closed;
  const rows = variable => role(variable) === 'EffInst' ? tail
    : deferred(1, source === 'rigid' ? M : N)(variable);
  return { problem, input: honest(problem, { rows,
    terms: source === 'rigid' ? frameM : () => N }) };
};

test('C15: a rigid forced tail: ForcedTail DeferRegistration', () => {
  const { problem, input } = c15('rigid');
  const result = end(problem, input);
  assert.equal(describe(result), 'NotCertifiable ForcedTail');
  assert.equal(roleOf(problem, result), 'DeferRegistration');
});

test('C15: the least package holds', () => {
  const { problem, input } = c15('least');
  assert.equal(describe(end(problem, input)), 'Right');
  assert.equal(describe(validate(problem, input)), 'Right');
});

test('C16: an unrelated failure is ObligationFailed', () => {
  const problem = problemOf(sources.c16, 'use3');
  const input = honest(problem, { terms: frameM, rows: deferred(0, M) });
  const result = end(problem, input);
  assert.equal(describe(result), 'ObligationFailed');
  assert.equal(roleOf(problem, result), 'DeferRegistration');
  assert.ok(indexOf(problem, result.value0) > kindAt(problem, 'Install'));
});
