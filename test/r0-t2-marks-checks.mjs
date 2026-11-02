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
  return { consoleWrong, sharedWrong, absentWrong, rigidWrong, apartWrong,
    unmarkedWrong };
};
