import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { judged, malformedCases, rowCases }
  from './regression-r0-a2-malformed.mjs';

// A2 Task 5 (docs/plans/2026-10-31-a2-validator-plan.md): I3, spec §5
// item 3's checks (a)-(j) in order, over the maps effects, marks, types,
// rows, keys in `Ord` order; spec §12's C1 B, C5, C8, C9, C11, C12.
// Fixture-level checks of the recorded domain and forms.
const cases = await malformedCases(load);
const { Search, Malformed, Witness, Effect, P, Hole, Row, v, use, main,
  forced, source, least, terms, honest, stranger, failArrow, frame,
  mainEffects, typed, types, consoleType, pkg, N, J, closed, label, int,
  arrow, labelled, reason } = cases;

const is = (problem, input, expected) =>
  assert.equal(judged(cases, Malformed.malformed(problem)(input),
    expected), '');
const hole = index => new P.PVar(Hole.holeVar(index));
const holeRow = index => ({ labels: [], tail: new cases.Just(
  new P.PTailHole(index)) });
const rigidTail = id => ({ labels: [], tail: new cases.Just(
  new P.PTailRigid(id)) });
const unsolved = name => new Search.UnsolvedImage(reason.keyType(name));
const record = (fields, tails) => ({ fields: fields.map(([name, value]) =>
  new cases.Tuple(name, value)), tails });

test('the premises: C1 has one forced tail, its source package-owned',
  () => {
    assert.ok(source instanceof Effect.EffFresh);
    assert.ok(use.effects.flexEff.some(item =>
      Effect.eqEVar.eq(item)(forced)));
    is(use, honest, null);
  });

for (const [name, rows] of Object.entries(rowCases(cases)))
  test(`row case ${name}`, () => {
    for (const [, problem, input, expected] of rows)
      is(problem, input, expected);
  });

test('C9 BindsForced first', () => {
  is(use, pkg({ effects: [...least, [forced, closed]], marks: terms }),
    reason.bindsForced);
  // Before a missing position and a missing effect variable too.
  is(use, pkg({ effects: [[forced, closed]] }), reason.bindsForced);
});

test('C9 extra key', () => {
  is(use, pkg({ effects: [...least, [stranger, closed]], marks: terms }),
    reason.extra(reason.keyEffect(stranger)));
  // A declared rigid is no flexible variable; nor is a row's key a type's.
  is(typed(), types([[v('p'), int]]), reason.extra(reason.keyType('p')));
  is(typed(), pkg({ rows: [[v('x'), record([], [])]] }),
    new Search.WrongSort(new Search.KeyRow(v('x'))));
});

test('a forced tail\'s source missing is a missing key', () => {
  const without = least.filter(([variable]) =>
    !Effect.eqEVar.eq(variable)(source));
  is(use, pkg({ effects: without, marks: terms }),
    reason.missing(reason.keyEffect(source)));
});

test('C11 unsolved type image', () => {
  is(typed(), types([[v('x'), new P.PVar(v('y'))]]), unsolved('x'));
  is(typed(), types([[v('x'), new P.PVar(v('p'))]]), null);
  // A record tail naming an absent flexible row, at a row key.
  is(typed(), pkg({ rows: [[v('r'), record([], [v('s')])]] }),
    new Search.UnsolvedImage(new Search.KeyRow(v('r'))));
  // An effect tail naming an undeclared effect rigid.
  is(typed(), types([[v('x'), arrow(rigidTail(999))]]), unsolved('x'));
  is(typed({ effectRigids: [999] }), types([[v('x'),
    arrow(rigidTail(999))]]), null);
});

test('C12 TermJ empty is N', () => {
  const known = typed({ rigidMarks: ['k'] });
  is(known, types([[v('x'), consoleType(J())]]), null);
  is(known, types([[v('x'), consoleType(N)]]), null);
  is(known, types([[v('x'), consoleType(J('k'))]]),
    new Search.NotN(reason.keyType('x')));
  is(known, types([[v('x'), consoleType(P.TermM.value)]]),
    new Search.NotN(reason.keyType('x')));
});

