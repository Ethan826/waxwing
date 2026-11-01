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
  }
};
