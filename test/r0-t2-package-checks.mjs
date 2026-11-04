// Tranche 2 Task 11: the package assembly's checks, shared by
// test/r0-t2-package.test.mjs and the restored-defect probes
// (test/regression-r0-t2-package.mjs). Each returns the names of the
// cases that differ, empty when all hold. Fixture-level.
import { packageCases, sources } from './r0-t2-package-cases.mjs';
import { shape } from './r0-t2-rows-cases.mjs';

export const packageChecks = async load => {
  const cases = await packageCases(load);
  const { live, effectsOf, packageOf, faultOf, holesOf, named, Maps } =
    cases;
  const { fields } = await load('Domain.Recorded');
  const Atom = await load('Domain.Recorded.Atom');
  const Merge = await load('Features.Check.Entailed.Merge');
  const Forced = await load('Features.Check.Strategy.Effects.Forced');
  const Convert = await load('Features.Check.Strategy.ReadBack.Convert');
  const Row = await load('Domain.Row');
  const Effect = await load('Domain.Recorded.Effect');
  const P = await load('Domain.Verdict.EffectPackage.Types');
  const Bound = await load('Features.Check.Strategy.ReadBack.Bound');
  const Images = await load('Features.Check.Strategy.ReadBack.Images');
  const Substitution = await load('Features.Check.Strategy.Substitution');
  const { Nothing } = await load('Data.Maybe');
  const { Tuple } = await load('Data.Tuple');
  const Either = await load('Data.Either');
  const Trace = await load('Features.Check.Trace');
  const text = value => JSON.stringify(value);
  const failing = (checks, item) => Object.entries(checks)
    .filter(([, check]) => !check(item)).map(([name]) => name);

  // An `Unsupported` problem is `Declined` with its kind, first.
  const declinedWrong = () => {
    const found = effectsOf(live(sources.unframed, 'main'));
    return faultOf(found) === 'Declined'
      && named(found.value0.value0) === 'UnframedInstall' ? [] : ['rigid'];
  };
  // Least terms holding a clash fault `MarkClash` before any row is read
  // (`logged`'s rows hold a user label, which no term would read).
  const clashWrong = () => {
    const item = live(sources.uses, 'logged');
    const marks = [new Tuple(new Row.MarkMeta(0), Row.NoFail.value),
      new Tuple(new Row.MarkMeta(0), Row.Plain.value)];
    const terms = cases.Least.leastOfGraph(marks)([]);
    const found = cases.Assembly.readEffectsWith(item.problem)(
      item.readBack)(item.checked)(terms)(item.trace);
    return faultOf(found) === 'MarkClash' ? [] : [faultOf(found)];
  };
  // services#main forces a tail; its package binds none (spec §3).
  const forcedWrong = () => {
    const item = live(sources.services, 'main');
    const forced = Forced.forcedTails(item.problem).map(each => each.forced);
    const found = effectsOf(item);
    if (forced.length === 0) return ['no forced tail'];
    if (faultOf(found) !== 'Right') return [faultOf(found)];
    const keys = cases.pairs(found.value0.effects).map(([key]) => text(key));
    return forced.filter(each => keys.includes(text(each))).map(() =>
      'bound');
  };
  // No hole number at two sorts in any fixture's package.
  const sortsWrong = () => cases.every().filter(item =>
    cases.sortClashes(packageOf(item)).length > 0).map(item => item.name);
  // One live meta, one number, in every map reading it: `w`'s Nil element
  // (hole 1) and handler row (hole 0) are each met in types and effects.
  const sharedWrong = () => {
    const found = effectsOf(live(sources.numbering, 'w'));
    if (faultOf(found) !== 'Right') return [faultOf(found)];
    const pkg = found.value0;
    return [0, 1].filter(n => text(cases.mapsOf(pkg, n))
      !== text(['effects', 'types'])).map(n => `hole ${n}`);
  };
  // Two metas, two numbers: `y`'s two partial uses' slot images.
  const distinctWrong = () => {
    const pkg = packageOf(live(sources.numbering, 'y'));
    const tails = holesOf(pkg).filter(each => each.map === 'types')
      .map(each => each.n);
    return tails.length === 2 && tails[0] !== tails[1] ? [] : ['y'];
  };
  const extensionWrong = () => cases.every().filter(item =>
    cases.extensionWrong(item) !== null).map(item => item.name);

  // `w` read under a planted θ binding hole `n` (σ substituted as step 2
  // would): the read, and the substituted σ.
  const plantedRead = (n, value) => {
    const item = live(sources.numbering, 'w');
    const theta = Maps.singleton(cases.Hole.holeVar(n))(value);
    const unsettled = Maps.mapMaybe(Atom.ordVar)(Merge.substitute(theta))(
      item.readBack.unsettled);
    return { item, found: effectsOf(item, cases.planted(item, n, value,
      unsettled)) };
  };
  const int = new Atom.Base(Atom.IntBase.value);
  // A hole θ binds reads bound on both sides: no hole 1 is left in types
  // or effects, and both hold `List(Int)` where `List(hole 1)` was.
  const thetaWrong = () => {
    const { found } = plantedRead(1, int);
    if (faultOf(found) !== 'Right') return [faultOf(found)];
    const listOfInt = value => text(shape(value)).includes(
      '{"PData":[0,[{"PBase":[{"IntBase":[]}]}],[]]}');
    const on = map => !holesOf(found.value0).some(each => each.n === 1
      && each.map === map) && cases.pairs(found.value0[map]).some(
      ([, value]) => listOfInt(value));
    return failing({ types: () => on('types'),
      effects: () => on('effects') });
  };
  // A binding the package cannot hold is `UnreadImage` on its hole: one
  // needing rows (an arrow), one naming a flexible problem variable, and
  // any binding of an effect-row hole (hole 0).
  const thetaFaultWrong = () => {
    const flexible = cases.pairs(fields(live(sources.numbering, 'w')
      .problem).vars).find(([variable, info]) =>
      named(info.quant) === 'Exists' && !cases.Hole.isHole(variable))[0];
    const planted = { arrow: [1, new Atom.Arrow(int, int)],
      flexible: [1, new Atom.TVar(flexible)], effectRow: [0, int] };
    return Object.entries(planted).filter(([, [n, value]]) => {
      const { found } = plantedRead(n, value);
      return !(faultOf(found) === 'UnreadImage' && text(found.value0
        .value0) === text(cases.Hole.holeVar(n)));
    }).map(([name]) => name);
  };
  // The first `Unsupported` in recorded order is the one declined: an
  // `OperationWithRow` planted before, then after, rigid's own.
  const declinedOrderWrong = () => {
    const item = live(sources.unframed, 'main');
    const own = item.problem.effects.obligations;
    const extra = { ...own.find(each => named(each.value) === 'Unsupported'),
      value: new Effect.Unsupported(new Effect.OperationWithRow(0, 1)) };
    const kindOf = obligations => {
      const problem = { ...item.problem, effects: { ...item.problem.effects,
        obligations } };
      const found = cases.Assembly.readEffects(problem)(item.readBack)(
        item.checked)(item.store)(item.trace);
      return faultOf(found) === 'Declined' ? named(found.value0.value0)
        : faultOf(found);
    };
    return [['before', [extra, ...own], 'OperationWithRow'],
      ['after', [...own, extra], 'UnframedInstall']].filter(([, list,
      kind]) => kindOf(list) !== kind).map(([name]) => name);
  };
  // A bound record tail in an effect row's label argument (no erasure
  // guard there) follows Merge `substitute`: a record merges in; a tail
  // bound to a variable, or a merge repeating a label, which Merge would
  // not substitute, is `UnreadImage` on the bound tail.
  const recordTailWrong = () => {
    const hole = cases.Hole.holeVar;
    const field = (label, ty) => new Tuple(label, ty);
    const pint = new P.PBase(Atom.IntBase.value);
    const read = value => Bound.boundRow({ bindings: Maps.singleton(5)(
      value), image: Images.rowFree(Maps.empty) })({ labels: [{ effect:
      Row.FailEffect.value, mark: P.TermN.value, args: [new P.PRecord({
      fields: [field('a', pint)], tails: [hole(5)] })] }],
    tail: Nothing.value });
    const unread = found => faultOf(found) === 'UnreadImage'
      && text(found.value0.value0) === text(hole(5));
    const merged = found => faultOf(found) === 'Right' && text(shape(
      found.value0.labels[0].args[0])) === text(shape(new P.PRecord({
      fields: [field('a', pint), field('b', pint)], tails: [hole(6)] })));
    return failing({
      variable: () => unread(read(new Atom.TVar(hole(6)))),
      repeated: () => unread(read(new Atom.Record([field('a', int)], []))),
      record: () => merged(read(new Atom.Record([field('b', int)],
        [hole(6)])))
    });
  };
  // A mark the injected terms do not read is an unread label.
  const unmarkedWrong = () => {
    const label = new Row.Label(new Row.UserEffect(0), [],
      new Row.MarkMeta(3));
    const found = Convert.convertRow(() => Nothing.value)(
      new Row.Row([label], Nothing.value));
    return named(found) === 'Left' ? [] : ['unread mark'];
  };
  // A partial call with an arrow result reads a package the trusted
  // validator accepts (final review A-I1); each failing declaration is
  // named with its read fault, or `refused`.
  const arrowResultWrong = () => ['part', 'piped'].flatMap(name => {
    const item = live(sources.arrowResult, name);
    const found = effectsOf(item);
    if (faultOf(found) !== 'Right') return [`${name}:${faultOf(found)}`];
    return named(Substitution.validate(item.problem)(found.value0))
      === 'Right' ? [] : [`${name}:refused`];
  });
  // R036 (2): a trace `finish` could not build is `TraceUnfinished`,
  // after `Declined` (a fact of the problem alone) and before
  // `MarkClash`.
  const traceOrderWrong = () => {
    const unfinished = new Either.Left(new Trace.Unnumbered(7));
    const declined = live(sources.unframed, 'main');
    const supported = live(sources.uses, 'logged');
    const marks = [new Tuple(new Row.MarkMeta(0), Row.NoFail.value),
      new Tuple(new Row.MarkMeta(0), Row.Plain.value)];
    const clashing = cases.Least.leastOfGraph(marks)([]);
    if (clashing.clashes === 0) return ['planted terms do not clash'];
    const withTerms = (item, terms) => cases.Assembly.readEffectsWith(
      item.problem)(item.readBack)(item.checked)(terms)(unfinished);
    return [['declined', faultOf(effectsOf(declined, undefined,
      unfinished)) === 'Declined'],
    ['unfinished', faultOf(effectsOf(supported, undefined, unfinished))
      === 'TraceUnfinished'],
    ['clash', faultOf(withTerms(supported, clashing)) === 'TraceUnfinished']]
      .filter(([, held]) => !held).map(([name]) => name);
  };
  return { traceOrderWrong, declinedWrong, declinedOrderWrong,
    recordTailWrong, clashWrong,
    forcedWrong, sortsWrong, sharedWrong, distinctWrong, extensionWrong,
    thetaWrong, thetaFaultWrong, unmarkedWrong, arrowResultWrong };
};
