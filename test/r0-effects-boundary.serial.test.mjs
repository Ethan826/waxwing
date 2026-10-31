import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortOf, gated, sourceKinds, survey }
  from './r0-effects-boundary-run.mjs';
import { assertCohort } from './r0-fail-only-compare.mjs';
import { obligationKinds } from './r0-effects-obligations-run.mjs';

// R0 amin tranche 1, Task 5 (Checkpoint A): the blocking boundary. No
// effect checker exists yet, so a handler declaration must never be
// certified: generation emits `Outside HandlerType` (and `Outside
// FailFamily` for `handle`/`fail`), which keeps rule 1 blocking. A
// declaration is in scope when a marked type in its recorded effects
// holds an `MHandler`, or its `outside` list names HandlerType or
// FailFamily. Each in-scope declaration's shadow verdict is not Solved
// and its `outside` holds HandlerType (FailFamily alone only where no
// handler type is recorded). Task 12 extends this to obligations.
// Task 17: the expected cases are also derived from resolved source,
// independently of generation: a generic walk of each resolved
// declaration counts handler literals, `with`, `handle`, `fail` and
// written handler types. A literal, `with` or written handler type needs
// a recorded MHandler and `HandlerType`; only `handle`/`fail` may use
// `FailFamily`; a source case with neither is a breach.
// Corpus-wide (every program decided), hence serial.
// About 80% of the 276 observed.
const minimum = 220;
// About 80% of the 235 observed.
const handlerFloor = 188;
const siteFloor = 1;

const found = await survey();

// Scope amendment (dossier section 18.102, by the author): `fail` alone
// performs the Fail effect and is not a handler construct (Failure.purs,
// E23: a written family that translates is not marked), so a `fail`-only
// declaration need not acquire a new blocker to satisfy this test. Its
// existing verdicts are preserved and pinned in
// test/fixtures/r0/effects-fail-only.json (a new author-ordered pin; this
// test only compares, whatever the environment: regenerate only on the
// author's word, with node scripts/r0-fail-only-pin.mjs). This grants NO
// assurance that those declarations' effects were independently
// validated. `fail` plus another construct is judged by that construct. A
// literal or `with` records a node type, so it needs MHandler; a handler
// type written only in the declaration's own signature is recorded in
// `effects.signature` (Task 19, R032), so it needs an MHandler there (a
// representation check), HandlerType and not Solved. `handle` alone may
// use FailFamily instead of HandlerType.
const recorded = source => ['literal', 'with'].some(k => source.includes(k));
const typed = source => ['literal', 'with', 'type']
  .some(kind => source.includes(kind));
const sourceBreaches = ({ at, kinds, source, solved, handler, signed,
  recordedSignature }) => {
  if (!gated(source)) return [];
  const marked = kinds.includes('HandlerType')
    || (!typed(source) && kinds.includes('FailFamily'));
  const where = `${at} (constructs: ${source.join(', ')}; outside: `
    + `${kinds.join(', ')}; MHandler recorded: ${handler})`;
  return [...(solved ? [`${where}: Solved`] : []),
    ...(recorded(source) && !handler ? [`${where}: no MHandler`] : []),
    ...(signed && !recordedSignature ? [`${where}: no signature MHandler`]
      : []),
    ...(marked ? [] : [`${where}: no marker`])];
};

// About 80% of the observed counts (279 in all; literal 201, with 187,
// handle 70, fail 91, type 79; signature-only 17); printed on every run.
const sourceFloors = { all: 223, literal: 160, with: 150, handle: 56,
  fail: 73, type: 63 };
const signatureFloor = 13;
const signedFloor = 44;

const refusals = ({ at, kinds, solved, handler }) => {
  const marked = kinds.includes('HandlerType')
    || (!handler && kinds.includes('FailFamily'));
  return [...(solved ? [`${at}: Solved`] : []),
    ...(marked ? [] : [`${at}: no HandlerType marker (outside: `
      + `${kinds.join(', ')}; MHandler recorded: ${handler})`])];
};

test('no handler declaration is Solved and each is marked', () => {
  console.log(`effects boundary: ${found.scoped.length} in-scope of `
    + `${found.facts.length} declarations`);
  assert.deepEqual(found.refused.slice(0, 10), [],
    `${found.refused.length} declarations refused by generation`);
  const holding = found.facts.filter(fact => fact.handler);
  const through = site => holding.filter(fact => fact.sites[site]).length;
  console.log(`MHandler recorded in ${holding.length} declarations: `
    + `${through('nodes')} nodes, ${through('instances')} instances, `
    + `${through('annotations')} annotations`);
  assert.ok(holding.length > handlerFloor,
    `only ${holding.length} declarations record an MHandler`);
  for (const site of ['instances', 'annotations'])
    assert.ok(through(site) >= siteFloor, `no MHandler through ${site}`);
  assert.ok(found.scoped.length > minimum,
    `only ${found.scoped.length} in-scope declarations`);
  const failures = found.scoped.flatMap(refusals);
  assert.deepEqual(failures.slice(0, 10), [],
    `${failures.length} breaches`);
});

