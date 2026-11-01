import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { c1, famw, recordCases, referenceMutants, siteOf, siteTable }
  from './regression-r0-a2-prereq.mjs';

// A2 Task 3 (docs/plans/2026-10-31-a2-validator-plan.md): record
// validation, spec §4.1, checks the recorded problem alone. Each mutant
// changes one recorded fact of a generated problem; `recordDefect`
// names the first entry violating a check and the check's index (0 site
// flags, 1 references, 2 forced placement and result clauses outside F,
// 3 the Fail invariant). The corpus check is
// test/r0-a2-record-corpus.serial.test.mjs.
const Effect = await load('Domain.Recorded.Effect');
const Row = await load('Domain.Row');
const { Nothing } = await load('Data.Maybe');
const Origin = await load('Domain.Recorded.Origin');
const cases = await recordCases(load);
const { Record, problemOf, withEffects, consumeAt, consumeWith, use } = cases;

const nothing = found => assert.equal(found.constructor.name, 'Nothing');
const defect = (found, check, provenance) => {
  assert.equal(found.constructor.name, 'Just');
  assert.equal(found.value0.check, check);
  if (provenance !== undefined)
    assert.ok(Effect.eqProvenance.eq(found.value0.provenance)(provenance));
  return found.value0.provenance;
};
const bareFlipped = (problem, site) => {
  const index = consumeAt(problem, site);
  assert.ok(index >= 0, `the problem records ${site.name}`);
  return { index, problem: consumeWith(problem, index,
    consume => ({ ...consume, bare: false })) };
};

test('every SiteKind has a row', () => {
  // SiteKind's 13 constructors, each once; `siteFlags` has no wildcard.
  assert.equal(new Set(siteTable.map(row => row[0])).size, 13);
  for (const row of siteTable) {
    const flags = Record.siteFlags(siteOf(Effect, row));
    assert.deepEqual([flags.marks, flags.bare], row.slice(2), row[0]);
  }
});

test('the unchanged problems record no defect', () => {
  for (const problem of [use, cases.k, problemOf(famw, 'main'),
    problemOf(c1, 'mk')])
    nothing(Record.recordDefect(problem));
});

// Spec §12 C4. famw records no `AtInstalledC` (it installs nothing):
// its bare C meets ρ at `ClauseIntoC`. C1's `with` records the
// `AtInstalledC` C4 names.
test('C4 mutant is a defect', () => {
  const main = problemOf(famw, 'main');
  for (const [problem, site] of [[main, Effect.ClauseIntoC],
    [use, Effect.AtInstalledC]]) {
    const { index, problem: mutant } = bareFlipped(problem, site);
    defect(Record.recordDefect(mutant), 0,
      problem.effects.obligations[index].provenance);
  }
});

test('forced placement', () => {
  defect(Record.recordDefect(cases.strayEntry), 2, cases.entryProvenance);
});

// Controller ruling: every `⟨q, result clauses⟩` outside F is check 2.
test('result clauses outside F', () => {
  // R closed at the forcing use: F omits the tail, and the first
  // obligation naming it is the defect.
  const found = defect(Record.recordDefect(cases.closedR), 2);
  assert.ok(!(found instanceof Effect.InRecord));
  // With no obligations, the instance entry itself, as `InRecord`.
  const alone = defect(Record.recordDefect(withEffects(cases.closedR,
    { obligations: [] })), 2).value0;
  assert.ok(alone.table instanceof Effect.InInstances);
  assert.ok(Origin.eqPath.eq(alone.path.value0)(cases.path));
  // At a path that forces nothing, declared in `flexEff`.
  const last = cases.elsewhereEntry.effects.obligations.at(-1);
  defect(Record.recordDefect(cases.elsewhereEntry), 2, last.provenance);
});

test('Fail invariant', () => {
  nothing(Record.recordDefect(cases.k));
  defect(Record.recordDefect(cases.unconcrete), 3);
});

// A copy of the `AtDefer` as an `AtDeferredRow`, added beside it: since
// check 4 (dossier §18.148 (2)), replacing the `AtDefer` would also
// delete `Defer`'s required companion, a defect of its own.
test('AtDeferredRow is no defect', () => {
  const index = consumeAt(use, Effect.AtDefer);
  assert.ok(index >= 0);
  const copied = consumeWith(use, index, consume =>
    ({ ...consume, site: Effect.AtDeferredRow.value }));
  const added = copied.effects.obligations[index];
  const deferred = withEffects(use, { obligations:
    [...use.effects.obligations, { ...added, provenance: new Effect.AtSite(
      { ...added.provenance.value0,
        role: new Effect.Consumed(Effect.AtDeferredRow.value, 0) }) }] });
  assert.deepEqual([added.value.value0.marks, added.value.value0.bare],
    [true, false]);
  nothing(Record.recordDefect(deferred));
});

test('a reference outside its domain', () => {
  // No position is recorded: the first entry naming one fails check 1.
  defect(Record.recordDefect(withEffects(use, { positions: [] })), 1);
  // A rigid mark `use` does not declare, in a new first obligation.
  const [first] = use.effects.obligations;
  const label = { effect: Row.ConsoleEffect.value, args: [],
    mark: new Effect.Written(new Effect.FixedRigid('z')) };
  const marked = withEffects(use, { obligations: [{ ...first,
    value: new Effect.Entry({ labels: [label], tail: Nothing.value }) },
  ...use.effects.obligations.slice(1)] });
  defect(Record.recordDefect(marked), 1, first.provenance);
});

test('an unreferenced flexEff member', () => {
  const extra = new Effect.EffFresh(cases.path, new Effect.Clauses(99));
  const found = defect(Record.recordDefect(withEffects(use,
    { flexEff: [...use.effects.flexEff, extra] })), 1);
  assert.ok(found.value0.table instanceof Effect.InCoverage);
  assert.equal(found.value0.path.constructor.name, 'Nothing');
});

// Every branch of check 1 (sorts, undeclared variables, effect variables)
// and of check 3 (each refused payload form), one mutant of `k` each.
test('each reference and payload branch', async () => {
  const { provenance, cases: mutants } = await referenceMutants(load, cases.k);
  for (const [name, [problem, check]] of Object.entries(mutants)) {
    const found = Record.recordDefect(problem);
    assert.equal(found.constructor.name, 'Just', name);
    assert.equal(found.value0.check, check, name);
    assert.ok(Effect.eqProvenance.eq(found.value0.provenance)(provenance),
      name);
  }
});
