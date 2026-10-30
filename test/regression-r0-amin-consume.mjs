// R0 a-min tranche 1 regression probe for Task 8's stage consumptions,
// spread into test/regression-r0-amin.mjs.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

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
  }
};