test('every handler construct in resolved source is blocked', () => {
  const cases = found.facts.filter(fact => fact.source.length > 0);
  const count = kind => cases.filter(f => f.source.includes(kind)).length;
  console.log(`source-derived: ${cases.length} declarations; `
    + sourceKinds.map(kind => `${kind} ${count(kind)}`).join(', '));
  assert.ok(cases.length >= sourceFloors.all,
    `only ${cases.length} source-derived declarations`);
  for (const kind of sourceKinds)
    assert.ok(count(kind) >= sourceFloors[kind],
      `only ${count(kind)} declarations hold a ${kind} construct`);
  const failOnly = cases.filter(fact => !gated(fact.source));
  const signatureOnly = cases.filter(fact => gated(fact.source)
    && !recorded(fact.source) && fact.source.includes('type'));
  const signed = cases.filter(fact => fact.signed);
  console.log(`handler type in the signature: ${signed.length}, of which `
    + `${signed.filter(fact => fact.recordedSignature).length} record it`);
  assert.ok(signed.length >= signedFloor,
    `only ${signed.length} declarations write a handler type in a signature`);
  console.log(`fail-only (pinned): ${failOnly.length}, of which `
    + `${failOnly.filter(fact => fact.solved).length} Solved; `
    + `signature-only handler type: ${signatureOnly.length}`);
  assertCohort(cohortOf(cases));
  assert.ok(signatureOnly.length >= signatureFloor,
    `only ${signatureOnly.length} signature-only handler types`);
  const breaches = cases.flatMap(sourceBreaches);
  assert.deepEqual(breaches.slice(0, 10), [],
    `${breaches.length} source-derived breaches`);
});

test('the harness can return Solved outside the boundary', () => {
  const solved = found.facts.filter(fact => fact.solved
    && !found.scoped.includes(fact));
  assert.ok(solved.length > 0, 'no declaration is Solved at all');
});

// Task 12: the boundary extended to recorded obligations (§18.124
// corrects this comment). Every obligation kind is recorded now (Tasks
// 7, 8 and 10: Equal, Consume, Defer, Entry, FailConcrete, Unsupported;
// Task 9: HandlerLit and Install), so the HandlerLit/Install check below
// ranges over the declarations that record them (225 when Task 9
// landed), with a floor so it cannot become vacuous again unnoticed;
// the test prints its range. The last assertion, that
// an in-scope declaration with recorded obligations is still not Solved
// and still marked, is implied by Task 5's check over all in-scope
// declarations (above); it adds no new reach. What is new is the join:
// every corpus declaration has an obligation record to be read. Floor:
// 80% of the 276 observed when the floor was set.
// Plan Task 12 Step 3 (Task 5's restored-defect proof against this
// extended test), run by hand in an isolated scratch copy outside the
// repository (deleted after; §18.124): Node.purs `markersAt` made to
// emit nothing for `HandlerMark`. Observed: 3 of the 4 tests in this
// file fail, this one among them ("17 breaches among obliged handler
// declarations", each "Solved" and "no HandlerType marker"). A
// registered row would need this 2-minute corpus test as its probe.
const obligedFloor = 220;
const handlerKinds = ['HandlerLit', 'Install'];
// About 80% of the 225 observed when Task 9 landed.
const literalFloor = 180;

test('recorded obligations never make a handler declaration Solved',
  async () => {
    const kinds = await obligationKinds();
    const recordedAt = fact => kinds.get(fact.at) ?? [];
    const unjoined = found.facts.filter(fact => !kinds.has(fact.at));
    assert.deepEqual(unjoined.map(fact => fact.at).slice(0, 10), [],
      `${unjoined.length} declarations have no obligation record`);
    const tally = {};
    for (const fact of found.facts)
      for (const kind of recordedAt(fact))
        tally[kind] = (tally[kind] ?? 0) + 1;
    const literal = found.facts.filter(fact =>
      recordedAt(fact).some(kind => handlerKinds.includes(kind)));
    const obliged = found.scoped.filter(fact => recordedAt(fact).length > 0);
    console.log(`obligations recorded (all declarations): `
      + `${JSON.stringify(tally)}`);
    console.log(`HandlerLit/Install declarations: ${literal.length}; `
      + `in-scope declarations with any recorded `
      + `obligation: ${obliged.length} of ${found.scoped.length}`);
    assert.ok(literal.length > literalFloor,
      `only ${literal.length} HandlerLit/Install declarations`);
    const breaches = literal.flatMap(fact => [
      ...(fact.solved ? [`${fact.at}: Solved`] : []),
      ...(fact.kinds.includes('HandlerType') ? []
        : [`${fact.at}: no HandlerType marker`])]);
    assert.deepEqual(breaches.slice(0, 10), [],
      `${breaches.length} HandlerLit/Install breaches`);
    assert.ok(obliged.length > obligedFloor,
      `only ${obliged.length} in-scope declarations record obligations`);
    const failures = obliged.flatMap(refusals);
    assert.deepEqual(failures.slice(0, 10), [],
      `${failures.length} breaches among obliged handler declarations`);
  });
