// A2 Task 13: the M-B differential's further exercised inputs (used by
// test/r0-a2-mb.test.mjs). Tasks 7-9's packages (test/r0-a2-equal,
// -consume and -sites .test.mjs), each the test's own partial package
// laid over Task 11's honest defaults (`honest`: types Unit, rows
// closed, terms N) so it is a whole package; cases that judge a
// hand-built record or two bare types have no declaration and are not
// here. Task 10's cases (C1, C15, C16) are Task 11's sources and
// packages, already in `validateList`; its own tests judge Dep, not a
// package. Then a failing handler (E4's and E5's edges on an accepted
// package), a ResultC against an annotation (Definition 4.1(d), its C
// closed and holding `Log`) and
// rigid-mark cases, so valuations beyond the one empty one run. Every
// case is [name, problem, input].
import { packageOf } from './r0-a2-package.mjs';

const label = (effect, mark, args = []) => ({ effect, args, mark });
const row = (labels, tail = null) => ({ labels, tail });
const arrow = (labels, tail) => ({ arrow: ['Unit', row(labels, tail),
  'Unit'] });
const ask = (inference, clauses) =>
  ({ handler: [label(0, 'N'), { inference, clauses }] });
const failE = label('Fail', 'N', [{ data: [0, [], []] }]);
const askLog = 'effect Ask { fn ask(): Unit; };\n'
  + 'effect Log { fn log(n: Int): Unit; };\n';
const equalSource = source => `${askLog}${source}\nfn main(): Int = 0;`;
const consumeSource = source => `${askLog}effect State(s) { fn get(): s; `
  + `fn put(value: s): Unit; };\n${source}\nfn main(): Int = 0;`;
const sitesSource = source => `${askLog}type E = E;\n${source}`;
const lastStep = path => path.steps[path.steps.length - 1].value0;

