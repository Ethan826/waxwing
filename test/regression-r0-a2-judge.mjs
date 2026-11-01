// A2 lane regression probes, dispatched through test/regression-r0-a2.mjs;
// the rows are in scripts/regression-r0-a2-judge.mjs. Each loads modules
// from the compiler under test only, through `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const effects = 'Features.Check.Strategy.Effects';

// Terms over rigid marks {k, l} from compact specs, and their meaning:
// N = 0, M = 1, `J S` the max over S, read at each valuation (the set of
// marks valued M); test/r0-a2-terms.test.mjs's oracle.
const termModules = async load => ({
  Term: await load(`${effects}.Term`),
  Types: await load('Domain.Verdict.EffectPackage'),
  Sets: await load('Data.Set'),
  foldable: (await load('Data.Foldable')).foldableArray,
  ord: (await load('Data.Ord')).ordString
});
const termOf = (M, spec) => spec === 'N' ? M.Types.TermN.value
  : spec === 'M' ? M.Types.TermM.value
    : new M.Types.TermJ(M.Sets.fromFoldable(M.foldable)(M.ord)(
      spec.slice(1)));
const specs = ['N', 'M', ['J'], ['J', 'k'], ['J', 'l'], ['J', 'k', 'l']];
const valuations = [[], ['k'], ['l'], ['k', 'l']].map(high => new Set(high));
const valueAt = (spec, high) => spec === 'N' ? 0 : spec === 'M' ? 1
  : spec.slice(1).some(name => high.has(name)) ? 1 : 0;
const below = (left, right) => valuations.every(high =>
  valueAt(left, high) <= valueAt(right, high));

// Settled types for E1 probes (test/r0-a2-equal.test.mjs): `Ask` is
// effect 0 and `Log` effect 1; a row closed or ending in rigid 0.
const equalModules = async load => {
  const Types = await load('Domain.Verdict.EffectPackage');
  const Row = await load('Domain.Row');
  const { Just, Nothing } = await load('Data.Maybe');
  const unit = new Types.PBase((await load('Domain.Recorded.Atom'))
    .UnitBase.value);
  const Equal = await load(`${effects}.Equal`);
  const { empty } = await load('Data.Map.Internal');
  const context = { package: { types: empty, rows: empty, effects: empty,
    marks: empty }, rigidMarks: [] };
  const label = (effect, mark) => ({ effect: new Row.UserEffect(effect),
    args: [], mark: mark === 'N' ? Types.TermN.value : Types.TermM.value });
  const row = (labels, rigid) => ({ labels, tail: rigid
    ? new Just(new Types.PTailRigid(0)) : Nothing.value });
  return {
    log: mark => label(1, mark),
    row,
    arrow: labels => new Types.PArrow(unit, row(labels, true), unit),
    ask: (inference, clauses) => new Types.PHandler(label(0, 'N'),
      { inference, clauses: clauses === null ? Nothing.value
        : new Just(clauses) }),
    same: (left, right) => Equal.samePTy(context)(left)(right)
      .constructor.name === 'Right'
  };
};

// Recorded rows with written marks, read under the empty package
// (test/r0-a2-consume.test.mjs): `Ask` effect 0, `Log` 1, `State` 2.
const consumeModules = async load => {
  const Effect = await load('Domain.Recorded.Effect');
  const Row = await load('Domain.Row');
  const Atom = await load('Domain.Recorded.Atom');
  const { Just, Nothing } = await load('Data.Maybe');
  const { empty } = await load('Data.Map.Internal');
  const Consume = await load(`${effects}.Consume`);
  const context = { package: { types: empty, rows: empty, effects: empty,
    marks: empty }, rigidMarks: [] };
  const base = name => new Effect.MBase(Atom[name].value);
  return {
    base,
    job: args => new Effect.MData(3, args, []),
    label: (effect, mark, args = []) => ({ effect: effect === 'Fail'
      ? Row.FailEffect.value : new Row.UserEffect(effect), args,
    mark: new Effect.Written(Effect[`Fixed${mark}`].value) }),
    row: (labels, rigid = null) => ({ labels, tail: rigid === null
      ? Nothing.value : new Just(new Effect.EffRigid(rigid)) }),
    judged: (kind, source, target, bare) => Consume.consumeCheck(context)(
      { site: Effect[kind].value, source, target, marks: true, bare })
  };
};

