// R0 a-min tranche 1 regression probes for Task 7's effect-only E1 sites,
// spread into test/regression-r0-amin.mjs.
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

export const equalProbes = {
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
  'r0-amin-equal-sig3-marks': async context => {
    const source = `${prelude}fn mk(): Handler(Log with Console) = `
      + 'handler Log { log(n) => Console.print(n) }; '
      + 'fn main(): Unit = ();';
    const { fieldsOf } = await toolkit(context);
    const sides = fieldsOf(source, 'mk').effects.obligations.filter(item =>
      item.provenance.constructor.name === 'BesideAtom'
      && item.rule.value0 === 3).map(item =>
      JSON.stringify(shape(item.value.value1)));
    if (!sides.some(text => text.includes('"Written"')))
      fail("Sig3's E1 right side lost the written result's marks");
    passed(context);
  }
};
