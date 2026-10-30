// R0 a-min tranche 1 regression probe for Task 8's stage consumptions,
// spread into test/regression-r0-amin.mjs.
import { repeated } from './r0-obligations-unique.mjs';
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const apply = 'fn main(): Int = { let k = fn(a: Int) => a; k(2) };';

export const consumeProbes = {
  'r0-amin-consume-stage-site': async context => {
    const { fieldsOf } = await toolkit(context);
    const stages = fieldsOf(apply, 'main').effects.obligations.filter(item =>
      item.value.constructor.name === 'Consume'
      && item.value.value0.site.constructor.name === 'AtApply');
    if (stages.length !== 1)
      fail('an Apply stage is not consumed into its ambient row');
    passed(context);
  },
  // §18.124 ruling 1: the pure-callback example, `fail` inside a lambda.
  'r0-amin-consume-fail': async context => {
    const { fieldsOf } = await toolkit(context);
    const source = 'type Err = Oops; fn run(f: Unit -> Int with pure): Int '
      + 'with pure = f(()); fn a(): Int with Fail(Err) { fail } = '
      + 'run(fn(u: Unit) => fail(Oops)); fn main(): Unit = ();';
    const failed = fieldsOf(source, 'a').effects.obligations.filter(item =>
      item.value.constructor.name === 'Consume'
      && item.value.value0.site.constructor.name === 'AtFail');
    if (failed.length !== 1)
      fail('fail does not consume Fail(payload) into its ambient row');
    passed(context);
  },
  // §18.124 ruling 3: the corpus test's all-kinds identity check on a
  // two-argument application, whose two stages differ only by ordinal.
  'r0-amin-consume-ordinal': async context => {
    const { fieldsOf } = await toolkit(context);
    const source = 'fn main(): Int = { let k = fn(a: Int, b: Int) => a;'
      + ' k(1, 2) };';
    const { obligations } = fieldsOf(source, 'main').effects;
    if (repeated(obligations, shape).length > 0)
      fail('two obligations share a provenance');
    passed(context);
  }
};
