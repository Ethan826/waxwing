import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { fieldSource, routeSource, witnessFrom }
  from './r0-witness-support.mjs';

// Task 4.4 (author's criteria, 2026-10-23): a checked substitution as a
// compilation witness (W §1.6), Cov (W §4) and the hole contract's
// syntactic check (W §1.5). Shadow-only: nothing here is reachable from
// compile (ruling R6).
const w = await witnessFrom(load);
const { online } = w;
const inst = index => ({ fresh: { path: { root: 'body', steps: [] },
  role: { inst: index } } });

const routeProblem = online.problemOf(online.programOf(routeSource),
  'route');
const routeVar = index => w.variableAt(routeProblem, inst(index));
// `divide(x, y, z)`: u, v, s, t are slots 0-3; x, y, z rigid 0-2.
const routeSigma = u => w.substitution([
  ...(u === undefined ? [] : [[routeVar(0), u]]),
  [routeVar(1), w.rigidRow(0)], [routeVar(2), w.rigidRow(1)],
  [routeVar(3), w.rigidRow(2)]]);

const candidateOf = (source, name) => {
  const program = online.programOf(source);
  const problem = online.problemOf(program, name);
  const found = online.search(program, problem);
  assert.equal(found.constructor.name, 'Candidate', name);
  return { problem, certificate: found.value0 };
};
const auxiliaries = problem => w.flexible(problem)
  .filter(([, info]) => info.position.constructor.name === 'Auxiliary')
  .map(([variable]) => variable);

// Criterion 1 (coverage): every flexible variable, auxiliaries included.
test('Cov refuses a witness missing one auxiliary', () => {
  const { problem, certificate } = candidateOf(fieldSource, 'field');
  const made = w.witnessOf(problem, certificate.unsettled);
  assert.equal(made.constructor.name, 'Witnessed');
  const aux = auxiliaries(problem);
  assert.ok(aux.length > 0, 'field access records an auxiliary');
  assert.deepEqual(w.bindings(made.value0).map(([variable]) => variable),
    w.flexible(problem).map(([variable]) => w.key(variable)));
  assert.equal(w.coverage(problem, made.value0).constructor.name, 'Right');
  for (const missing of aux) {
    const found = w.coverage(problem, { ...made.value0,
      bindings: w.without(made.value0.bindings, missing) });
    assert.equal(found.constructor.name, 'Left');
    assert.deepEqual([found.value0.constructor.name,
      w.key(found.value0.value0)], ['Uncovered', w.key(missing)]);
  }
});

// Criterion 2 (hole contract), W §1.5's example: `u` left to its default
// `{}` breaks `B`, and the syntactic check sees it.
test('route: u defaulted to {} is NoWitness (HoleContract u)', () => {
  for (const sigma of [routeSigma(w.holeRow(0)), routeSigma()])
    assert.deepEqual(w.reason(w.witnessOf(routeProblem, sigma)),
      ['HoleContract', w.key(routeVar(0))]);
  // The default itself breaks `B`: G0 refuses u ↦ {}.
  const settled = online.check(routeProblem,
    routeSigma(new w.Atom.Record([], [])));
  assert.equal(settled.constructor.name, 'Left');
});

// Merely having a binding does not establish the contract: an auxiliary
// the substitution leaves out is bound `Free`, then judged.
test('an auxiliary left out of σ is bound Free and judged', () => {
  const { problem, certificate } = candidateOf(fieldSource, 'field');
  const [aux] = auxiliaries(problem);
  const made = w.witnessOf(problem, w.without(certificate.unsettled, aux));
  assert.deepEqual(w.reason(made), ['HoleContract', w.key(aux)]);
});

// Criterion 3: a hole whose default is permitted is accepted, and the
// default stays a `Free` binding (provisional; not an ambiguity policy).
const unusedShow = 'fn f(): Int = { let g = fn(y) => show(y); 0 };\n'
  + 'fn main(): Int = 0;\n';
test('an unconstrained hole whose default is permitted is accepted', () => {
  const { problem, certificate } = candidateOf(unusedShow, 'f');
  assert.ok(certificate.holes.length > 0);
  const made = w.witnessOf(problem, certificate.unsettled);
  assert.equal(made.constructor.name, 'Witnessed');
  const free = w.bindings(made.value0).filter(([, [kind]]) => kind === 'free')
    .map(([, [, hole]]) => hole);
  assert.deepEqual([...new Set(free)].sort(), certificate.holes);
  assert.ok(problem.bq.length > 0, 'show records pr');
  // The production run: Solved, its witness this one.
  const decision = online.decisionOf(online.programOf(unusedShow), 'f');
  const accepted = decision.value0.attempts[0];
  assert.equal(accepted.constructor.name, 'Accepted');
  assert.deepEqual(w.bindings(accepted.value2.value0),
    w.bindings(made.value0));
});

