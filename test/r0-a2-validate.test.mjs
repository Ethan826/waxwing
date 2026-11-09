import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { absentPair, c2c, c7, sources, validateCases }
  from './regression-r0-a2-validate.mjs';

// A2 Task 11 (docs/plans/2026-10-31-a2-validator-plan.md): the
// validator's composition, spec §4's pipeline and §5's total failure
// order, through `prerequisites`, `judgeObligations` and the non-minting
// runner `validate` (dossier §18.145 (b)). Fixture-level checks of the
// recorded obligations.
const cases = await validateCases(load);
const { describe, honest, judge, prerequisites, validate, problemOf, pkg,
  closed, Effect, Maps, P, Atom } = cases;

const right = result => {
  assert.equal(describe(result), 'Right');
  return result.value0;
};
const bool = new P.PBase(Atom.BoolBase.value);
const withEffect = (input, variable, row = closed) => ({ ...input,
  effects: Maps.insert(Effect.ordEVar)(variable)(row)(input.effects) });
const flagged = problem => ({ ...problem, effects: { ...problem.effects,
  obligations: problem.effects.obligations.map(placed =>
    placed.value instanceof Effect.Consume
      ? { ...placed, value: new Effect.Consume({ ...placed.value.value0,
        bare: !placed.value.value0.bare }) } : placed) } });

test('empty effect package validates a pure declaration', () => {
  const problem = problemOf(sources.id, 'id');
  const empty = pkg({});
  assert.equal(describe(prerequisites(problem, empty)), 'Right');
  assert.equal(describe(judge(problem, empty)), 'Right');
  const result = right(validate(problem, empty));
  assert.equal(result.validity.constructor.name, 'Valid');
  assert.equal(result.compilation.constructor.name, 'Witnessed');
});

test('runner sequence: each step wins over the later ones', () => {
  // A record defect (a Consume's `bare` flag flipped) over Unsupported.
  const g = problemOf(sources.c3, 'g');
  assert.equal(describe(validate(flagged(g), honest(g))), 'RecordDefect');
  // Unsupported over a malformed package (a forced-looking extra key).
  const [stray] = problemOf(sources.c1, 'use').effects.flexEff;
  assert.equal(describe(validate(g, withEffect(honest(g), stray))),
    'NotCertifiable UnsupportedRecorded');
  // Malformed over G0: C1's result type bound to Bool, and F bound.
  const use = problemOf(sources.c1, 'use');
  const wrong = honest(use, { types: () => bool });
  const [forced] = cases.forcedOf(use);
  assert.equal(describe(validate(use, withEffect(wrong, forced))),
    'Malformed BindsForced');
  // G0 over the obligations: the same type is an obligation failure too.
  assert.equal(describe(prerequisites(use, wrong)), 'Right');
  assert.notEqual(describe(judge(use, wrong)), 'Right');
  assert.equal(describe(validate(use, wrong)), 'Unsatisfied');
  // An obligation failure once G0 accepts.
  const { problem, input } = c2c(cases);
  assert.equal(describe(validate(problem, input)), 'ObligationFailed');
});

// `coverage` on the completed package, as the runner should report it.
const covered = (problem, input) => {
  const completed = cases.Complete.complete(problem)(input);
  return cases.Witness.coverage(cases.Witness.flexDomain(problem))(
    problem)(cases.Complete.witnessOf(problem)(completed));
};

test('a package passing every step: compilation as coverage says', () => {
  const holed = problemOf(sources.c7b, 'id2');
  const passing = [
    [problemOf(sources.id, 'id'), pkg({})],
    [c7(cases).problem, c7(cases).input],
    // C7(b): y's variable a bare hole: G0 accepts the settled Int; the
    // hole contract decides the witness.
    [holed, honest(holed, { types: variable =>
      variable.value1.constructor.name === 'Param'
        ? new P.PVar(cases.Hole.holeVar(0)) : new P.PBase(
          Atom.IntBase.value) })]];
  const seen = passing.map(([problem, input]) => {
    const result = right(validate(problem, input));
    const expected = covered(problem, input);
    const compiled = result.compilation;
    if (expected.constructor.name === 'Right')
      assert.equal(compiled.constructor.name, 'Witnessed');
    else assert.deepEqual(compiled.value0, expected.value0);
    return compiled.constructor.name;
  });
  assert.deepEqual(seen, ['Witnessed', 'Witnessed', 'NoWitness']);
});

test('the result keeps the completed package (P_cu, not settled)', () => {
  const { problem, input } = c7(cases);
  const result = right(validate(problem, input));
  const expected = P.completedPackage(cases.Complete.complete(problem)(
    input));
  const effects = map => Maps.toUnfoldable(
    cases.Unfoldable.unfoldableArray)(map).map(pair =>
    pair.value1.tail.value0?.value0);
  assert.deepEqual(effects(P.completedPackage(result.completed).effects),
    effects(expected.effects));
  assert.deepEqual(effects(expected.effects), [3, 4]);
});

test('obligations are judged on settle (complete P_in)', () => {
  // C7(a): holes 3 and 4 differ unsettled, both settle closed.
  const { problem, input } = c7(cases);
  assert.equal(describe(judge(problem, input)), 'Right');
  assert.equal(describe(validate(problem, input)), 'Right');
});

test('G0 reads erase (settle P_in), not erase (P_c)', () => {
  // y absent: G0 refuses y flexible, though completion's hole for y
  // settles to a type the obligations, and G0 on erase P_c, accept.
  const { problem, input } = absentPair(cases);
  assert.equal(describe(prerequisites(problem, input)), 'Right');
  assert.equal(describe(validate(problem, input)), 'Unsatisfied');
  assert.equal(describe(judge(problem, input)), 'Right');
  const settledIn = cases.Package.erase(cases.Package.settle(input));
  const completed = cases.Package.erase(cases.Complete.settledOf(
    cases.Complete.complete(problem)(input)));
  const certify = cases.Substitution.certify(problem);
  assert.equal(certify(settledIn).constructor.name, 'Left');
  assert.equal(certify(completed).constructor.name, 'Right');
});

test('judged alone, an Unsupported gets the prerequisite refusal', () => {
  const problem = problemOf(sources.c3, 'g');
  const result = judge(problem, honest(problem));
  assert.equal(describe(result), 'NotCertifiable UnsupportedRecorded');
  assert.equal(result.value0.value1.check, 0);
});

test('no Certified: the Effects modules construct none', () => {
  const dir = 'src/Features/Check/Strategy/Effects';
  const files = readdirSync(dir).filter(name => name.endsWith('.purs'));
  assert.ok(files.includes('Validate.purs'));
  for (const name of files)
    assert.doesNotMatch(readFileSync(`${dir}/${name}`, 'utf8'),
      /\bCertified\b(?!\.)|Certified\.Internal/, name);
  // `validate` returns the validation result alone.
  const source = readFileSync(
    'src/Features/Check/Strategy/Substitution.purs', 'utf8');
  const body = source.slice(source.indexOf('\nvalidate = '),
    source.indexOf('\n-- `validate`\'s own composition'));
  assert.ok(body.length > 0);
  assert.doesNotMatch(body, /Certified/);
});
