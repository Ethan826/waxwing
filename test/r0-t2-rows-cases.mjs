// Tranche 2 Task 8 (design §C.1-§C.2, §D, §E; dossier §18.155 (3),
// (8)): the effect-row read-back's fixtures and helpers, shared by
// test/r0-t2-rows.test.mjs and the restored-defect probes
// (test/regression-r0-t2-rows.mjs). `rowsCases(load)` takes a module
// loader, so a probe reads the compiler under test only. Fixture-level.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const research = name => readFileSync(join(root, 'research', name), 'utf8');

export const sources = {
  uses: `effect Log { fn log(n: Int): Unit; };
type Opt(a) = No | Some(a);
fn one(u: Unit): Int with Log = { Log.log(1); 1 };
fn run(cb: Unit -> Int with ...e): Int with ...e = cb(());
fn add(x: Int, y: Int): Int = x + y;
fn inc(x: Int): Int with Log = { Log.log(x); x + 1 };
fn call(): Int with Log = run(one);
fn made(): Opt(Int) = Some(1);
fn part(): Int -> Int = add(1);
fn applied(): Int = { let f = add; f(1, 2) };
fn piped(): Int with Log = 1 |> inc;
fn logged(): Int with Log = { let f = inc; f(1) };
fn lam(): Int = { let g = fn(x: Int, y: Int) => x + y; g(1, 2) };
fn main(): Unit with Console = Console.print(1);
`,
  handlers: `effect Log { fn log(n: Int): Unit; };
effect Tick { fn tick(): Unit; };
type Job(a, ...effects) = Job(Int -> a with ...effects);
fn handled(): Unit with Tick =
  with handler Log { log(n) => Tick.tick() } { Log.log(1) };
fn deferred(): Unit with Console = { defer Console.print(1); () };
fn annotated(): Unit = {
  let k = fn(h: Handler(Log)) => with h { Log.log(1) }; () };
fn failing(): Unit = {
  let v = handler Log { log(n) => Fail.fail("no") }; () };
fn job(): Int = match Job(fn(n: Int) => n) { Job(f) => f(1) };
fn main(): Unit with Console = Console.print(1);
`,
  // A main whose entry tail meets nothing else, beside another hole.
  lone: `fn add(x: Int, y: Int): Int = x + y;
fn main(): Unit with Console = { let p = add(1); Console.print(1) };
`,
  services: readFileSync(join(root, 'examples/services.wxw'), 'utf8'),
  builtins: research('t2-read-back-design/examples/builtins.wxw.txt'),
  over: research('t2-read-back-review/over-applied.wxw.txt')
};

export const spanOf = (source, text, nth = 0) => {
  let at = -1;
  for (let seen = 0; seen <= nth; seen += 1) at = source.indexOf(text, at + 1);
  if (at < 0) throw new Error(`no ${text} in the source`);
  return `${at}-${at + text.length}`;
};