export const laneList = cases => {
  const { Maps, Atom, Effect } = cases;
  const over = (problem, spec) => {
    const lane = packageOf(spec);
    const base = cases.honest(problem);
    const union = (ord, key) => Maps.union(ord)(lane[key])(base[key]);
    return { types: union(Atom.ordVar, 'types'),
      rows: union(Atom.ordVar, 'rows'),
      effects: union(Effect.ordEVar, 'effects'),
      marks: union(Effect.ordPosition, 'marks') };
  };
  const family = (name, source, decl, specs) => {
    const problem = cases.problemOf(source, decl);
    const effects = problem.effects;
    return specs(effects).map((spec, index) =>
      [`${name} ${index}`, problem, over(problem, spec)]);
  };
  const at = (effects, index) => effects.obligations[index].value;
  const flexAt = (effects, role, step) => effects.flexEff.find(variable =>
    variable.value1.constructor.name === role
    && lastStep(variable.value0) === step);
  const openedAt = (effects, step) => effects.positions.find(position =>
    position.constructor.name === 'Opened'
    && lastStep(position.value0) === step);
  const attemptB = effects => {
    const r = { rigid: at(effects, 5).value0.value1.inference.tail.value0
      .value0 };
    const alias = row([], r);
    const spec = (resultTail, x) => ({ types: [4, 5].map(index =>
      [at(effects, index).value1.value0, x]),
    effects: [[flexAt(effects, 'EffInst', 'then'), alias],
      [flexAt(effects, 'ResultClauses', 'then'), row([], resultTail)]],
    marks: [[openedAt(effects, 'then'), 'N']] });
    return [...[row([]), alias, null].map(clauses =>
      spec(null, ask(alias, clauses))),
    ...[alias, null].map(clauses => spec(r, ask(alias, clauses)))];
  };
  const stateM = [label(2, 'M', ['Int'])];
  const c = 'fn c(): Int with Log = with handler State(Int) { get() => 1, '
    + 'put(v) => () } { Log.log(1); State.get() };';
  const lit = 'fn c(): Int with Log = with handler Ask '
    + '{ ask() => Fail.fail(E) } { Ask.ask(); 1 };\nfn main(): Int = 0;';
  const logCall = 'fn g(h: Unit -> Unit with Log): Unit with Log = h(());';
  const rigid = effects => [{ marks: effects.positions.map(position =>
    [position, ['J', ...effects.rigidMarks]]) }];
  return [
    ...family('T7 E1 marks', equalSource('fn id(x: a): a = x;\nfn f(h: Unit '
      + '-> Unit with Log): Unit with pure = { let k = id(h); () };'), 'f',
    effects => ['N', 'M'].map(mark => ({ types: [[at(effects, 1).value1
      .value0, arrow([label(1, mark)], { rigid: at(effects, 1).value0
      .value1.tail.value0.value0 })]], effects: [[effects.flexEff[0],
      row([])]] }))),
    ...['nofail Log', 'Log'].flatMap(h2 => family(`T7 attempt A ${h2}`,
      equalSource('fn f(h: Handler(nofail Ask with Log)): Unit with Log = '
        + `with h { Ask.ask() };\nfn g(h2: Handler(nofail Ask with ${h2}))`
        + ': Unit with Log = f(h2);'), 'g', effects => [{ effects: [[
        effects.flexEff[0], row([], { rigid: at(effects, 1).value0.value1
          .inference.tail.value0.value0 })]] }])),
    ...family('T7 attempt B', equalSource('fn mk(): Handler(nofail Ask '
      + 'with ...s) with pure = handler Ask { ask() => () };\nfn run(b: '
      + 'Bool, g: Handler(nofail Ask with ...r)): Unit with ...r = { let h '
      + '= if b then mk() else g; with h { defer Ask.ask(); () } };'), 'run',
    attemptB),
    ...['Bool', 'Int'].flatMap(payload => family(`T8 C10 ${payload}`,
      consumeSource('fn w(h: Unit -> Unit with State(Int)): Unit with Log '
        + `+ State(${payload}) = h(());`), 'w', effects => [{ effects: [[
        effects.flexEff[0], row(stateM, { rigid: 0 })]] }])),
    ...family('T8 N4 p1', consumeSource('fn st(h: Handler(State(Int))): Int'
      + ' with Log = with h { State.get() };'), 'st', () => [{}]),
    ...family('T8 closed R', consumeSource(c), 'c', effects => [row([]),
      row([], { rigid: 0 }), row([label(1, 'N')])].map(r =>
      ({ effects: [[effects.flexEff[0], r]] }))),
    ...family('T8 E2 payloads', consumeSource('fn g(h: Unit -> Unit with '
      + 'State(Int)): Unit with State(Bool) = h(());'), 'g', effects => [{
      effects: [[effects.flexEff[0], row(stateM, { rigid: 0 })]] }]),
    ...family('T8 F7', consumeSource('fn g(h: Unit -> Unit with Log): '
      + 'Unit with Log + Ask = h(());'), 'g', effects => ['M', 'N'].map(
      mark => ({ effects: [[effects.flexEff[0], row([label(1, mark)])]] }))),
    ...family('T8 unread', consumeSource(logCall), 'g', () => [{}]),
    ...family('T9 own abort', sitesSource(lit), 'c', effects => [
      [row([failE]), 'N'], [row([failE]), 'M'], [row([], { rigid: 0 }), 'N'],
      [row([label(1, 'M')]), 'N']].map(([clauseRow, own]) => ({
      effects: [[effects.flexEff[3], clauseRow]],
      marks: [[effects.positions[0], own]] }))),
    ...family('T9 install', sitesSource(lit), 'c', effects => [
      [row([], { rigid: 0 }), 'N'], [row([], { rigid: 0 }), 'M'],
      [row([], { rigid: 5 }), 'M'], [row([label(1, 'N')]), 'N'],
      [row([label(1, 'N')]), 'M'], [row([label(0, 'N')]), 'M']].map(
      ([cRow, frame]) => ({ effects: [[effects.flexEff[1],
        row([label(1, 'M')])], [effects.flexEff[2], cRow]],
      marks: [[effects.positions[0], 'N'], [effects.positions[1], frame]] }))),
    ...family('T9 defer', sitesSource('fn work(): Unit with Log = '
      + '{ defer Log.log(1); () };\nfn main(): Int = 0;'), 'work', effects =>
      [row([label(1, 'M')]), row([label(1, 'N')]), row([failE]),
        row([], { rigid: 0 })].map(d => ({ effects: [[effects.flexEff[1],
        d]] }))),
    ...family('T9 entry', sitesSource('fn main(): Unit with Log = '
      + 'Log.log(1);'), 'main', effects => [row([]),
      row([label('Console', 'N')])].map(r => ({ effects: [[
      effects.flexEff[0], r]] }))),
    ...family('T9 E9', sitesSource('fn k(): Unit with Fail(E) = { let go = '
      + 'fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;'), 'k', effects =>
      [{ var: { hole: 1 } }, { var: { rigid: 0 } }, { data: [0, [], []] }]
        .map(image => ({ types: [[at(effects, 1).value0.value0, image]] }))),
    // A failing handler installed where the ambient row has Fail(E):
    // R, C and c_0 hold Fail(E), the literal's mark and the frame M.
    ...family('failing handler', sitesSource('fn h(): Unit with Fail(E) = '
      + 'with handler Ask { ask() => Fail.fail(E) } { Ask.ask() };\n'
      + 'fn main(): Int = 0;'), 'h', effects => [{ effects: [1, 2, 3].map(
      index => [effects.flexEff[index], row([failE])]),
    marks: effects.positions.map(position => [position, 'M']) }]),
    // mk()'s ResultC (owned C) against take's annotation C: one `Equal`
    // under Definition 4.1(d).
    ...['', 'Log + '].flatMap(written => family(`owned C ${written}`,
      equalSource(`fn mk(): Handler(nofail Ask with ${written}...s) with `
        + `pure = handler Ask { ask() => ${written ? 'Log.log(1)' : '()'} };`
        + `\nfn take(h: Handler(nofail Ask with ${written}...s)): Unit = ();`
        + '\nfn use(): Unit = take(mk());'), 'use', () => [{}])),
    ...family('rigid call J', equalSource('fn f(): Unit with nofail(k) Log '
      + '= Log.log(1);\nfn g(): Unit with nofail(j) Log = f();'), 'g',
    rigid),
    ...family('rigid pass J', equalSource('fn pass(n: Int): Unit with '
      + 'nofail(k) Log = if n == 0 then Log.log(0) else pass2(n + -1);\n'
      + 'fn pass2(n: Int): Unit with nofail(k) Log = pass(n);'), 'pass', rigid),
    ...family('rigid two', equalSource('fn f(): Unit with nofail(a) Log + '
      + 'nofail(b) Ask = Log.log(1);\nfn g(): Unit with nofail(a) Log + '
      + 'nofail(b) Ask = f();'), 'g', effects => [{ marks: effects.positions
      .map(position => [position, ['J', position.value1]]) }])
  ];
};
