import test from 'node:test';
import assert from 'node:assert/strict';
import { fixturesIn } from './r0-probe-support.mjs';
import { rightOrThrow, load, problemsOf, resolved }
  from './r0-generate-support.mjs';
import { entryLists, stableStringify, wholeProblem }
  from './r0-canonical.mjs';
import { translateProgram } from './r0-translator.mjs';

// RT2, refusal independence (T-R0b §9 item 2, canonical; T-R0a AT1 and
// AT4 cite it; R0 tranche Task 3.4). Each fixture in
// test/fixtures/r0/rt2 is a program whose online solver refuses one
// declaration partway: T-R0b's minimum set (D4 at `walk` W1, p10, c21;
// D6 at p11 and `submit`; b04 and b03; E26's several-tail receiver; B9's
// removal and rest binder; H5's depth). Each adds a common tail after
// the refusing expression (`show` and `==`), a later declaration and a
// statically refused one (an over-applied call, E_ARITY). The recorded
// problem is generated whatever the solver did: it equals RT1's
// translation in full, not a prefix, and each test asserts the four
// things §9 item 2 names.
const { checkProgram } = await load('Features.Check.Outcomes');
const { wire } = await load('Format.Diagnostic');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const fixtures = fixturesIn('r0/rt2');

const runOf = fixture => {
  const program = resolved(fixture.source);
  const report = checkProgram(program);
  const translated = translateProgram(program);
  const declared = problemsOf(program).map(({ decl, problem }, at) => ({
    decl, problem, translated: translated[decl.id],
    today: report.outcomes[at].today }));
  const named = name => declared.find(item => item.decl.name === name);
  return { program, declared, named };
};

const covered = (source, span) =>
  source.slice(span.start.offset, span.end.offset);
const entriesOf = problem => entryLists.flatMap(list =>
  problem[list].map(entry => [list, entry]));
// Entries of expressions after the refusal: their node starts at or
// after the end of the refused span.
const after = (problem, end) => entriesOf(problem)
  .filter(([, entry]) => entry.origin.span.start.offset >= end)
  .map(([list, entry]) => stableStringify([list, entry])).sort();

test('the set is T-R0b §9 item 2\'s minimum set', () => {
  assert.deepEqual(fixtures.map(fixture => fixture.name), [
    'b03-mayhold-share', 'b04-share-meta-only',
    'b9-removal-several-tails', 'b9-rest-binder-several-tails',
    'd4-c21-accepts-parts', 'd4-p10-wrap-accepts', 'd4-walk-w1',
    'd6-p11-route', 'd6-submit', 'e26-several-tail-receiver',
    'h5-type-depth']);
});

for (const fixture of fixtures) {
  test(`${fixture.name}: refused partway, its problem complete`, () => {
    const { declared, named } = runOf(fixture);
    const refused = named(fixture.refused);
    // Today's online solver refuses the declaration (the collecting
    // driver's legacy slot), with the fixture's exact diagnostic.
    assert.equal(refused.today.constructor.name, 'Left', 'not refused');
    const today = wire(refused.today.value0);
    assert.deepEqual([today.code, today.message],
      [fixture.today.code, fixture.today.text]);
    // Not a prefix: every declaration's whole problem is RT1's.
    for (const item of declared)
      assert.equal(wholeProblem(item.problem), wholeProblem(item.translated),
        item.decl.name);
    // 1. Atoms of expressions after the refusal point are present (and
    // the translator's are the same).
    const found = after(refused.problem, today.span.end.offset);
    assert.ok(found.length > 0, 'no entry after the refusal');
    assert.deepEqual(found,
      after(refused.translated, today.span.end.offset));
    // 2. AT4: the `pr`/`cmp` atoms today's walks would have produced
    // after `waitingAtEnd` are in `bq`, origin body, one per site.
    const sites = refused.problem.bq.map(entry => [
      Object.keys(entry.value)[0], covered(fixture.source, entry.origin.span),
      entry.origin.kind]);
    assert.deepEqual(sites,
      fixture.bq.map(([atom, text]) => [atom, text, 'body']));
  });

  test(`${fixture.name}: a later and a static refusal have problems`,
    () => {
      const { program, declared, named } = runOf(fixture);
      const at = name => declared.indexOf(named(name));
      // 3. A later declaration in the same file has its problem.
      assert.ok(at(fixture.later) > at(fixture.refused));
      assert.ok(named(fixture.later).problem.b.length > 0);
      // 4. A statically refused declaration has its problem too.
      const bad = named(fixture.static);
      const { tables, signatures } = Inputs.generationInputs(program);
      const rules = rightOrThrow(
        Generate.staticRules(tables)(signatures)(bad.decl), 'bad');
      assert.deepEqual(rules.map(rule => rule.value0.constructor.name),
        ['StaticArity']);
      assert.equal(wire(bad.today.value0).code, 'E_ARITY');
      const arity = covered(fixture.source, wire(bad.today.value0).span);
      assert.equal(arity, 'later(1, 2)');
      assert.ok(bad.problem.b.some(entry => entry.origin.rule === 'E7'),
        'the addition after the arity error');
    });
}

// B9 (T-R0b §11 item 1): removal and a rest binder over several tails
// are E28 and P7 atoms, with no marker; today's checker stops at its
// R005B placeholder (withinOneTail). The equation over the composed
// parameter row is recorded, and RT1's translator records the same.
const severalTails = { record: {
  fields: [['a', { base: 'Int' }]], tails: [{ rigid: 0 }, { rigid: 1 }] } };
for (const [name, rule] of [['b9-removal-several-tails', 'E28'],
  ['b9-rest-binder-several-tails', 'P7']]) {
  test(`B9: ${name} records ${rule} over the two tails`, () => {
    const fixture = fixtures.find(item => item.name === name);
    const { problem, translated } = runOf(fixture).named('drop');
    const ruled = side => side.b.filter(entry => entry.origin.rule === rule)
      .map(entry => entry.value.eq[0]);
    assert.deepEqual(ruled(problem), [severalTails]);
    assert.deepEqual(ruled(translated), [severalTails]);
    assert.deepEqual([problem.outside, translated.outside], [[], []]);
  });
}