const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${result.value0?.constructor.name}`);
  return result.value0;
};
const named = value => value.constructor.name;

export const rowsCases = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const { fields } = await load('Domain.Recorded');
  const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
  const Rows = await load('Features.Check.Strategy.ReadBack.EffectRows');
  const Package = await load('Domain.Verdict.EffectPackage.Types');
  const Row = await load('Domain.Row');
  const Maps = await load('Data.Map.Internal');
  const Tuple = await load('Data.Tuple');
  const { ordInt } = await load('Data.Ord');
  const keyOrd = Tuple.ordTuple(ordInt)(ordInt);
  const Sets = await load('Data.Set');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);

  // A stub for Task 9's least terms: N, M, J {k}, and M for a meta.
  const stub = mark => {
    switch (named(mark)) {
    case 'NoFail': return Package.TermN.value;
    case 'MarkVariable': return new Package.TermJ(Sets.singleton(
      mark.value0));
    default: return Package.TermM.value;
    }
  };

  // The named declaration's problem, checked declaration and trace.
  const live = (source, name) => {
    const program = right(resolve(right(parse(source), 'parse')),
      'resolve');
    const decl = program.functions.find(item => item.name === name);
    const { tables, signatures } = Inputs.generationInputs(program);
    const problem = Elaborating.problem(right(Generate.generate(tables)(
      signatures)(decl), 'generate'));
    const found = right(Function.recheck(functional(program.ctors))(
      program)(decl), 'recheck');
    return { source, problem, checked: found.function, trace: found.trace };
  };
  const read = (item, trace = item.trace, terms = stub) =>
    Rows.readRows(terms)(item.problem)(item.checked)(trace);

  // The source text of the node a variable's path names ('' at a root).
  const textOf = (item, variable) => {
    const { root: at, steps } = variable.value0;
    if (named(at) !== 'InBody') return '';
    const found = Walk.nodeAt(new Walk.AtExpr(item.checked.body))(steps);
    if (named(found) !== 'Just') return '?';
    const span = found.value0.value0.value0.span;
    return item.source.slice(span.start.offset, span.end.offset);
  };
  const roleOf = variable => (named(variable) === 'EffFresh'
    ? named(variable.value1) : named(variable));
  // The variables of `role` whose node's text starts with `text` (any
  // node when `text` is null), and whose stage is `stage` when given.
  const varsOf = (item, role, text, stage) => fields(item.problem).effects
    .flexEff.filter(v => roleOf(v) === role
      && (text === null || textOf(item, v).startsWith(text))
      && (stage === undefined || v.value1.value0 === stage));
  // The trace entry a Stage variable at an Apply or Pipe reads.
  const consumedOf = (item, variable) => {
    const found = Walk.nodeAt(new Walk.AtExpr(item.checked.body))(
      variable.value0.steps).value0.value0.value0;
    const key = span => Tuple.Tuple.create(span.start.offset)(
      span.end.offset);
    if (named(found.node) === 'Pipe') return Maps.lookup(keyOrd)(key(
      found.node.value0.value0.span))(item.trace.piped);
    const argument = found.node.value1[variable.value1.value0].value0.span;
    return Maps.lookup(Tuple.ordTuple(keyOrd)(keyOrd))(
      Tuple.Tuple.create(key(found.span))(key(argument)))(item.trace.applied);
  };
  const same = (a, b) => JSON.stringify(shape(a)) === JSON.stringify(
    shape(b));
  const valueOf = (map, variable) => pairs(map).find(([key]) =>
    same(key, variable))?.[1];

  // A package row as text: `[Log@M Fail(Text)@N|hole]`.
  const termText = term => (named(term) === 'TermJ'
    ? `J${JSON.stringify(Sets.toUnfoldable(unfoldableArray)(term.value0))}`
    : named(term).slice(4));
  const labelText = label => `${effectText(label.effect)}`
    + `${label.args.length > 0 ? `(${label.args.map(named).join(',')})`
      : ''}@${termText(label.mark)}`;
  const effectText = effect => (named(effect) === 'UserEffect'
    ? 'User' : named(effect).replace('Effect', ''));
  const tailText = tail => (named(tail) === 'Nothing' ? 'closed'
    : named(tail.value0) === 'PTailHole' ? 'hole'
      : `rigid:${tail.value0.value0}`);
  const rowText = row => `[${row.labels.map(labelText).join(' ')}|`
    + `${tailText(row.tail)}]`;
  return { live, read, varsOf, valueOf, rowText, pairs, stub, same, named,
    consumedOf, keyOrd, Tuple, Row, Package, Maps };
};

// A value as plain data, for comparing PureScript values.
export const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  if (value.constructor === Object) return Object.fromEntries(
    Object.keys(value).map(name => [name, shape(value[name])]));
  return { [value.constructor.name]: Object.keys(value)
    .map(name => shape(value[name])) };
};
