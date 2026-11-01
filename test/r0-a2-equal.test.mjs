import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { packageOf, problemOf } from './r0-a2-package.mjs';

// A2 Task 7 (docs/plans/2026-10-31-a2-validator-plan.md): E1 and
// Definition 4.1 (statements §4, spec §9's `Equal` row). Each case
// checks a recorded obligation, or two types, against a package built
// here, complete and settled by hand: every result is fixture-level.
// Expected check indices j follow spec §9's order: at a node its
// constructor and head, then its marks, then children left to right; a
// row's keys in first-occurrence order (count, then each pair: arguments,
// then mark), then extra keys of the right side, then the tail.
const Equal = await load('Features.Check.Strategy.Effects.Equal');
const Recorded = await load('Domain.Recorded');
const Effect = await load('Domain.Recorded.Effect');
const Hole = await load('Domain.Recorded.Hole');

const prelude = 'effect Ask { fn ask(): Unit; };\n'
  + 'effect Log { fn log(n: Int): Unit; };\n';
const effects = (source, name) => Recorded.fields(problemOf(
  `${prelude}${source}\nfn main(): Int = 0;`, name)).effects;
const equalAt = (problem, index) => {
  const found = problem.obligations[index].value;
  assert.equal(found.constructor.name, 'Equal');
  return { left: found.value0, right: found.value1 };
};
const lastStep = path => path.steps[path.steps.length - 1].value0;
const flexAt = (problem, role, step) => problem.flexEff.find(variable =>
  variable.value1.constructor.name === role
  && lastStep(variable.value0) === step);
const openedAt = (problem, step) => problem.positions.find(position =>
  position.constructor.name === 'Opened'
  && lastStep(position.value0) === step);
const judged = (spec, equal) => Equal.equalCheck({
  package: packageOf(spec), rigidMarks: [] })(equal.left)(equal.right);
const holeTy = index => new Effect.MVar(Hole.holeVar(index));
// Two types compared directly: holes 0 and 1 bound to them.
const compared = (left, right) => judged({ types: [[{ hole: 0 }, left],
  [{ hole: 1 }, right]] }, { left: holeTy(0), right: holeTy(1) });
const accepted = result => assert.equal(result.constructor.name, 'Right');
const refusedAt = (result, check) => {
  assert.equal(result.constructor.name, 'Left');
  assert.deepEqual(result.value0, { check, limit: false });
};

const label = (effect, mark, args = []) => ({ effect, args, mark });
const log = mark => label(1, mark);
const row = (labels, tail = null) => ({ labels, tail });
const arrow = (labels, tail = null, parameter = 'Unit') =>
  ({ arrow: [parameter, row(labels, tail), 'Unit'] });
const ask = (inference, clauses) =>
  ({ handler: [label(0, 'N'), { inference, clauses }] });

test('E1 marks', () => {
  // statements §12.2 T3-a: an image's nested N against a written plain
  // `Log` (M). Obligation 1 equates h's written type with id's instance.
  const problem = effects('fn id(x: a): a = x;\n'
    + 'fn f(h: Unit -> Unit with Log): Unit with pure = '
    + '{ let k = id(h); () };', 'f');
  const equal = equalAt(problem, 1);
  const tail = { rigid: equal.left.value1.tail.value0.value0 };
  const spec = mark => ({ types: [[equal.right.value0,
    arrow([log(mark)], tail)]], effects: [[problem.flexEff[0], row([])]] });
  // arrow 0, `Unit` 1, `Log`'s count 2, its mark 3.
  refusedAt(judged(spec('N'), equal), 3);
  accepted(judged(spec('M'), equal));
});

test('closed-record Fail payload has a key', () => {
  const fail = fields => label('Fail', 'N',
    [{ record: { fields, tails: [] } }]);
  const a = arrow([fail([['a', 'Int']])]);
  accepted(compared(a, a));
  // arrow 0, `Unit` 1, the key `Fail {a}`'s count 2 (one against none).
  refusedAt(compared(a, arrow([fail([['b', 'Int']])])), 2);
  // A record with a tail is keyless: no row reading, refused.
  const open = arrow([label('Fail', 'N', [{ record: { fields: [['a',
    'Int']], tails: [{ rigid: 7 }] } }])]);
  refusedAt(compared(open, open), 2);
});

test('pre-order j', () => {
  // Head and argument both differ: the head's j is reported.
  refusedAt(compared({ data: [3, ['Int'], []] },
    { data: [4, ['Bool'], []] }), 0);
  // The parameter (j 1) and the row's mark (j 3) both differ.
  refusedAt(compared(arrow([log('M')], null, 'Unit'),
    arrow([log('N')], null, 'Bool')), 1);
});

