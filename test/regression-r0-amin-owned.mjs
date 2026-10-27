// R0 a-min tranche 1 regression probes for the owned clause rows C
// (Task 4), spread into test/regression-r0-amin.mjs. Each reads the
// recorded effects of a small program from the compiler under test.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const prelude = 'type E = E; effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; effect Ask { fn ask(): Unit; }; '
  + 'effect Box(a) { fn put(x: a): Unit; }; ';
const using = call => `fn use(): Unit = { let h = ${call}; () }; `
  + 'fn main(): Unit = ();';
const tails = rows => [rows.inference.tail, rows.clauses.Just[0].tail];
const same = rows => JSON.stringify(tails(rows)[0])
  === JSON.stringify(tails(rows)[1]);

// The one use's instance result handler rows, shaped.
const resultRows = async (context, mk, call) => {
  const { entries, fieldsOf } = await toolkit(context);
  const [[, sig]] = entries(fieldsOf(prelude + mk + using(call), 'use')
    .effects.instances);
  return sig.result.MHandler[1];
};
// The annotated lambda parameter's handler types' rows, in pre-order.
const annotated = async (context, annotation) => {
  const { entries, fieldsOf } = await toolkit(context);
  const found = fieldsOf(prelude + using(`fn(f: ${annotation}) => ()`),
    'use');
  const handlers = [];
  const walk = type => {
    if (type.MHandler) handlers.push(type.MHandler[1]);
    if (type.MArrow) { walk(type.MArrow[0]); walk(type.MArrow[2]); }
  };
  entries(found.effects.annotations).forEach(([, type]) => walk(type));
  return handlers;
};

export const ownedProbes = {
  // Task 4 (FX033 x1): H' counts the result outside R's tail, so a tail
  // occurring there is kept as C's tail, not replaced by ResultClauses.
  'r0-amin-resultc-occurs-result': async context => {
    const rows = await resultRows(context, 'fn mk(): Handler(Box(Unit -> '
      + 'Unit with ...s) with ...s) with pure = handler Box(Unit -> Unit '
      + 'with ...s) { put(x) => x(()) }; ', 'mk()');
    if (!same(rows)) fail('x1 instance C tail is '
      + `${JSON.stringify(tails(rows)[1])}, not R's tail`);
    passed(context);
  },
  // Task 4 (R1/R3): a closed R gives a closed C.
  'r0-amin-resultc-closed-stays-closed': async context => {
    const rows = await resultRows(context, 'fn mk(): Handler(Log with '
      + 'pure) with pure = handler Log { log(n) => () }; ', 'mk()');
    if (JSON.stringify(tails(rows)[1]) !== JSON.stringify({ Nothing: [] }))
      fail(`closed R gave C tail ${JSON.stringify(tails(rows)[1])}`);
    passed(context);
  },
  // Task 4: two sibling handler types in one annotation own distinct
  // clause tails (k is their pre-order index).
  'r0-amin-sibling-annotation-tails': async context => {
    const handlers = await annotated(context, 'Handler(nofail Ask with '
      + 'Log) -> Handler(nofail Tick with Log)');
    if (handlers.length !== 2) fail(`${handlers.length} handler types`);
    const [one, other] = handlers.map(rows => rows.clauses.Just[0].tail);
    if (JSON.stringify(one) === JSON.stringify(other))
      fail('two sibling handler types share one C tail');
    passed(context);
  }
};
