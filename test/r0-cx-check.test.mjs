import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { recorded } from './r0-rules-support.mjs';
import { recheck } from './r0-cx-support.mjs';

// Task 5.2: CX's check, `CXChecked (withBody (toSig P) body) rho`
// (refute/statements.md §4), conjunct by conjunct: every refusal is
// reached by a certificate that breaks exactly that conjunct (the key
// and groundness conjuncts on both types and rows), and each
// constructor of `RefuteRefusal` has a case here (read from the source,
// so a new constructor fails this test until it has one).
const Check = await load('Features.Check.Refute.Counter.Check');
const Project = await load('Features.Check.Refute.Project');
const Counter = await load('Domain.Verdict.Counter');
const Atom = await load('Domain.Recorded.Atom');
const { fields } = await load('Domain.Recorded');
const { Tuple } = await load('Data.Tuple');

const main = 'fn main(): Int = 1;\n';
// `a = Int` in the body; `a` rigid.
const rigid = `fn f(x: a): Int = x;\n${main}`;
// `Bool = Int` in the body, `r lacks a` in `D`.
const lacking = `fn f(p: { ...r }): Int where r lacks { a } = true;\n${main}`;
// A body with flexible variables.
const selecting = `fn f(p: { ...r }): Int = p.a;\n${main}`;

const sigOf = problem => Project.toSig(problem).value0;
const ground = {
  int: new Counter.GroundBase(Atom.IntBase.value),
  bool: new Counter.GroundBase(Atom.BoolBase.value),
  fresh: n => new Counter.GroundFresh(n),
  record: pairs => new Counter.GroundRecord(pairs.map(([label, value]) =>
    new Tuple(label, value)))
};
const cxOf = (problem, { ty = [], row = [], body } = {}) => {
  const sig = sigOf(problem);
  return { rho: { ty: ty.map(([at, value]) => new Tuple(sig.rigidTy[at],
    value)), row: row.map(([at, pairs]) => new Tuple(sig.rigidRow[at],
    pairs.map(([label, value]) => new Tuple(label, value)))) },
  body: body ?? sig.b.map(entry => entry.id) };
};
const checked = (problem, cx) => Check.checkCX(problem)(cx);
const refusal = (problem, cx) => {
  const result = checked(problem, cx);
  assert.equal(result.constructor.name, 'Left', 'certificate accepted');
  return result.value0.constructor.name;
};
const altered = (problem, change) =>
  ({ ...fields(problem), ...change(fields(problem)) });

test('a certificate meeting every conjunct is accepted', () => {
  const problem = recorded(rigid);
  for (const value of [ground.bool, ground.fresh(1)]) {
    const result = checked(problem, cxOf(problem, { ty: [[0, value]] }));
    assert.equal(result.constructor.name, 'Right');
    assert.equal(result.value0.patterns, 1);
  }
});

const cases = {
  NoProjection: () => {
    const problem = recorded(lacking);
    return [altered(problem, view => ({ q: [view.d[0]] })),
      cxOf(problem, { row: [[0, []]] })];
  },
  NotInBody: () => {
    const problem = recorded(lacking);
    return [problem, cxOf(problem, { row: [[0, []]],
      body: [sigOf(problem).d[0].id] })];
  },
  // A flexible variable in `D`: the source never records one.
  Unscoped: () => {
    const problem = recorded(selecting);
    const view = fields(problem);
    const moved = altered(problem, () => ({ d: [...view.d, view.b[0]] }));
    return [moved, cxOf(problem, { row: [[0, []]] })];
  },
  DuplicateKey: () => {
    const problem = recorded(rigid);
    return [problem, cxOf(problem, { ty: [[0, ground.bool],
      [0, ground.int]] })];
  },
  // `a` is a rigid type variable, bound here as a row.
  NotRigid: () => {
    const problem = recorded(rigid);
    const cx = cxOf(problem, { ty: [[0, ground.bool]] });
    cx.rho.row = [new Tuple(sigOf(problem).rigidTy[0], [])];
    return [problem, cx];
  },
  RigidUnbound: () => {
    const problem = recorded(rigid);
    return [problem, cxOf(problem)];
  },
  IllFormed: () => {
    const problem = recorded(rigid);
    return [problem, cxOf(problem, { ty: [[0, ground.record([
      ['x', ground.int], ['x', ground.bool]])]] })];
  },
  // The body is refuted under every `ρ`, but this `ρ` violates `D`: the
  // check reads the whole `D` (CX C1-D, X7).
  HypothesisFails: () => {
    const problem = recorded(lacking);
    return [problem, cxOf(problem, { row: [[0, [['a', ground.int]]]] })];
  },
  BodySatisfiable: () => {
    const problem = recorded(rigid);
    return [problem, cxOf(problem, { ty: [[0, ground.int]] })];
  }
};

// The key and groundness conjuncts have a type half and a row half;
// `cases` breaks one half of each, these the other (review item 1).
const otherHalves = {
  'DuplicateKey (row keys)': () => {
    const problem = recorded(lacking);
    return [problem, cxOf(problem, { row: [[0, []], [0, []]] })];
  },
  // `r` is a rigid row variable, bound here as a type.
  'NotRigid (type keys)': () => {
    const problem = recorded(lacking);
    const cx = cxOf(problem, { row: [[0, []]] });
    cx.rho.ty = [new Tuple(sigOf(problem).rigidRow[0], ground.int)];
    return [problem, cx];
  },
  'RigidUnbound (rigid rows)': () => {
    const problem = recorded(lacking);
    return [problem, cxOf(problem)];
  },
  'IllFormed (row bindings)': () => {
    const problem = recorded(lacking);
    return [problem, cxOf(problem, { row: [[0, [['x', ground.int],
      ['x', ground.bool]]]] })];
  }
};

const declared = () => {
  const source = readFileSync(
    join(repoRoot, 'src/Domain/Verdict/Counter.purs'), 'utf8');
  const body = source.slice(source.indexOf('data RefuteRefusal'),
    source.indexOf('derive instance'));
  return [...body.matchAll(/^\s+[=|] (\w+)/gm)].map(found => found[1]);
};

test('each refusal is reached by breaking its conjunct', () => {
  assert.deepEqual(Object.keys(cases).sort(), declared().sort());
  for (const [name, make] of Object.entries(cases))
    assert.equal(refusal(...make()), name, name);
});

test('each key conjunct is checked on types and on rows', () => {
  for (const [label, make] of Object.entries(otherHalves))
    assert.equal(refusal(...make()), label.split(' ')[0], label);
});

// The brute force is not vacuous: it finds a solution where the body is
// satisfiable and `D` false where `ρ` violates it.
test('the brute force finds what the check refuses', () => {
  const satisfiable = recorded(rigid);
  const loose = recheck(sigOf(satisfiable),
    cxOf(satisfiable, { ty: [[0, ground.int]] }));
  assert.notEqual(loose.solution, null);
  const violating = recorded(lacking);
  const broken = recheck(sigOf(violating),
    cxOf(violating, { row: [[0, [['a', ground.int]]]] }));
  assert.equal(broken.dHolds, false);
  assert.equal(broken.solution, null);
});