test('E1 order', () => {
  // statements §12.2: State(Int) + State(Bool) against its swap.
  const problem = effects('effect State(s) { fn get(): s; '
    + 'fn put(value: s): Unit; };\nfn f(h: Unit -> Unit with State(Int) + '
    + 'State(Bool)): Unit -> Unit with State(Bool) + State(Int) = h;', 'f');
  const equal = equalAt(problem, 0);
  // arrow 0, `Unit` 1, `State`'s count 2, the first pair's `Int` 3.
  refusedAt(judged({}, equal), 3);
  accepted(judged({}, { left: equal.left, right: equal.left }));
});

// statements §12.2 attempt A (derived.mjs): neither type owns a C, so R
// is compared with marks (Definition 4.1(c)).
const attemptA = h2 => {
  const problem = effects('fn f(h: Handler(nofail Ask with Log)): Unit '
    + 'with Log = with h { Ask.ask() };\n'
    + `fn g(h2: Handler(nofail Ask with ${h2})): Unit with Log = f(h2);`,
  'g');
  const equal = equalAt(problem, 1);
  const rigid = equal.left.value1.inference.tail.value0.value0;
  return judged({ effects: [[problem.flexEff[0], row([], { rigid })]] },
    equal);
};

test('attempt A refused', () => {
  // handler head 0, handled mark 1, R's `Log` count 2, its mark 3.
  refusedAt(attemptA('nofail Log'), 3);
  accepted(attemptA('Log'));
});

// statements §12.2 attempt B: obligations 4 (mk()'s ResultC against x)
// and 5 (g's type, no C, against x); r is g's rigid tail.
const attemptB = effects('fn mk(): Handler(nofail Ask with ...s) with '
  + 'pure = handler Ask { ask() => () };\nfn run(b: Bool, g: Handler('
  + 'nofail Ask with ...r)): Unit with ...r = { let h = if b then mk() '
  + 'else g; with h { defer Ask.ask(); () } };', 'run');
const r = { rigid: equalAt(attemptB, 5).left.value1.inference.tail.value0
  .value0 };
const bJudged = (resultTail, x) => [4, 5].map(index => {
  const equal = equalAt(attemptB, index);
  return judged({ types: [[equal.right.value0, x]],
    effects: [[flexAt(attemptB, 'EffInst', 'then'), row([], r)],
      [flexAt(attemptB, 'ResultClauses', 'then'), row([], resultTail)]],
    marks: [[openedAt(attemptB, 'then'), 'N']] }, equal);
});

test('attempt B refused', () => {
  const alias = row([], r);
  for (const clauses of [row([]), alias, null]) {
    const verdicts = bJudged(null, ask(alias, clauses));
    assert.ok(verdicts.some(verdict => verdict.constructor.name === 'Left'),
      JSON.stringify(clauses));
  }
  // The forced copy of R's tail: both hold, x owning C or not.
  for (const clauses of [alias, null])
    bJudged(r, ask(alias, clauses)).forEach(accepted);
});

// C13 (spec §12, N2): an image owning a C examined through one `Equal`
// only, the then-branch's ResultC (`[Log]` + its forced tail) against x.
// Fixture-level: the program itself is blocked (UnframedInstall).
const c13 = effects('fn mk(): Handler(nofail Ask with Log + ...s) with '
  + 'pure = handler Ask { ask() => Log.log(1) };\nfn use(b: Bool): Unit '
  + 'with Log = { let h = if b then mk() else mk(); with h { defer '
  + 'Ask.ask(); () } };', 'use');
const c13Judged = x => {
  const equal = equalAt(c13, 4);
  return judged({ types: [[equal.right.value0, x]],
    effects: [[flexAt(c13, 'EffInst', 'then'), row([])],
      [flexAt(c13, 'ResultClauses', 'then'), row([])]],
    marks: [[openedAt(c13, 'then'), 'N']] }, equal);
};

test('C13 image C through Equal', () => {
  const logged = row([log('M')]);
  accepted(c13Judged(ask(logged, logged)));
  // head 0, mark 1, R ignoring marks: `Log` 2, extra keys 3, tail 4;
  // then C: `Log`'s count 5.
  refusedAt(c13Judged(ask(logged, row([]))), 5);
  // No C: the ResultC is compared with x's R itself, marks included.
  accepted(c13Judged(ask(logged, null)));
  refusedAt(c13Judged(ask(row([log('N')]), null)), 6);
});

test('an unbound key is refused at the first check', () => {
  refusedAt(judged({}, { left: holeTy(0), right: holeTy(0) }), 0);
});