// Site records at one path under a package of the given marks, effects
// and types (test/r0-a2-sites.test.mjs): `Log` is effect 1.
const sitesModules = async load => {
  const [Effect, Types, Row, Atom, Hole, Maps, Origin, Foldable, Tuples,
    { Just, Nothing }, Sites] = await Promise.all(['Domain.Recorded.Effect',
    'Domain.Verdict.EffectPackage', 'Domain.Row', 'Domain.Recorded.Atom',
    'Domain.Recorded.Hole', 'Data.Map.Internal', 'Domain.Recorded.Origin',
    'Data.Foldable', 'Data.Tuple', 'Data.Maybe', `${effects}.Sites`].map(load));
  const map = (ord, pairs = []) => Maps.fromFoldable(ord)(
    Foldable.foldableArray)(pairs.map(([k, v]) => new Tuples.Tuple(k, v)));
  const written = (effect, mark) => ({ effect, args: [],
    mark: new Effect.Written(Effect[`Fixed${mark}`].value) });
  return { Effect, Types, Row, Hole, Just, Sites, written,
    closed: labels => ({ labels, tail: Nothing.value }),
    path: { root: Origin.InBody.value, steps: [] },
    int: new Types.PBase(Atom.IntBase.value),
    log: mark => written(new Row.UserEffect(1), mark),
    context: spec => ({ package: { types: map(Atom.ordVar, spec.types),
      rows: Maps.empty, effects: map(Effect.ordEVar, spec.effects),
      marks: map(Effect.ordPosition, spec.marks) }, rigidMarks: [] })
  };
};