test('C8 non-canonical', () => {
  const nullary = new P.PBase(new cases.Atom.DataBase(7));
  is(typed(), types([[v('x'), nullary]]),
    new Search.NonCanonical(reason.keyType('x')));
  is(typed(), types([[v('x'), new P.PData(7, [], [])]]), null);
});

test('C5 unread frame term', () => {
  assert.ok(frame instanceof Effect.Frame);
  const marked = term => pkg({ effects: mainEffects, marks: [[frame, term]] });
  is(main, pkg({ effects: mainEffects }),
    reason.missing(new Search.KeyMark(frame)));
  is(main, marked(N), null);
  is(main, marked(P.TermM.value), null);
});

test('unknown mark', () => {
  is(typed(), types([[v('x'), consoleType(J('z'))]]),
    new Search.UnknownMark(reason.keyType('x'), 'z'));
  is(main, pkg({ effects: mainEffects, marks: [[frame, J('z')]] }),
    new Search.UnknownMark(new Search.KeyMark(frame), 'z'));
});

test('HoleTwoSorts', () => {
  is(typed(), types([[v('x'), hole(3)], [v('y'), arrow(holeRow(3))]]),
    new Search.HoleTwoSorts(3));
  is(typed(), pkg({ types: [[v('x'), hole(3)]],
    rows: [[v('r'), record([], [Hole.holeVar(3)])]] }),
  new Search.HoleTwoSorts(3));
  is(typed(), types([[v('x'), hole(3)], [v('y'), arrow(holeRow(4))]]),
    null);
});

test('keyless Fail in an image', () => {
  const [first] = cases.owned;
  const failing = least.map(([variable, row]) => [variable,
    Effect.eqEVar.eq(variable)(first) ? { ...row, labels: [failArrow] }
      : row]);
  is(use, pkg({ effects: failing, marks: terms }),
    new Search.KeylessFail(reason.keyEffect(first)));
  // A hole payload settles to `Int`, which has a key.
  is(typed(), types([[v('x'), labelled(label(Row.FailEffect.value,
    [hole(0)], N))]]), null);
});

test('checks run in order (a)-(j), maps effects, marks, types, rows', () => {
  // (c) a missing position before (e) a non-canonical type.
  const nullary = new P.PBase(new cases.Atom.DataBase(7));
  is(main, pkg({ effects: mainEffects, types: [[v('x'), nullary]] }),
    reason.missing(new Search.KeyMark(frame)));
  // (b) wrong sort before (d) an extra key.
  is(typed(), pkg({ types: [[v('r'), int], [v('p'), int]] }),
    new Search.WrongSort(reason.keyType('r')));
  // (i) before (j); within (i), x before y.
  is(typed(), types([[v('x'), labelled(failArrow)],
    [v('y'), new P.PVar(v('s'))]]), unsolved('y'));
});

test('unsolvedKey is the solved form over packages (U8\'s cases)', () => {
  const key = (input, problem = typed()) => Witness.unsolvedKey(problem)(
    input);
  const named = (found, name) => found.constructor.name === 'Just'
    && Search.eqPackageKey.eq(found.value0)(reason.keyType(name));
  assert.ok(named(key(types([[v('x'), new P.PVar(v('y'))]])), 'x'));
  assert.ok(named(key(types([[v('x'), new P.PVar(v('q'))]])), 'x'));
  assert.ok(named(key(types([[v('x'), new P.PData(7,
    [new P.PVar(v('y'))], [])]])), 'x'));
  assert.equal(key(types([[v('x'), new P.PData(7,
    [new P.PVar(v('p'))], [])]])).constructor.name, 'Nothing');
  assert.equal(key(honest, use).constructor.name, 'Nothing');
});
