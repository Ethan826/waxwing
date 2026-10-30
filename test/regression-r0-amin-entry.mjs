// R0 a-min regression probe for main's inferable top-level tail (§18.124
// ruling 2), spread into test/regression-r0-amin.mjs.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

export const entryProbes = {
  'r0-amin-entry-tail': async context => {
    const { fieldsOf } = await toolkit(context);
    const effects = fieldsOf('fn main(): Unit = ();', 'main').effects;
    const entry = effects.obligations.find(item =>
      item.value.constructor.name === 'Entry');
    const tail = entry && shape(entry.value.value0).tail.Just?.[0];
    if (!tail || !tail.EffFresh)
      fail("main's ambient row and Entry keep a rigid tail");
    passed(context);
  }
};
