// Final review A-M1, A-M2: the matchers' and the annotation read's shape
// checks, shared by test/r0-t2-shapes.test.mjs and the restored-defect
// probes (test/regression-r0-t2-rows.mjs). Each check returns the names
// of the cases that differ, empty when all hold. Fixture-level.
import { rowsCases, sources, shape } from './r0-t2-rows-cases.mjs';

export const shapeChecks = async load => {
  const cases = await rowsCases(load);
  const { live, named, Maps, Row, Just } = cases;
  const { fields } = await load('Domain.Recorded');
  const E = await load('Domain.Recorded.Effect');
  const O = await load('Domain.Recorded.Origin');
  const Core = await load('Domain.Type.Core');
  const Checked = await load('Domain.Checked.Internal');
  const Match = await load('Features.Check.Strategy.ReadBack.EffectMatch');
  const MarkMatch = await load(
    'Features.Check.Strategy.ReadBack.MarkMatch');
  const Places = await load('Features.Check.Strategy.ReadBack.EffectPlaces');

  // One recorded row (a user label at a mark position, a variable tail)
  // and its live counterpart: matched, it gives one fact and one reading.
  const path = { root: O.InBody.value, steps: [] };
  const recordedRow = { labels: [{ effect: new Row.UserEffect(0), args: [],
    mark: new E.At(new E.Literal(path)) }],
  tail: new Just(new E.EffFresh(path, E.EffectOf.value)) };
  const liveRow = new Row.Row([new Row.Label(new Row.UserEffect(0), [],
    new Row.MarkMeta(3))], new Just(new Checked.Hole(1)));
  const recorded = (owner, args, rows) => new E.MData(owner, args, rows);
  const livePart = (owner, args, rows) => new Core.TData(owner, args, rows);
  // Each case's recorded and live data types, and whether they match.
  const dataCases = {
    same: [recorded(7, [], [recordedRow]), livePart(7, [], [liveRow]), true],
    owner: [recorded(7, [], [recordedRow]), livePart(8, [], [liveRow]),
      false],
    rows: [recorded(7, [], [recordedRow, recordedRow]),
      livePart(7, [], [liveRow]), false],
    arguments: [recorded(7, [recorded(9, [], [recordedRow])], []),
      livePart(7, [livePart(9, [], [liveRow]), Core.TInt.value], []), false]
  };
  const dataWrong = (matcher, kind) => Object.entries(dataCases).filter(
    ([, [one, other, matches]]) => (matcher(one)(other).length > 0)
      !== matches).map(([name]) => `${kind} ${name}`);
  // A-M1: MData meets TData only with one owner and equal lengths.
  const effectDataWrong = () => dataWrong(Match.matchTy, 'effect');
  const markDataWrong = () => dataWrong(MarkMatch.marksOfTy, 'marks');

  // A-M2: `annotated`'s annotation read at its own path gives facts; the
  // same type planted at a path that only ends in an index under the
  // lambda (`Lambda/args/0`) gives none, as no annotation would.
  const annotationWrong = () => {
    const item = live(sources.handlers, 'annotated');
    const effects = fields(item.problem).effects;
    const [[at, ty]] = cases.pairs(effects.annotations);
    const moved = { ...at, steps: [...at.steps.slice(0, -3),
      new O.Named('Lambda'), new O.Named('args'), new O.Index(0)] };
    const factsWith = annotations => JSON.stringify(shape(
      Places.locatedFacts({ ...effects, annotations })(item.checked)(
        item.trace)));
    const none = factsWith(Maps.empty);
    return [factsWith(Maps.singleton(at)(ty)) !== none ? null : 'kept',
      factsWith(Maps.singleton(moved)(ty)) === none ? null : 'moved',
      named(Places.locatedFacts(effects)(item.checked)(item.trace))
        === 'Right' ? null : 'read'].filter(Boolean);
  };
  return { effectDataWrong, markDataWrong, annotationWrong };
};
