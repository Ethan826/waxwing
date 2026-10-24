import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { B, eq, fresh, generated, load, rec, rigid, ruleEntries, tv }
  from './r0-generate-support.mjs';
import { problemFindings } from './r0-generate-checks.mjs';

// R0 Task 3.2 (a): T-R0b §3.1, the declaration's rules Sig1-Sig10, each
// pinned by a hand-checked list of `(AtomId, entry)` (path, index,
// value), with RT7's checks on every fixture. Paths are §6's, with
// docs/findings.md "RT1's translator" readings 2-5 and 17.
const lacks = (variable, label) => ({ lacks: [variable, label] });
const disjoint = (one, other) => ({ disjoint: [one, other] });

const shapes = `type Holder(...r) = Holder({ x: Int, ...r });
type Box(a) = Box(a);
fn f(p: { a: Int, ...r }, h: Holder(...s), b: Box(Int)): { b: Bool, ...t }
    where r lacks { c }, r disjoint t = crash(1);
fn main(): Int = 1;
`;

test('Sig1: the rigid variables are the type and record-row VarIds', () => {
  const { decl, problem } = generated(shapes);
  assert.deepEqual(decl.sorts.map(sort => sort.constructor.name),
    ['RecordSort', 'RecordSort', 'RecordSort', 'RowSort']);
  assert.deepEqual([problem.rigidTy, problem.rigidRow],
    [[], [rigid(0), rigid(1), rigid(2)]]);
  const sig1 = problem.vars.filter(([, info]) => info.origin.rule === 'Sig1');
  assert.deepEqual(sig1.map(([variable, info]) => [variable, info.quant,
    info.position, info.origin.path, info.origin.role]), [0, 1, 2].map(i =>
    [rigid(i), { forall: i }, { rigidName: i },
      { root: 'parameters', steps: ['variables', i] }, null]));
  assert.deepEqual(problemFindings(decl, problem), []);
});

test('Sig4, Sig5: written clauses, per label and per pair (contract)',
  () => {
    const { problem } = generated(shapes);
    assert.deepEqual(ruleEntries(problem, 'Sig4'),
      [['d', ['constraints', 0], 0, lacks(rigid(0), 'c')]]);
    assert.deepEqual(ruleEntries(problem, 'Sig5'),
      [['d', ['constraints', 1], 0, disjoint(rigid(0), rigid(2))]]);
    assert.ok(problem.d.every(entry => entry.origin.kind
      === (['Sig4', 'Sig5'].includes(entry.origin.rule) ? 'contract'
        : 'types')));
  });

test('Sig6, Sig8: implied lacks per type; Sig8 marks f\'s own types', () => {
  const { problem } = generated(shapes);
  assert.deepEqual(ruleEntries(problem, 'Sig6'), [
    ['d', ['parameters', 0], 0, lacks(rigid(0), 'a')],
    ['d', ['result'], 0, lacks(rigid(2), 'b')]]);
  assert.deepEqual(ruleEntries(problem, 'Sig8'), [
    ['d', ['parameters', 1], 0, lacks(rigid(1), 'x')],
    ['outside', ['parameters', 1], 1, 'DataOverRecords'],
    ['outside', ['parameters', 2], 0, 'DataApplication']]);
  assert.deepEqual(problem.outside.map(entry => entry.origin.row),
    ['O5', 'F8']);
});

test('Sig3: the body\'s type against the written result (B1, body)', () => {
  const { problem } = generated(shapes);
  const res = tv(fresh([], 'res'));
  assert.deepEqual(ruleEntries(problem, 'Sig3'),
    [['b', ['body'], 0, eq(res, rec([['b', B('Bool')]], [rigid(2)]))]]);
});

const joined = `effect State(s) { fn get(): s; };
fn g(p: { ...r, ...s }, x: Int): Int with State({ a: Int, ...q })
    where r disjoint s = x;
fn main(): Int = 1;
`;

test('Sig7: a joined pair; Sig6 over the effect row at result/row', () => {
  const { decl, problem } = generated(joined, 'g');
  assert.deepEqual(ruleEntries(problem, 'Sig7'),
    [['d', ['joined', 0], 0, disjoint(rigid(0), rigid(1))]]);
  assert.deepEqual(ruleEntries(problem, 'Sig6'),
    [['d', ['result', 'row'], 0, lacks(rigid(2), 'a')]]);
  assert.deepEqual(problemFindings(decl, problem), []);
});

test('Sig2, Sig3: a parameter is its written type in Γ₀', () => {
  const { problem } = generated(joined, 'g');
  assert.deepEqual(ruleEntries(problem, 'Sig3'),
    [['b', ['body'], 0, eq(B('Int'), B('Int'))]]);
});

test('Sig9, Sig10: q is empty; main\'s result is printable (C5)', () => {
  const { problem } = generated(joined, 'main');
  assert.deepEqual(problem.q, []);
  assert.deepEqual(ruleEntries(problem, 'Sig10'),
    [['bq', ['result'], 0, { pr: B('Int') }]]);
  assert.equal(problem.bq[0].origin.kind, 'contract');
  assert.deepEqual(ruleEntries(generated(joined, 'g').problem, 'Sig10'), []);
});

// The export list is an enumerated allowlist (ruling R2; Task 0.3 NB3):
// `generate`, `staticRules`, the fault's `generationProblem` and the
// types `Tables`, `Signatures`, `GenerationFault`; no production empty
// problem. Task 7.1a adds `generationInputs` and the type `Inputs`: rule
// E3 closes Generate.Inputs to the driver (scripts/structure-elab.mjs
// pins the source list).
test('Features.Check.Generate exports its enumerated values only',
  async () => {
    const Generate = await load('Features.Check.Generate');
    assert.deepEqual(Object.keys(Generate).sort(),
      ['generate', 'generationInputs', 'generationProblem', 'staticRules']);
  });

// T-R0b §4's applicative invariant, by the import graph: generation
// reaches no checker module but the pure table readers it reuses and,
// since Task 7.1b builds checked IR, the moved `holes` with the walk it
// renumbers by and the spine reader, so no checker state, substitution
// or solved type can be read by any rule. The closure is pinned exactly
// here; the earlier assertion that no Generate* module imports
// Domain.Checked is retired with the port (Task 7.1a's carry), and T10
// (test/r0-elab-rules.test.mjs) checks the same allowlist from every
// Generate* module, transitively.
const reused = ['Features.Check.Components', 'Features.Check.Functional',
  'Features.Check.Holes', 'Features.Check.Implied', 'Features.Check.Nested',
  'Features.Check.NestedArguments', 'Features.Check.Spine',
  'Features.Check.Tables', 'Features.Check.Walk',
  'Features.Resolve.Builtin'];
test('generation reaches no checker state (applicative invariant)', () => {
  const result = spawnSync('purs',
    ['graph', 'src/**/*.purs', '.spago/p/*/src/**/*.purs'],
    { encoding: 'utf8', maxBuffer: 4 * 1024 ** 2 });
  assert.equal(result.status, 0, result.stderr);
  const graph = JSON.parse(result.stdout);
  const seen = new Set();
  const visit = name => {
    if (seen.has(name)) return;
    seen.add(name);
    graph[name].depends.forEach(visit);
  };
  visit('Features.Check.Generate');
  const outside = /^(Features|Format|Program|Runtime)\./;
  const features = [...seen].filter(name => outside.test(name)
    && !/^Features\.Check\.Generate(\.|$)/.test(name)).sort();
  assert.deepEqual(features, reused);
});
