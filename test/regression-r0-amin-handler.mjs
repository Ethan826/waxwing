// R0 a-min regression probes for the handler family (Task 9), spread
// into test/regression-r0-amin.mjs. Each reads the recorded effects of
// the design note's separating example (or, for the block route, a
// literal as a block's result) from the compiler under test.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';
import { installProblems, key, literalProblems }
  from './r0-obligations-handled.mjs';

// Shaped values from records built apart differ in key order.
const keyOf = key;
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

// A shaped value with every `mark` field dropped. Erasure drops marks
// (test/r0-marked-erase.mjs), so two types equal here erase alike: a
// probe that compares this first fails only through the marked side.
const dropMarks = (name, found) =>
  (found && typeof found === 'object' && !Array.isArray(found)
    ? Object.fromEntries(Object.entries(found)
      .filter(([field]) => field !== 'mark'))
    : found);
const unmarked = value => (value === undefined ? value
  : JSON.parse(keyOf(value), dropMarks));

// The installed handler at `pWith` is the literal at `literal`'s type,
// marks aside, and its mark is `At (Literal literal)`.
const reaches = async (context, source, literal, pWith) => {
  const { entries, fieldsOf } = await toolkit(context);
  const nodes = new Map(entries(fieldsOf(source, 'main').effects.nodes)
    .map(([path, type]) => [keyOf(path), type]));
  const installed = nodes.get(keyOf({ ...pWith,
    steps: [...pWith.steps, { Named: ['With'] }, { Named: ['handler'] }] }));
  if (keyOf(unmarked(installed)) !== keyOf(unmarked(nodes.get(
    keyOf(literal)))))
    fail('the installed handler differs from the literal beyond its marks');
  const mark = installed?.MHandler?.[0].mark;
  if (keyOf(mark) !== keyOf({ At: [{ Literal: [literal] }] }))
    fail(`installed handler's mark is ${keyOf(mark)}, not At (Literal `
      + 'p_lit)');
  passed(context);
};

// Review 1 P1-1: a literal reaching its `with` as a block's result.
const routed = 'effect Log { fn log(n: Int): Unit; }; fn main(): Unit = '
  + '{ let h = { handler Log { log(n) => () } }; with h { Log.log(1) } };';

// A two-clause literal installed directly (the handler test's `direct`).
const direct = 'effect Ask { fn ask(): Int; fn tell(n: Int): Unit; }; '
  + 'fn main(): Int = with handler Ask { ask() => 1, tell(n) => () } '
  + '{ Ask.ask() };';

// The handler test's exact comparison of HandlerLit, Install and their
// consumptions, flags included, over `source`'s main.
const handledProblems = (entries, fieldsOf) => source => {
  const { effects } = fieldsOf(source, 'main');
  const keyed = map => new Map(entries(map)
    .map(([path, value]) => [keyOf(path), value]));
  const facts = { at: 'probe', effects, nodes: keyed(effects.nodes),
    ambient: keyed(effects.ambient),
    found: { literals: 0, installs: 0, framed: 0 } };
  return [...literalProblems(facts), ...installProblems(facts)];
};

export const handlerProbes = {
  // R9 A2: the installed handler is the literal's type, its mark
  // `At (Literal p_lit)`, through a `let`.
  'r0-amin-literal-reaches-use': context =>
    reaches(context, separating, pLit, pWith),
  // The same through a block's result (Block.purs `marked:
  // final.marked`).
  'r0-amin-literal-block-route': context => reaches(context, routed,
    bodyPath('Block', 'items', 0, 'Let', 'value', 'Block', 'result'),
    bodyPath('Block', 'result')),
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
  // Review 2 P2-2: the records match exactly, `marks` and `bare`
  // included, so a flipped flag fails.
  'r0-amin-handler-exact': async context => {
    const { entries, fieldsOf } = await toolkit(context);
    const problems = [separating, direct]
      .flatMap(handledProblems(entries, fieldsOf));
    if (problems.length > 0)
      fail(`handler records differ: ${problems[0].slice(0, 300)}`);
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
