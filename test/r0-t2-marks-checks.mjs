// Tranche 2 Task 9's restored-defect checks (test/regression-r0-t2-
// marks.mjs; rows in scripts/regression-r0-t2-marks.mjs): each returns
// the names of the cases that differ, empty when all hold. `load` reads
// the compiler under test only. Fixture-level, and bounded for the
// oracle subset.
import { marksCases, sources } from './r0-t2-marks-cases.mjs';
import { oracleCases } from './r0-t2-marks-oracle-cases.mjs';

const ORACLE_SAMPLE = 2000;

export const marksChecks = async load => {
  const cases = await marksCases(load);
  const { store, mark, termIn, live, read, named, positionsText, remap } =
    cases;
  const { M, rigid, meta } = mark;
  const faultOf = (item, trace) => {
    const found = read(item, trace);
    return named(found) === 'Left' ? named(found.value0) : 'Right';
  };
  const handled = () => live(sources.handlers, 'handled');
  const planted = (item, key, change) => ({ ...item.trace,
    [key]: remap(item.trace[key], entries => entries.map(change)) });
  // Equalities joined: a shared meta, and the oracle's seeded graphs.
  const sharedWrong = async () => {
    const wrong = [];
    const given = store([[-1, meta(-2)], [-3, meta(-2)]], [[M, meta(-3)]]);
    if ([-1, -2, -3].some(at => termIn(given, meta(at)) !== 'M'))
      wrong.push('shared');
    const oracle = await oracleCases(load);
    const result = oracle.families.randomFamily(oracle.verdict(),
      ORACLE_SAMPLE);
    if (result.found.length > 0 || oracle.counts.differ > 0)
      wrong.push('oracle');
    return wrong;
  };
  // A meta with no constraint reads N, never M.
  const absentWrong = () => [[store([], []), 42],
    [store([], [[meta(-1), M]]), -1]].filter(([given, at]) =>
    termIn(given, meta(at)) !== 'N').map(([, at]) => `meta ${at}`);
  // Rigid constants reaching a class join as J S.
  const rigidWrong = () => {
    const given = store([], [[rigid('k'), meta(-1)], [rigid('j'),
      meta(-1)]]);
    const frame = positionsText(read(live(sources.rigidFrame, 'g'))
      .value0);
    return [termIn(given, meta(-1)) === 'J{j,k}' ? null : 'join',
      frame.includes('Frame:J{k}') ? null : 'frame'].filter(Boolean);
  };
  // Two readings with different terms are PositionApart, never one.
  const apartWrong = () => {
    const item = handled();
    const own = planted(item, 'clauses', entry => ({ ...entry, own: M }));
    return faultOf(item, own) === 'PositionApart' ? [] : ['apart'];
  };
  // An `Unmarked` reading is UnreadPosition, never N.
  const unmarkedWrong = () => {
    const item = handled();
    const frame = planted(item, 'installations', entry => ({ ...entry,
      frame: mark.U }));
    return faultOf(item, frame) === 'UnreadPosition' ? [] : ['unmarked'];
  };
  // A position on a Console label whose term is not N is refused, never
  // forced to N; con2 reads N live.
  const consoleWrong = () => {
    const item = live(sources.con2, 'f');
    const wrong = positionsText(read(item).value0).join() === 'Frame:N'
      ? [] : ['live'];
    const frame = planted(item, 'installations', entry => ({ ...entry,
      frame: meta(99) }));
    const below = given => ({ ...item, store: store([], given) });
    const fault = (given, trace) => {
      const found = read(given, trace);
      return named(found) === 'Left' ? named(found.value0)
        : positionsText(found.value0).join();
    };
    if (fault(below([[M, meta(99)]]), frame) !== 'UnreadPosition')
      wrong.push('M');
    if (fault(below([[meta(99), M]]), frame) !== 'Frame:N')
      wrong.push('N');
    return wrong;
  };
  // An edge is lower ⊑ upper: a rigid below a meta reaches it.
  const directionWrong = () => {
    const below = store([], [[rigid('k'), meta(-1)]]);
    const above = store([], [[meta(-1), rigid('k')]]);
    return [termIn(below, meta(-1)) === 'J{k}' ? null : 'below',
      termIn(above, meta(-1)) === 'N' ? null : 'above'].filter(Boolean);
  };
  // A class holding a constant keeps it, whatever reaches it.
  const constantWrong = () => [[rigid('k'), 'J{k}'], [mark.N, 'N']]
    .filter(([constant, want]) => termIn(store([[-1, constant]],
      [[M, meta(-1)]]), meta(-1)) !== want).map(([, want]) => want);
  // M reaching a class wins over the rigid constants reaching it.
  const precedenceWrong = () => termIn(store([], [[rigid('k'), meta(-1)],
    [M, meta(-1)]]), meta(-1)) === 'M' ? [] : ['precedence'];
  // A planted graph whose class holds two constants: no term anywhere,
  // and readMarks faults with MarkClash.
  const clashWrong = () => {
    const pairs = [[meta(-1), mark.N], [meta(-1), M]];
    const terms = cases.Marks.leastOfGraph(pairs.map(([one, other]) =>
      cases.Tuple.create(one)(other)))([]);
    const item = handled();
    const found = cases.Marks.readMarks(terms)(item.problem)(item.checked)(
      item.trace);
    return [terms.clashes === 1 ? null : 'count',
      named(cases.Marks.termOf(terms)(mark.N)) === 'Nothing' ? null
        : 'term',
      named(found) === 'Left' && named(found.value0) === 'MarkClash' ? null
        : 'read'].filter(Boolean);
  };
  // A recorded Fail whose payload head is unknown, met by two live Fail
  // labels of one head, takes neither (§18.155 (3)); the known-head Fail
  // takes the first. Both matchers use EffectMatch's `candidateOf`.
  const takeFirstWrong = async () => {
    const E = await load('Domain.Recorded.Effect');
    const O = await load('Domain.Recorded.Origin');
    const Atom = await load('Domain.Recorded.Atom');
    const Core = await load('Domain.Type.Core');
    const Checked = await load('Domain.Checked.Internal');
    const Match = await load('Features.Check.Strategy.ReadBack.EffectMatch');
    const MarkMatch = await load(
      'Features.Check.Strategy.ReadBack.MarkMatch');
    const { Just } = await load('Data.Maybe');
    const { Row } = cases;
    const path = { root: O.InBody.value, steps: [] };
    const owner = 7;
    const failA = { effect: Row.FailEffect.value, args: [new E.MVar(
      new Atom.RigidVar(0))], mark: new E.At(new E.Literal(path)) };
    const failE = { effect: Row.FailEffect.value, args: [new E.MData(owner,
      [new E.MBase(Atom.IntBase.value)], [])],
    mark: new E.At(new E.Frame(path)) };
    const liveFail = (ty, at) => new Row.Label(Row.FailEffect.value,
      [new Core.TData(owner, [ty], [])], meta(at));
    const labels = [liveFail(Core.TInt.value, -1),
      liveFail(Core.TBool.value, -2)];
    const variable = new E.EffFresh(path, E.EffectOf.value);
    const recorded = { labels: [failA, failE], tail: new Just(variable) };
    const live = new Row.Row(labels, new Just(new Checked.Hole(1)));
    const none = cases.Sets.empty;
    const readings = MarkMatch.marksOfRow(recorded)(live).map(reading =>
      `${named(reading.value0)}:${reading.value1.value0}`);
    return [named(Match.candidateOf(labels)(none)(failA)) === 'Nothing'
      ? null : 'effect unknown head',
    Match.candidateOf(labels)(none)(failE).value0?.value0 === 0 ? null
      : 'effect known head',
    readings.join() === 'Frame:-1' ? null : `marks ${readings}`,
    Match.matchRow(recorded)(live).length === 0 ? null : 'effect tail'
    ].filter(Boolean);
  };
  return { takeFirstWrong, consoleWrong, sharedWrong, absentWrong,
    rigidWrong, apartWrong, unmarkedWrong, directionWrong, constantWrong,
    precedenceWrong, clashWrong };
};