export const a2JudgeProbes = {
  // Task 6: `J ∅` normalizes to N, so `J ∅ ⊑ N` holds.
  'r0-a2-norm': async context => {
    const M = await termModules(loader(context));
    if (!M.Term.holds(termOf(M, ['J']))(termOf(M, 'N')))
      fail('J ∅ ⊑ N fails: terms compared without normalization');
    passed(context);
  },
  // Task 6: `holds` agrees with every valuation on all 36 term pairs
  // over {k, l} (bounded).
  'r0-a2-holds-subset': async context => {
    const M = await termModules(loader(context));
    for (const left of specs) for (const right of specs)
      if (M.Term.holds(termOf(M, left))(termOf(M, right))
        !== below(left, right))
        fail('holds disagrees with every valuation at '
          + `${JSON.stringify(left)} ⊑ ${JSON.stringify(right)}`);
    passed(context);
  },
  // Task 6, statements §12.2 "E1 order": a key's labels keep row order.
  'r0-a2-row-order': async context => {
    const load = loader(context);
    const Rows = await load(`${effects}.Rows`);
    const Types = await load('Domain.Verdict.EffectPackage');
    const Row = await load('Domain.Row');
    const Atom = await load('Domain.Recorded.Atom');
    const { Nothing } = await load('Data.Maybe');
    const state = base => ({ effect: new Row.UserEffect(1),
      args: [new Types.PBase(base.value)], mark: Types.TermN.value });
    const shape = labels => JSON.stringify(Rows.grouped({ labels,
      tail: Nothing.value }).value0.keyed.map(pair => pair.value1.map(
      label => label.args[0].value0.constructor.name)));
    const ints = state(Atom.IntBase);
    const bools = state(Atom.BoolBase);
    if (shape([ints, bools]) === shape([bools, ints]))
      fail('E1 order lost: State(Int) + State(Bool) groups as its swap');
    passed(context);
  },
  // Task 7, statements §12.2 T3-a: an image's N nested in a row against
  // a written plain `Log` (M) is refused.
  'r0-a2-equal-marks': async context => {
    const E = await equalModules(loader(context));
    if (E.same(E.arrow([E.log('M')]), E.arrow([E.log('N')])))
      fail("E1 marks: an image's N equals a written M");
    passed(context);
  },
  // Task 7, attempt A: neither type owns a C, so R's marks count.
  'r0-a2-def41-c': async context => {
    const E = await equalModules(loader(context));
    if (E.same(E.ask(E.row([E.log('N')], true), null),
      E.ask(E.row([E.log('M')], true), null)))
      fail("attempt A accepted: R's N equals R's M without a C");
    passed(context);
  },
  // Task 7, attempt B: the ResultC's tail forged to ∅ against g's alias
  // tail r; whatever x is, one of the two `Equal`s refuses.
  'r0-a2-def41-d-tail': async context => {
    const E = await equalModules(loader(context));
    const r = E.row([], true);
    const resultC = E.ask(r, E.row([], false));
    const g = E.ask(r, null);
    const x = E.ask(r, E.row([], false));
    if (E.same(resultC, x) && E.same(g, x))
      fail('attempt B accepted: x owning C ∅ meets both sides');
    passed(context);
  },
  // Task 8, C10(a): the payload (j 1) fails before Definition 4.2's
  // exact count, so the failure is ordinary.
  'r0-a2-def42-last': async context => {
    const C = await consumeModules(loader(context));
    const state = payload => C.label(2, 'M', [C.base(payload)]);
    const found = C.judged('AtCallback', C.row([state('IntBase')], 0),
      C.row([C.label(1, 'M'), state('BoolBase')], 0), false);
    if (found.constructor.name !== 'Left' || found.value0.limit
      || found.value0.check !== 1)
      fail(`C10(a) reported as a limitation: ${JSON.stringify(found)}`);
    passed(context);
  },
  // Task 8, famw: `Fail(Job)` in C against `Fail(Job(Int))` in ρ.
  'r0-a2-installed-c-only': async context => {
    const C = await consumeModules(loader(context));
    const found = C.judged('AtInstalledC',
      C.row([C.label('Fail', 'N', [C.job([])])]),
      C.row([C.label('Fail', 'N', [C.job([C.base('IntBase')])])], 0), true);
    if (found.constructor.name !== 'Right')
      fail('famw refused at the installed-C site');
    passed(context);
  },
  // Task 8: `Log + ϱ` deferred into a closed `Log + Ask`: labels only.
  'r0-a2-labels-only': async context => {
    const C = await consumeModules(loader(context));
    const found = C.judged('AtDefer', C.row([C.label(1, 'M')], 4),
      C.row([C.label(1, 'M'), C.label(0, 'M')]), false);
    if (found.constructor.name !== 'Right')
      fail('AtDefer read a tail condition');
    passed(context);
  },
  // Task 9: a Console frame (N) whose C label's ρ partner is at M.
  'r0-a2-console-frame': async context => {
    const S = await sitesModules(loader(context));
    const frame = new S.Effect.Frame(S.path);
    const handler = new S.Effect.MHandler(
      S.written(S.Row.ConsoleEffect.value, 'N'),
      { inference: S.closed([]), clauses: new S.Just(S.closed([S.log('N')])) });
    const found = S.Sites.installCheck(S.context({
      marks: [[frame, S.Types.TermN.value]] }))(
      { frame, handler, ambient: S.closed([S.log('M')]) });
    if (found.constructor.name !== 'Left' || found.value0.check !== 1)
      fail(`Console frame skipped: ${JSON.stringify(found)}`);
    passed(context);
  },
  // Task 9: a clause row `Fail(Int)` under own-abort mark N.
  'r0-a2-own-abort': async context => {
    const S = await sitesModules(loader(context));
    const m = new S.Effect.Literal(S.path);
    const clause = new S.Effect.EffFresh(S.path, new S.Effect.Clauses(0));
    const found = S.Sites.handlerLitCheck(S.context({
      marks: [[m, S.Types.TermN.value]], effects: [[clause, S.closed([{
        effect: S.Row.FailEffect.value, args: [S.int], mark: S.Types.TermN
          .value }])]] }))(
      { m, inference: clause, clauses: clause, clauseRows: [clause] });
    if (found.constructor.name !== 'Left')
      fail('a Fail clause row asked no M ⊑ m');
    passed(context);
  },
  // Task 9, C6: a payload whose image is a hole settles to Int.
  'r0-a2-e9-key': async context => {
    const S = await sitesModules(loader(context));
    const payload = S.Hole.holeVar(2);
    const found = S.Sites.failConcreteCheck(S.context({
      types: [[payload, new S.Types.PVar(S.Hole.holeVar(1))]] }))(
      new S.Effect.MVar(payload));
    if (found.constructor.name !== 'Right')
      fail('E9 refused a hole payload before settling');
    passed(context);
  }
};
