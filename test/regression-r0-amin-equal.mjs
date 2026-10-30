// R0 a-min tranche 1 regression probes for Task 7's effect-only E1 sites,
// spread into test/regression-r0-amin.mjs.
import { markedSides, recordedTypes } from './r0-obligations-sides.mjs';
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const prelude = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Get(a) { fn get(): a; }; type E = E; ';
const o1 = `${prelude}fn main(): Unit with Console = with handler `
  + 'Get(Handler(Log with Console)) { get() => handler Log '
  + '{ log(n) => Fail.fail(E) } } { with Get.get() { Log.log(1) } };';
const o2 = `${prelude}fn main(): Unit with Console = { let h0 = `
  + 'handler Log { log(n) => () }; let h = with h0 { handler Log '
  + '{ log(n) => Fail.fail(E) } }; with h { Log.log(1) } };';

const recorded = async (context, source, role) => {
  const { fieldsOf } = await toolkit(context);
  return fieldsOf(source, 'main').effects.obligations.filter(item =>
    item.provenance.constructor.name === 'AtSite'
    && item.provenance.value0.role.constructor.name === role);
};

// A shaped marked type without marks, handler clauses or effect rows:
// what Generate/Elab/Recorded.purs records as the type. It is not
// canonical: it sorts record fields but not record tails. It is
// sufficient here because it only compares the two sides of one Sig3 E1
// in probe programs that write no record with two or more spread
// tails, so equal types erase to equal data.
const erased = mty => {
  const [name, fields] = Object.entries(mty)[0];
  switch (name) {
  case 'MArrow': return [name, erased(fields[0]), erased(fields[2])];
  case 'MRecord': return [name, fields[0].map(({ Tuple: [label, field] }) =>
    [label, erased(field)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  fields[1]];
  case 'MData': return [name, fields[0], fields[1].map(erased)];
  case 'MHandler': return [name, fields[0].effect,
    fields[0].args.map(erased)];
  default: return mty;
  }
};

export const equalProbes = {
  // A targeted check that Sig3's written marks survive: with the
  // body's type on both sides, no written Log mark is left in the right
  // side. On this program erasure is preserved, so the probe checks
  // marks, not erasure; the corpus test's reproduction of the defect
  // (dossier §18.120) failed through erasure, which is a different
  // check, and the marked-side check is r0-amin-equal-sig3-mark-only.
  'r0-amin-equal-sig3-marks': async context => {
    const source = `${prelude}fn mk(): Handler(Log with Console) = `
      + 'handler Log { log(n) => Console.print(n) }; '
      + 'fn main(): Unit = ();';
    const { fieldsOf } = await toolkit(context);
    const sides = fieldsOf(source, 'mk').effects.obligations.filter(item =>
      item.provenance.constructor.name === 'BesideAtom'
      && item.rule.constructor.name === 'SigRule'
      && item.rule.value0 === 3).map(item =>
      JSON.stringify(shape(item.value.value1)));
    if (!sides.some(text => text.includes('"Written"')))
      fail("Sig3's E1 right side lost the written result's marks");
    passed(context);
  },
  'r0-amin-equal-o1': async context => {
    if ((await recorded(context, o1, 'ClauseBody')).length === 0)
      fail('O1 (the clause body against the operation result) is not'
        + ' recorded');
    passed(context);
  },
  'r0-amin-equal-o2': async context => {
    if ((await recorded(context, o2, 'WithNode')).length !== 2)
      fail('O2 (the with node against its body) is not recorded');
    passed(context);
  },
  // Marks only: the corpus test's marked-side check
  // (r0-obligations-sides.mjs) over Sig3's E1. The sides' erasure is
  // checked first, so a defect that preserves erasure reaches the
  // marked-side message and one that does not reaches "differ".
  'r0-amin-equal-sig3-mark-only': async context => {
    const source = `${prelude}fn mk(): Handler(Log with Console) = `
      + 'handler Log { log(n) => Console.print(n) }; '
      + 'fn main(): Unit = ();';
    const { fieldsOf, load } = await toolkit(context);
    const Maps = await load('Data.Map.Internal');
    const Unfoldable = await load('Data.Unfoldable');
    const kit = {
      pairs: map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
        .map(pair => [shape(pair.value0), pair.value1]),
      pathOf: path => shape(path),
      erased: mty => JSON.stringify(erased(shape(mty))),
      marks: mty => JSON.stringify(shape(mty))
    };
    const { effects } = fieldsOf(source, 'mk');
    const recorded = recordedTypes(effects, kit);
    const found = { checked: 0, fresh: 0, problems: [] };
    const items = effects.obligations.filter(item =>
      item.provenance.constructor.name === 'BesideAtom'
      && item.rule.constructor.name === 'SigRule'
      && item.rule.value0 === 3);
    if (items.length === 0) fail('Sig3 records no E1');
    for (const item of items) {
      if (kit.erased(item.value.value0) !== kit.erased(item.value.value1))
        fail("Sig3's E1 sides differ in erasure");
      markedSides('mk', 'Sig3', shape(item.provenance.value1.path), item,
        recorded, found, kit);
    }
    if (found.checked === 0) fail('Sig3 has no side with a candidate');
    if (found.problems.length > 0) fail(found.problems[0]);
    passed(context);
  }
};
