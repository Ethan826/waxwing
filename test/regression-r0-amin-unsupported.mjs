// R0 a-min regression probes for the Unsupported restrictions (§18.124
// rulings 3 and 4), spread into test/regression-r0-amin.mjs.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const unresolved = `${log}effect Op { fn op(): Int with Nope; }; `
  + 'fn g(): Int with Op = Op.op(); fn main(): Unit = ();';
const unframed = `${log}fn f(b: Bool, h: Handler(Log)): Unit = `
  + '{ let k = if b then h else h; with k { Log.log(1) } }; '
  + 'fn main(): Unit = ();';

const unsupported = async (context, source, name) => {
  const { fieldsOf } = await toolkit(context);
  return fieldsOf(source, name).effects.obligations.filter(item =>
    item.value.constructor.name === 'Unsupported');
};

export const unsupportedProbes = {
  'r0-amin-unsupported-written': async context => {
    if ((await unsupported(context, unresolved, 'g')).length !== 1)
      fail('an unresolvable written row records no Unsupported');
    passed(context);
  },
  'r0-amin-unsupported-unframed': async context => {
    const found = await unsupported(context, unframed, 'f');
    if (!found.some(item =>
      item.value.value0.constructor.name === 'UnframedInstall'))
      fail('a with over a non-MHandler records no UnframedInstall');
    passed(context);
  }
};
