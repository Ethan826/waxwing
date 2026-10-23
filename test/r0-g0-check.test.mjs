import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { d02From, d02Lacking, d02Source, g0From }
  from './r0-g0-support.mjs';

// Task 4.2: G0's definedness check on d02 (Task 6.5 relies on it), each
// `CheckRefusal` constructor injected into the production `decide`, and
// the ground rule's every constructor.
const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const Search = await load('Domain.Verdict.Search');
const Verdict = await load('Domain.Verdict');
const GroundRule = await load('Features.Check.GroundRule');
const Origin = await load('Domain.Recorded.Origin');
const Set = await load('Data.Set');
const { ordInt } = await load('Data.Ord');
const { Atom, Map } = g0;
const d02 = d02Source;
const lacking = d02Lacking;
const { withLacks, problem: d02Problem } = d02From(stubs);

test('definedness: d02\'s lambda annotation is refused under any σ', () => {
  assert.notEqual(lacking, d02);
  assert.deepEqual(withLacks.d.map(entry => [entry.value.constructor.name,
    entry.origin.rule.value0]), [['Lacks', 4]]);
  const recorded = d02Problem;
  const holders = g0.holdersOf(lacking);
  assert.equal(g0.check(holders, withLacks, g0.candidateOf(withLacks))
    .constructor.name, 'Right');
  for (const candidate of [g0.candidateOf(recorded), Map.empty]) {
    const found = g0.check(holders, recorded, candidate);
    assert.equal(found.constructor.name, 'Left');
    assert.equal(found.value0.constructor.name, 'Undefined');
    const refused = recorded.b.filter(entry => JSON.stringify(
      entry.origin.atom) === JSON.stringify(found.value0.value0));
    assert.ok(refused.some(entry => entry.origin.rule.value0 === 13
      && entry.origin.rule instanceof Origin.ExprRule), 'E13');
  }
});

const atom = d02Problem.b[0].origin.atom;
const refusals = [
  ['RequirementOpen', new Search.RequirementOpen(atom),
    'Unresolved Unsupported RequirementAtoms', []],
  ...['Unsatisfied', 'Undefined', 'NotEntailed', 'RequirementFails',
    'RequirementUnjudged'].map(name => [name, new Search[name](atom),
    'Unresolved Inference NoAcceptedCertificate',
    [`CandidateRefused ${name}`]]),
  ['NotGeneric', Search.NotGeneric.value,
    'Unresolved Inference NoAcceptedCertificate',
    ['CandidateRefused NotGeneric']]
];

test('each CheckRefusal constructor, injected, is read by rule 3', () => {
  const plain = d02Problem;
  for (const [name, refusal, verdict, searchFaults] of refusals) {
    const found = describe(stubs.decide(stubs.checking({ strategies: [
      stubs.behaviours.refusing(Verdict.ClaimsComplete.value, refusal)] }),
    plain));
    assert.deepEqual(found, { verdict, searchFaults,
      attempts: [`CheckFailed ClaimsComplete ${name}`] }, name);
  }
  assert.equal(refusals.length, 7);
});

test('the ground rule, every constructor', () => {
  const holders = Set.insert(ordInt)(1)(Set.empty);
  const judge = (ty, view = () => GroundRule.Holds.value) =>
    GroundRule.judge(holders)(view)(ty).constructor.name;
  const base = name => new Atom.Base(Atom[name].value);
  for (const name of ['IntBase', 'BoolBase', 'TextBase', 'UnitBase'])
    assert.equal(judge(base(name)), 'Holds', name);
  assert.equal(judge(new Atom.Base(new Atom.DataBase(1))), 'Open');
  assert.equal(judge(new Atom.Base(new Atom.DataBase(2))), 'Holds');
  assert.equal(judge(new Atom.Arrow(base('IntBase'), base('IntBase'))),
    'Fails');
  const variable = new Atom.RigidVar(0);
  for (const wanted of ['Holds', 'Unjudged', 'Open', 'Fails'])
    assert.equal(judge(new Atom.TVar(variable), () =>
      GroundRule[wanted].value), wanted);
  const unjudged = () => GroundRule.Unjudged.value;
  assert.equal(judge(new Atom.Record([], [variable]), unjudged), 'Unjudged');
  assert.equal(judge(new Atom.Record([new g0.Tuple('a', new Atom.Arrow(
    base('IntBase'), base('IntBase')))], [variable]), unjudged), 'Fails');
  assert.equal(judge(new Atom.App(new Atom.DataHead(1), [])), 'Open');
  assert.equal(judge(new Atom.App(new Atom.DataHead(2),
    [new Atom.Base(new Atom.DataBase(1))])), 'Open');
  assert.equal(judge(new Atom.App(new Atom.HandlerHead(null), [])),
    'Fails');
});
