import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { sources } from './regression-r0-a2-validate.mjs';
import { propertiesOf, same } from './regression-r0-a2-props.mjs';

// A2 Task 15 (docs/plans/2026-10-31-a2-validator-plan.md): spec §11's
// owed property checks over the case packages of spec §12
// (test/regression-r0-a2-props.mjs `casePackages`), so each result is
// fixture-level: it holds on the packages listed there, not on every
// package. The counts each test reports are its evidence. Already pinned
// elsewhere, not repeated: erase∘settle (test/r0-a2-erase.test.mjs),
// erase against recordedWith (test/r0-a2-erase-corpus.serial.test.mjs),
// the orders differing on an absent variable (test/r0-a2-complete.test.mjs
// "C6 order separates") and G0's input (test/r0-a2-validate.test.mjs).
const properties = await propertiesOf(load);
const { cases, completedOf, accepts, casePackages, holed } = properties;
const { P, Effect, Maps, Package, Complete, Witness, Hole, pkg, problemOf,
  closed, user, labelled, role, M, N } = cases;

test('complete/settle order: equal on F (C1, C15)', t => {
  const hole = n => new P.PVar(Hole.holeVar(n));
  const images = [closed, cases.holeTail(5), cases.rigidTail(0),
    labelled({ ...user(1, M), args: [hole(6)] }),
    { ...labelled(user(0, N)), tail: cases.holeTail(7).tail }];
  let compared = 0;
  for (const [source, name] of [['c1', 'use'], ['c15', 'use2']]) {
    const problem = problemOf(sources[source], name);
    for (const { forced, source: from } of
      cases.Forced.forcedTails(problem))
      for (const image of images) {
        const input = pkg({ effects: [[from, image]] });
        const lookup = completed => Maps.lookup(Effect.ordEVar)(forced)(
          completed.effects);
        const early = lookup(Complete.settledOf(completedOf(problem, input)));
        const late = lookup(P.completedPackage(completedOf(problem,
          Package.settle(input))));
        assert.equal(early.constructor.name, 'Just');
        assert.ok(same(early, late), `${source} image ${compared}`);
        compared += 1;
      }
  }
  t.diagnostic(`fixture-level: ${compared} forced images compared`);
  assert.equal(compared, 10);
});

test('G0 monotonicity on fixtures', t => {
  const found = properties.g0Tally();
  t.diagnostic(`fixture-level: ${found.packages} packages (the`
    + ` ${casePackages.length} case packages and each less one bound`
    + ' variable): G0 accepts'
    + ` both ${found.both} (${found.absent.length} with a variable absent:`
    + ` ${found.absent.join('; ')}), only erase P_c`
    + ` ${found.completedOnly.length}`
    + ` (${found.completedOnly.join('; ')}), neither ${found.neither}`);
  assert.deepEqual(found.violations, []);
  // A package G0 accepts with a variable left flexible is the case the
  // property is about; elsewhere P_c's types are settle P_in's.
  assert.ok(found.absent.length > 0 && found.completedOnly.length > 0);
});

test('C7(b): G0 accepts; the witness is NoWitness HoleContract', () => {
  const { problem, input } = holed();
  assert.ok(accepts(problem, Package.erase(Package.settle(input))));
  const witness = Complete.witnessOf(problem)(completedOf(problem, input));
  const covered = Witness.coverage(Witness.flexDomain(problem))(problem)(
    witness);
  assert.equal(covered.constructor.name, 'Left');
  assert.equal(covered.value0.constructor.name, 'HoleContract');
  assert.equal(role(covered.value0.value0), 'Param');
});

test('Dep completeness: a node outside mentions and Dep moves nothing', t => {
  const found = properties.depTally();
  t.diagnostic(`fixture-level: ${found.distinct.size} (problem, obligation,`
    + ` node) triples, ${found.triples} with packages, ${found.runs} runs`
    + ` (${found.wellFormed} pass prerequisites); ${found.failing}`
    + ' obligations failing before perturbation');
  assert.deepEqual(found.changed.slice(0, 10), []);
  assert.ok(found.distinct.size > 0 && found.failing > 0);
  assert.ok(found.wellFormed > 0);
});
