// Tranche 2 Task 3 regression probes (the generation correction, design
// §B.2), spread into r0T2Probes (test/regression-r0-t2.mjs); the rows are
// in scripts/regression-r0-t2-generation.mjs. Each reads the recorded
// effects of design §B.4's `implicitRow` from the compiler under test.
import { fail, passed, shape, toolkit }
  from './regression-r0-amin-support.mjs';

const keyOf = JSON.stringify;
const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; '
  + 'fn implicitRow(): Unit with Tick = { '
  + 'let inst = fn(h: Handler(Log)) => with h { Log.log(1) }; '
  + 'inst(handler Log { log(n) => Tick.tick() }) }; '
  + 'fn main(): Unit = ();';
const lambda = { root: { InBody: [] }, steps: [{ Named: ['Block'] },
  { Named: ['items'] }, { Index: [0] }, { Named: ['Let'] },
  { Named: ['value'] }] };
const effectOf = { EffFresh: [lambda, { EffectOf: [] }] };

const effectsOf = async context => {
  const { entries, fieldsOf } = await toolkit(context);
  const effects = fieldsOf(source, 'implicitRow').effects;
  return { annotations: entries(effects.annotations),
    flexEff: shape(effects.flexEff) };
};

export const t2GenerationProbes = {
  // test/r0-t2-annotation-row.test.mjs's first case.
  'r0-t2-annotation-implicit-row': async context => {
    const { annotations } = await effectsOf(context);
    const tail = annotations[0]?.[1]?.MHandler?.[1].inference.tail;
    if (keyOf(tail) !== keyOf({ Just: [effectOf] }))
      fail(`implicit annotation row is not the lambda's EffectOf: `
        + keyOf(tail));
    passed(context);
  },
  // test/r0-marked-corpus.serial.test.mjs's "no position or effect
  // variable minted twice", on this one declaration.
  'r0-t2-annotation-minted-once': async context => {
    const minted = (await effectsOf(context)).flexEff.map(keyOf);
    const repeated = minted.filter((item, at) => minted.indexOf(item) < at);
    if (!minted.includes(keyOf(effectOf))) fail('EffectOf not minted');
    if (repeated.length > 0) fail(`minted twice: ${repeated.join(' ')}`);
    passed(context);
  }
};
