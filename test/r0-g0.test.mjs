import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { g0From } from './r0-g0-support.mjs';

// Task 4.2 (AT19; plan §3.2): G0's check and guard and §3.2(a)'s
// detector, through the production `decide` with a test-built Checking
// (ruling R11) whose `openRequirements` is the production detector.
const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const { behaviours: { accepting }, checking, decide, ruleOf, firstB } = stubs;
const main = '\nfn main(): Int = 0;\n';
const sources = {
  fixed: `fn f(): Text = { let g = fn(y) => show(y); g(1) };${main}`,
  free: `fn f(): Int = { let g = fn(y) => show(y); 0 };${main}`,
  rigid: `fn shown(p: { ...r }): Text = show(p);${main}`,
  item: `fn p(item: a): Text = show(item);${main}`,
  boxed: 'type Fn = Fn(Int -> Int);\n'
    + 'fn main(): Fn = Fn(fn(n: Int) => n);\n',
  boxing: 'type Fn = Fn(Int -> Int);\n'
    + `fn f(): Int = { let g = fn(y) => show(y); 0 };${main}`
};
const problem = (name, decl = 'f') => stubs.recorded.problem(sources[name],
  decl);
const run = (name, decl, options) => describe(decide(checking({
  open: g0.open, ...options }), problem(name, decl)));
const online = (name, override) => g0.g0(override);
const Atom = g0.Atom;

test('AT19: an original equation fixes the variable, so Solved', () => {
  const recorded = problem('fixed');
  const shown = recorded.bq.find(entry =>
    entry.value.value0 instanceof Atom.TVar);
  const ground = g0.Entailed.entailedGround(recorded)(shown);
  assert.equal(g0.Entailed.groundType(ground.value0).value0.constructor.name,
    'IntBase');
  assert.deepEqual(run('fixed', 'f', { strategies: [online('fixed')] }), {
    verdict: 'Solved', attempts: ['Accepted'], searchFaults: [] });
});

test('AT19: a function type only under σ is never Contradiction', () => {
  const recorded = problem('free');
  const ints = new Atom.Arrow(new Atom.Base(Atom.IntBase.value),
    new Atom.Base(Atom.IntBase.value));
  const override = [[g0.atomVariable(recorded.bq[0]), ints]];
  assert.deepEqual(run('free', 'f', { strategies: [online('free',
    override)] }), {
    verdict: 'Unresolved Inference NoAcceptedCertificate',
    attempts: ['CheckFailed ClaimsComplete RequirementFails'],
    searchFaults: ['CandidateRefused RequirementFails'] });
});

test('AT19: a rigid type with online alone is Unsupported RequirementAtoms',
  () => {
    assert.deepEqual(run('rigid', 'shown', { strategies: [online('rigid')] }),
      { verdict: 'Unresolved Unsupported RequirementAtoms',
        attempts: ['Declined RequirementAtoms'], searchFaults: [] });
  });

test('a G0 limit is local to G0 (§3.2(b))', () => {
  const strategies = [online('item'), accepting()];
  assert.deepEqual(run('item', 'p', { strategies }), { verdict: 'Solved',
    attempts: ['Declined RequirementAtoms', 'Accepted'], searchFaults: [] });
  const rules = [ruleOf('test-refutes', firstB)];
  assert.equal(run('item', 'p', { strategies: [online('item')], rules })
    .verdict, 'Contradiction ByRule');
});

test('openRequirements and g0Guard are disjoint on the fixtures', () => {
  const cases = [['fixed', 'f'], ['free', 'f'], ['rigid', 'shown'],
    ['item', 'p'], ['boxed', 'main'], ['boxing', 'f'],
    ['compare', 'same']];
  sources.compare = `fn same(p: { ...r }): Bool = p == p;${main}`;
  let both = 0;
  for (const [name, decl] of cases) {
    const recorded = problem(name, decl);
    const open = g0.open(recorded);
    for (const entry of recorded.bq) {
      const alone = { ...recorded, bq: [entry] };
      const declined = g0.Guard.g0Guard(alone)
        .constructor.name === 'OutOfScope';
      if (declined && open.includes(entry)) both += 1;
    }
  }
  assert.equal(both, 0);
  // `cmp` at a rigid row is open, so it is not the guard's.
  const compared = problem('compare', 'same');
  assert.equal(g0.open(compared).length, 1);
});

test('openRequirements is unchanged when G0 is replaced by a stub', () => {
  const recorded = problem('boxed', 'main');
  const open = g0.open;
  const before = open(recorded);
  const withG0 = run('boxed', 'main', { strategies: [online('boxed')] });
  const withStub = run('boxed', 'main', { strategies: [accepting()] });
  assert.deepEqual(open(recorded), before);
  assert.equal(withG0.verdict, withStub.verdict);
  const source = readFileSync('src/Features/Check/Decide/Open.purs', 'utf8');
  assert.doesNotMatch(source, /import Features\.Check\.Strategy/);
});

test('G0 leaves open atoms to §3.2(a)', () => {
  const recorded = problem('boxed', 'main');
  assert.equal(g0.open(recorded).length, 1);
  const found = g0.check(recorded,
    g0.candidateOf(recorded));
  assert.equal(found.constructor.name, 'Right');
  assert.deepEqual(run('boxed', 'main', { strategies: [online('boxed')] }), {
    verdict: 'Unresolved Unsupported RequirementAtoms',
    attempts: ['Accepted'], searchFaults: [] });
  const boxing = problem('boxing');
  const box = new Atom.Base(new Atom.DataBase(0));
  const override = [[g0.atomVariable(boxing.bq[0]), box]];
  assert.deepEqual(run('boxing', 'f', { strategies: [online('boxing',
    override)] }), {
    verdict: 'Unresolved Unsupported RequirementAtoms',
    attempts: ['CheckFailed ClaimsComplete RequirementOpen'],
    searchFaults: [] });
});
