import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { onlineFrom } from './r0-online-support.mjs';

// Task 4.3, acceptance criterion 2: the online search's read-back
// (Features.Check.Strategy.ReadBack) recovers a σ that passes
// `checkSubstitution` against the same problem, at positions that are
// generation's: each positioned variable's position names its origin's
// path, and σ(types(p)) is the checked node's type at every body path.
// RT8 runs the same checks over the corpus; these fixtures name each
// place where checking rebuilds the resolved shape (ReadBack.Walk).
const online = await onlineFrom(load);
const { Right } = await load('Data.Either');
const { Online } = online;

const source = `type List(a) = Nil | Cons(a, List(a));
effect Two { fn two(a: Int, b: Int): Int; };
effect Make { fn make(n: Int): Int -> Int; };
fn id(x: a): a = x;
fn twice(f: Int -> Int): Int -> Int = fn(n: Int) => f(f(n));
fn head(xs: List(Int)): Int = match xs { Cons(x, _) => x, Nil => 0 };
fn field(p: { a: Int, ...r }): Int = id(p.a) + 1;
fn others(p: { a: Int, b: Bool }): Bool =
  match p { { a: _, ...more } => more.b };
fn over(): Int = twice(fn(n: Int) => n + 1, 3);
fn shown(): Text = id(show)(1);
fn piped(): Int = 1 |> (fn(n: Int) => n + 1);
fn update(p: { a: Int, b: Bool }): { a: Int, b: Bool } = p { a = 2 };
fn extend(p: { a: Int }): { a: Int, c: Int } = { ...p, c: 1 };
fn remove(p: { a: Int, b: Bool }): { b: Bool } = p without { a };
fn partly(): Int with Two = { let inc = Two.two(1); inc(41) };
fn overly(): Int with Make = Make.make(1, 2);
fn main(): Int = 0;
`;
const program = online.programOf(source);
const names = program.functions.map(decl => decl.name);

const candidateOf = name => {
  const problem = online.problemOf(program, name);
  const found = online.search(program, problem);
  assert.equal(found.constructor.name, 'Candidate', name);
  return { problem, certificate: found.value0, claim: found.value1 };
};

test('every read-back candidate passes G0 at generation\'s positions', () => {
  for (const name of names) {
    assert.equal(online.todayOf(program, name).constructor.name, 'Right',
      name);
    const { problem, certificate, claim } = candidateOf(name);
    assert.equal(claim.constructor.name, 'ClaimsComplete', name);
    assert.equal(online.check(problem, certificate.substitution)
      .constructor.name, 'Right', name);
    assert.deepEqual(online.typeFindings(problem, certificate), [], name);
  }
});

const positionPath = position => {
  if (typeof position === 'string') return null;
  const [kind, value] = Object.entries(position)[0];
  return kind === 'rigidName' ? null : Array.isArray(value) ? value[0]
    : value;
};

// T-R0b §5.2: a position is at its variable's own node, except a
// record pattern's `field l`, at its sub-pattern's (P5-P7).
const linesUp = (path, variable, info) => {
  const [own, at] = [info.origin.path, path];
  if (stableStringify(own) === stableStringify(at)) return true;
  const extra = at.steps.slice(own.steps.length);
  return /^P[567]$/.test(info.origin.rule)
    && variable.fresh?.role?.field !== undefined
    && stableStringify(at.steps.slice(0, own.steps.length))
      === stableStringify(own.steps)
    && extra.length === 4 && extra[0] === 'Record' && extra[1] === 'fields'
    && Number.isInteger(extra[2]) && extra[3] === 'pattern';
};

test('each position names its variable\'s origin path', () => {
  let positioned = 0;
  for (const name of names) {
    const problem = online.canonicalOf(online.problemOf(program, name));
    for (const [variable, info] of problem.vars) {
      const path = positionPath(info.position);
      if (path === null) continue;
      positioned += 1;
      assert.ok(linesUp(path, variable, info),
        `${name} ${stableStringify(variable)} at ${stableStringify(path)}`);
    }
  }
  assert.ok(positioned >= 18, `${positioned} positioned`);
});

// G-A-i(g): with two tails no unifier completes the auxiliaries, so the
// read claims `Heuristic`; G0 refuses, and the refusal is a failed
// attempt, not a `SearchFault`.
test('a several-tail read-back is Heuristic, not a search fault', () => {
  const two = online.programOf('fn two(p: { a: Int, ...r, ...s }): Int'
    + ' where r disjoint s = p.a;\nfn main(): Int = 0;\n');
  assert.equal(online.todayOf(two, 'two').constructor.name, 'Right');
  const found = online.search(two, online.problemOf(two, 'two'));
  assert.equal(found.value1.constructor.name, 'Heuristic');
  assert.deepEqual(describe(online.decisionOf(two, 'two')), {
    verdict: 'Unresolved Inference NoAcceptedCertificate',
    attempts: ['CheckFailed Heuristic Undefined'], searchFaults: [] });
});

// A checked declaration that is not the problem's: its positions are
// missing, which is the read-back's own failure (G-Q13), not a stop.
test('a read-back failure is the search\'s own: Broke', () => {
  const problem = online.problemOf(program, 'head');
  const checked = candidateOf('id').certificate.checked;
  const found = Online.searched(problem)(new Right({ function: checked,
    state: null }));
  assert.equal(found.constructor.name, 'NoCandidate');
  assert.equal(found.value0.constructor.name, 'Broke');
  assert.match(found.value0.value0, /^read-back: /);
});

// Review I-1: the certificate says which holes σ bound (ReadBack step
// 4), so the binding's effect stays visible to RT8 and Task 4.5.
test('the certificate lists the holes the read-back bound', () => {
  const free = online.programOf('fn f(): Int = { let g = fn(y) => show(y);'
    + ' 0 };\nfn main(): Int = 0;\n');
  const found = online.search(free, online.problemOf(free, 'f'));
  assert.equal(found.value0.holes.length, 1);
  assert.deepEqual(candidateOf('field').certificate.holes, []);
});
