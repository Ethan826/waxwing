import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';

// Task 4.3, acceptance criterion 1 (the author, 2026-10-23): the shadow
// run's assembly of `Checking` (Features.Check.Decide.Shadow) supplies
// §3.2(a)'s production detector, and no strategy can choose another.
// G0's check passes over open atoms, so its `Valid` is sound only where
// `decide` blocks Solved on them through that detector.
const online = await onlineFrom(load);
const stubs = await stubsFrom(load);
const Open = await load('Features.Check.Decide.Open');
const Decide = await load('Features.Check.Decide');
const Rules = await load('Features.Check.Refute.Rules');
const Atom = await load('Domain.Recorded.Atom');
const { Shadow } = online;

// `main`'s Sig10 atom `pr Fn` at a declared type holding a function:
// open until G-ValidR. Today accepts it (printing `main`'s result).
const boxed = 'type Fn = Fn(Int -> Int);\n'
  + 'fn main(): Fn = Fn(fn(n: Int) => n);\n';
const program = online.programOf(boxed);
const problem = online.problemOf(program, 'main');
const assembled = () =>
  Shadow.shadowChecking(online.legacyText)(budget)(program);
const decided = checking => describe(Decide.decide(checking)(problem));
// Task 5.2: the assembly's one shadow refuter, CX, adds its record last
// and changes nothing else (AT17).
const blocked = { verdict: 'Unresolved Unsupported RequirementAtoms',
  attempts: ['Accepted', 'Shadow Left'], searchFaults: [] };

test('the shadow assembly supplies the production detector', () => {
  assert.equal(online.todayOf(program, 'main').constructor.name, 'Right');
  assert.equal(Open.openRequirements(problem).length, 1);
  const checking = assembled();
  assert.equal(checking.openRequirements, Open.openRequirements);
  assert.equal(checking.ends, Decide.untilVerdict);
  assert.equal(checking.rules, Rules.registry);
  assert.deepEqual(checking.refuters, []);
  assert.deepEqual(checking.shadows.map(shadow => [shadow.awaits,
    shadow.spec.name]), [['CX-KP + CX-PR', 'CX']]);
  assert.equal(checking.strategies.length, 1);
  // G0 accepts the online candidate (it passes over the open atom), so
  // only the detector keeps Solved off.
  assert.deepEqual(decided(checking), blocked);
  assert.deepEqual(describe(online.decisionOf(program, 'main')), blocked);
});

test('a substituted detector would give Solved, which the above refuses',
  () => {
    const wrong = { ...assembled(), openRequirements: () => [] };
    assert.equal(decided(wrong).verdict, 'Solved');
    assert.notDeepEqual(decided(wrong), blocked);
  });

test('no strategy chooses the detector', () => {
  // The assembly takes a renderer, a budget and a program only; a
  // strategy is a function of (Budget, RecordedProblem), so even one
  // whose check accepts everything is blocked by the assembled detector.
  assert.equal(Shadow.shadowChecking.length, 1);
  assert.equal(Shadow.shadowChecking(online.legacyText).length, 1);
  assert.equal(Shadow.shadowChecking(online.legacyText)(budget).length, 1);
  const checking = assembled();
  const hostile = { ...checking, strategies: [stubs.behaviours.accepting()
    .strategy, ...checking.strategies] };
  assert.deepEqual(decided(hostile), { verdict: blocked.verdict,
    attempts: ['Accepted', 'Accepted', 'Shadow Left'], searchFaults: [] });
});

// Criterion 5, the comparison carry (Task 4.2 findings item 8): a
// requirement atom at a flexible variable today's solver leaves open.
// The online search binds the hole as today's lowering does (ReadBack
// step 4), so G0's `RequirementUnjudged` backstop is not reached.
const free = 'fn f(): Int = { let g = fn(y) => show(y); 0 };\n'
  + 'fn main(): Int = 0;\n';

test('the search binds a hole under pr, so no RequirementUnjudged', () => {
  const freeProgram = online.programOf(free);
  const freeProblem = online.problemOf(freeProgram, 'f');
  assert.deepEqual(describe(online.decisionOf(freeProgram, 'f')), {
    verdict: 'Solved', attempts: ['Accepted', 'Shadow Left'],
    searchFaults: [] });
  const found = online.search(freeProgram, freeProblem);
  const y = freeProblem.bq[0].value.value0.value0;
  assert.deepEqual(online.sigmaOf(found.value0.substitution).find(
    ([variable]) => variable.fresh?.role?.param === 0)[1], { base: 'Int' });
  // Left unbound, the same candidate meets the backstop.
  const unbound = online.Map.delete(Atom.ordVar)(y)(found.value0
    .substitution);
  const refused = online.check(freeProblem, unbound);
  assert.equal(refused.value0.constructor.name, 'RequirementUnjudged');
});

// f02 (`cmp α` at a flexible `α`): today's `comparable` refuses the
// hole (AmbiguousType) before any read-back, so the online search has no
// candidate for G0's check to meet at the backstop.
test('cmp at an ambiguous variable ends the search, no backstop', () => {
  const f02 = readFileSync(
    'research/division-campaign/r0/probes/f02-compare-ambiguous.wxw', 'utf8');
  const found = describe(online.decisionOf(online.programOf(f02), 'main'));
  assert.deepEqual(found, { verdict: 'Unresolved Inference NoCandidate',
    attempts: ['Searched Exhausted', 'Shadow Left'], searchFaults: [] });
});
