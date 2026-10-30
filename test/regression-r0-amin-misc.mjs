// R0 a-min tranche 1 regression probes for Tasks 10 and 11, spread into
// test/regression-r0-amin.mjs. Each loads modules from the compiler under
// test only, through `context.compilerPath`.
import { describe, sources } from './r0-decide-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const log = 'effect Log { fn log(n: Int): Unit; }; ';
const work = `${log}fn work(): Unit with Log = { defer Log.log(1); () }; `
  + 'fn main(): Unit = ();';
const nested = `${log}fn work(): Unit with Log = `
  + '{ defer { defer Log.log(1); () }; () }; fn main(): Unit = ();';
const err = 'type Err = Oops; ';
const fails = `${err}fn a(): Int with Fail(Err) { fail } = fail(Oops); `
  + 'fn b(): Int = handle 1 { fail(error: Err) => 2 }; '
  + 'fn main(): Unit = ();';
const op = 'effect Op { fn op(n: Int): Int with Log; }; ';
const performs = `${log}${op}fn call(): Int with Op = Op.op(1); `
  + 'fn main(): Unit = ();';

const kinds = async (context, source, name, kind) => {
  const { fieldsOf } = await toolkit(context);
  return fieldsOf(source, name).effects.obligations.filter(item =>
    item.value.constructor.name === kind);
};
const expect = (holds, message) => holds || fail(message);

export const miscProbes = {
  'r0-amin-misc-defer': async context => {
    expect((await kinds(context, work, 'work', 'Defer')).length === 1,
      'a defer records no Defer obligation');
    passed(context);
  },
  'r0-amin-misc-defer-consumes': async context => {
    const found = await kinds(context, work, 'work', 'Consume');
    expect(found.some(item =>
      item.value.value0.site.constructor.name === 'AtDefer'),
    "a defer's deferred row is not consumed into the enclosing row");
    passed(context);
  },
  'r0-amin-misc-defer-enclosing': async context => {
    const { fieldsOf } = await toolkit(context);
    const effects = fieldsOf(work, 'work').effects;
    const [item] = await kinds(context, work, 'work', 'Defer');
    expect(item && JSON.stringify(shape(item.value.value0.enclosing))
      === JSON.stringify(shape(effects.signature.row)),
    "a defer's enclosing row is not the declared row");
    passed(context);
  },
  'r0-amin-misc-defer-nested': async context => {
    const found = await kinds(context, nested, 'work', 'Defer');
    const [outer, inner] = found.length === 2 ? found : [];
    const tail = inner && shape(inner.value.value0.enclosing).tail;
    expect(outer && JSON.stringify(tail) === JSON.stringify({ Just:
      [shape(outer.value.value0.row)] }),
    "a nested defer's enclosing row is not the outer d");
    passed(context);
  },
  'r0-amin-misc-fail-payload': async context => {
    expect((await kinds(context, fails, 'a', 'FailConcrete')).length === 1,
      'a fail expression records no FailConcrete');
    passed(context);
  },
  'r0-amin-misc-fail-clause': async context => {
    expect((await kinds(context, fails, 'b', 'FailConcrete')).length === 1,
      'a fail clause records no FailConcrete');
    passed(context);
  },
  'r0-amin-misc-entry-everywhere': async context => {
    expect((await kinds(context, fails, 'a', 'Entry')).length === 0,
      'a function other than main records an Entry');
    passed(context);
  },
  'r0-amin-misc-entry-missing': async context => {
    expect((await kinds(context, fails, 'main', 'Entry')).length === 1,
      'main records no Entry');
    passed(context);
  },
  'r0-amin-misc-unsupported': async context => {
    expect((await kinds(context, performs, 'call', 'Unsupported')).length
      === 1, 'a perform of an operation with a written row records no'
      + ' Unsupported obligation');
    passed(context);
  },
  'r0-amin-misc-operation-row': async context => {
    const { fieldsOf } = await toolkit(context);
    const effects = fieldsOf(performs, 'call').effects;
    expect(effects.obligations.some(item =>
      item.value.constructor.name === 'Unsupported'),
    'Resolve keeps no row for an operation that writes one');
    passed(context);
  },
  'r0-amin-misc-unchecked-block': async context => {
    const { load } = await toolkit(context);
    const stubs = await stubsFrom(load);
    const problem = stubs.recorded.problem(sources.fx032, 'g');
    const found = describe(stubs.decide(stubs.checking({
      strategies: [stubs.behaviours.accepting()] }), problem));
    expect(found.verdict.startsWith('Unresolved Unsupported'
      + ' EffectsUnchecked'),
    `FX032's accepted declaration is not Unresolved: ${found.verdict}`);
    passed(context);
  }
};