// The `BQ` arm: the same hole replaced by a function-holding record
// keeps every equation syntactically equal, and `pr` fails at it.
const replaced = (ty, hole, by) => {
  const A = w.Atom;
  if (ty instanceof A.TVar)
    return stableStringify(ty.value0) === stableStringify(hole) ? by : ty;
  if (ty instanceof A.Arrow) return new A.Arrow(replaced(ty.value0, hole,
    by), replaced(ty.value1, hole, by));
  if (ty instanceof A.App) return new A.App(ty.value0,
    ty.value1.map(part => replaced(part, hole, by)));
  if (ty instanceof A.Record) return new A.Record(ty.value0.map(pair =>
    new w.Tuple(pair.value0, replaced(pair.value1, hole, by))), ty.value1);
  return ty;
};
test('a BQ atom failing at the default breaks the contract', () => {
  const { problem, certificate } = candidateOf(unusedShow, 'f');
  const [hole] = certificate.holes;
  const holeVar = w.holeType(hole).value0;
  const fn = new w.Atom.Arrow(w.int, w.int);
  const by = new w.Atom.Record([new w.Tuple('f', fn)], [w.holeType(hole + 1)
    .value0]);
  const sigma = w.substitution(online.pairs(certificate.unsettled).map(
    ([variable, image]) => [variable, replaced(image, holeVar, by)]));
  assert.equal(w.reason(w.witnessOf(problem, sigma))[0], 'HoleContract');
});

// The `lacks` and `disjoint` arms: W §1.5's check wants an equation, so
// such an atom mentioning a hole breaks it even where the default `{}`
// would do (G0 accepts σ at the default): the check is sufficient, not
// complete. Every equation here has equal sides. σ is written by hand:
// the read-back reads these row slots as type holes (NotGeneric; Task
// 4.4 finding, BACKLOG).
const viaLambda = callee => `${callee}\n`
  + 'fn g(y: { ...s }): Int = { let k = fn(x) => call(x, y); 0 };\n'
  + 'fn main(): Int = 0;\n';
const callees = [['Disjoint', 'fn call(whole: { ...u }, left: { ...s }): '
  + 'Int where u disjoint s = 0;'], ['Lacks', 'fn call(whole: { ...u }, '
  + 'left: { ...s }): Int where u lacks { a } = 0;']];
const at = steps => ({ root: 'body', steps: ['Block', 'items', 0, 'Let',
  'value', ...steps] });
test('a lacks or disjoint atom mentioning a hole breaks the contract',
  () => {
    for (const [kind, callee] of callees) {
      const problem = online.problemOf(online.programOf(viaLambda(callee)),
        'g');
      const param = w.variableAt(problem, { fresh: { path: at([]),
        role: { param: 0 } } });
      const slot = index => w.variableAt(problem, { fresh: { path:
        at(['Lambda', 'body']), role: { inst: index } } });
      const sigmaWith = row => w.substitution([[param, row], [slot(0), row],
        [slot(1), w.rigidRow(0)]]);
      assert.deepEqual(w.reason(w.witnessOf(problem,
        sigmaWith(w.holeRow(0)))), ['HoleContract', w.key(param)], kind);
      assert.equal(online.check(problem, sigmaWith(new w.Atom.Record([],
        []))).constructor.name, 'Right', kind);
      assert.ok(problem.b.some(entry => entry.value.constructor.name
        === kind), kind);
    }
  });

// Criterion 4 (explicit substitution): a non-default binding survives
// witness construction unchanged.
const required = 'fn id(x: a): a = x;\nfn main(): Int = id(1);\n';
test('a required non-default binding is retained unchanged', () => {
  for (const [source, name] of [[required, 'main'], [fieldSource, 'field'],
    [unusedShow, 'f']]) {
    const { problem, certificate } = candidateOf(source, name);
    const made = w.witnessOf(problem, certificate.unsettled);
    assert.equal(made.constructor.name, 'Witnessed', name);
    const bound = new Map(w.bindings(made.value0));
    for (const [variable, image] of online.pairs(certificate.unsettled)) {
      const binding = bound.get(w.key(variable));
      if (binding[0] === 'free') continue;
      assert.deepEqual(binding, ['inline', w.decodeType(image)], name);
    }
  }
  const { problem, certificate } = candidateOf(required, 'main');
  assert.ok(w.bindings(w.witnessOf(problem, certificate.unsettled).value0)
    .some(([, binding]) => stableStringify(binding)
      === stableStringify(['inline', { base: 'Int' }])));
});
