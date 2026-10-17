// R001 final review C1 regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r001.mjs.
// Each uses only the compiler under test, passed in the context.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const outcome = (context, source) => {
  const result = context.compile(source);
  if (!(result instanceof context.Left)) return 'accepted';
  const wired = context.wire(result.value0);
  return `${wired.code} ${wired.message}`;
};

const print = 'fn main(): Unit with Console = Console.print(';
const state = 'effect State(s) { fn get(): s; fn put(x: s): Unit; }; ';
const bodies = [
  ['a', 'fn g(p: { ...r }): Int = { let f = fn(q: { a: Int, ...r }) => q; '
    + `0 }; ${print}g({ a: true }));`],
  ['x', 'type Holder(...r) = Holder({ x: Int, ...r }); fn g(p: { ...r }): '
    + 'Int = { let f = fn(h: Holder(...r)) => h; 0 }; '
    + `${print}g({ x: true }));`],
  ['n', `${state}fn run(p: { ...r }): Int = with handler State({ n: Int, `
    + '...r }) { get() => crash("x"), put(x) => () } { 0 }; '
    + `${print}run({ n: true }));`]
];

// The output directory of the compiler under test.
const loaded = (context, name) => import(pathToFileURL(resolve(
  dirname(context.compilerPath), '..', name, 'index.js')));

export const r001BodyProbes = {
  // A type in a body over a signature's `...r` names labels r may hold.
  'r001-body-lacks': context => {
    for (const [label, source] of bodies) {
      const found = outcome(context, source);
      if (found !== `E_TYPE r may already have field ${label}`) {
        fail(`body type over a signature tail: ${found}`);
      }
    }
    console.log(`${context.probe} regression detects the defect`);
  },
  // A label both written and in the tail's image is never lowered.
  'r001-record-guard': async context => {
    const { Just } = await loaded(context, 'Data.Maybe');
    const { Tuple } = await loaded(context, 'Data.Tuple');
    const { TInt } = await loaded(context, 'Domain.IR.Internal');
    const copy = await loaded(context, 'Features.Specialize.Copy');
    const layouts = await loaded(context, 'Features.Specialize.Layouts');
    const { recordType } = await loaded(context, 'Features.Specialize.Record');
    const pure = copy.applicativeCopy.pure;
    const image = layouts.internLayout([Tuple.create('a')(TInt.value)])(
      layouts.noLayouts);
    const origin = { offset: 0, line: 1, column: 1 };
    const row = { fields: [Tuple.create('a')(0)], tails: [0] };
    const lowering = recordType(() => () => pure(TInt.value))(
      () => pure(Just.create(image.ty)))({ start: origin, end: origin })(row);
    const result = copy.run(lowering)({ layouts: image.layouts });
    if (!(result instanceof context.Left)) {
      const { value, state } = result.value0;
      const labels = layouts.layoutFields(state.layouts)(value)
        .map(field => field.value0);
      fail('record guard: a label declared twice was lowered: '
        + `{ ${labels.join(', ')} }`);
    }
    console.log(`${context.probe} regression detects the defect`);
  }
};
