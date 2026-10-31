// R0 a-min regression probes for the handler family (Task 9), spread
// into test/regression-r0-amin.mjs. Each reads the recorded effects of
// the design note's separating example from the compiler under test.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

// Shaped values from records built apart differ in key order.
const keyOf = value => JSON.stringify(value, (name, found) =>
  (found && typeof found === 'object' && !Array.isArray(found)
    ? Object.fromEntries(Object.keys(found).sort()
      .map(field => [field, found[field]]))
    : found));
const bodyPath = (...steps) => ({ root: { InBody: [] },
  steps: steps.map(step => (typeof step === 'number'
    ? { Index: [step] } : { Named: [step] })) });

// docs/plans/2026-10-30-task-9-literal-design.md §2.
const separating = 'type E = E; effect Log { fn log(n: Int): Unit; }; '
  + 'fn pass(h: Handler(Log with Fail(E))): Handler(Log with Fail(E)) = h; '
  + 'fn main(): Unit with Console = { let h = handler Log { log(n) => '
  + 'Fail.fail(E) }; let g = pass(h); with h { defer Log.log(1); () } };';
const pLit = bodyPath('Block', 'items', 0, 'Let', 'value');
const pWith = bodyPath('Block', 'result');

// The declaration's atom-free obligations at `path`, shaped.
const sitedAt = (effects, path) => effects.obligations
  .map(item => [shape(item.provenance).AtSite?.[0], shape(item.value)])
  .filter(([site]) => site && keyOf(site.path) === keyOf(path));

export const handlerProbes = {
  // R9 A2: the installed handler is the literal's type, its mark
  // `At (Literal p_lit)`.
  'r0-amin-literal-reaches-use': async context => {
    const { entries, fieldsOf } = await toolkit(context);
    const nodes = new Map(entries(fieldsOf(separating, 'main').effects.nodes)
      .map(([path, type]) => [keyOf(path), type]));
    const installed = nodes.get(keyOf(bodyPath('Block', 'result', 'With',
      'handler')));
    const mark = installed?.MHandler?.[0].mark;
    if (keyOf(mark) !== keyOf({ At: [{ Literal: [pLit] }] }))
      fail(`installed handler's mark is ${keyOf(mark)}, not At (Literal `
        + 'p_lit)');
    passed(context);
  },
  // E4: HandlerLit at the literal, and its one clause's two
  // consumptions (into R, into C).
  'r0-amin-handler-lit': async context => {
    const { fieldsOf } = await toolkit(context);
    const here = sitedAt(fieldsOf(separating, 'main').effects, pLit);
    if (!here.some(([, value]) => value.HandlerLit))
      fail('no HandlerLit at the literal');
    const sites = here.map(([site]) => site.role.Consumed?.[0])
      .filter(site => site?.ClauseIntoR || site?.ClauseIntoC);
    if (sites.length !== 2)
      fail(`clause consumptions at the literal: ${sites.length}, not 2`);
    passed(context);
  },
  // E5: InstallR (R into ρ, marks ignored) at a `with` over an MHandler.
  'r0-amin-install-r': async context => {
    const { fieldsOf } = await toolkit(context);
    const here = sitedAt(fieldsOf(separating, 'main').effects, pWith);
    if (!here.some(([site, value]) => site.role.Consumed?.[0].InstallR
      && value.Consume?.[0].marks === false))
      fail('no InstallR at an MHandler with');
    passed(context);
  }
};
