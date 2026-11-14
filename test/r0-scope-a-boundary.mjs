// Scope A's boundary checks (U3 end to end, exposure per shape,
// requirement definedness, the ground rule's kind), split from
// test/r0-scope-a-checks.mjs, which aggregates them.

const named = value => value.constructor.name;

export const boundaryChecks = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Maps = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const int = new Atom.Base(Atom.IntBase.value);

  // ---- The boundary end to end (U3 as revised, §18.200): each
  // out-of-scope shape stays out of Solved and names
  // `Outside DataApplication`; the in-scope control is Solved; the two
  // protected fixtures keep their reason and accepted attempt; and with
  // every marker removed from the recorded problem, the exposure check
  // alone still blocks Solved where the candidate exposes a shape.
  const { onlineFrom } = await import('./r0-online-support.mjs');
  const { describe } = await import('./r0-decide-support.mjs');
  const online = await onlineFrom(load);
  const log = 'effect Log { fn log(n: Int): Unit; };';
  const tick = 'effect Tick { fn tick(): Unit; };';
  const list = 'type L(a) = N | C(a, L(a));';
  const main = 'fn main(): Int = 0;';
  const outside = [
    ['R1', [log, tick, 'type Job(...e) = Job(Unit -> Unit with ...e);',
      'fn f(j: Job(Log)): Job(Tick) = j;']],
    ['R4', [log, tick, 'type W(a) = W(a, Unit -> Unit with Log);',
      'fn f(g: Unit -> Unit with Tick): W(Int) = W(1, g);']],
    ['R5', [log, tick, list,
      'fn f(x: L(Unit -> Unit with Log)): L(Unit -> Unit with Tick) = x;']],
    ['R6', ['type Box(a) = Box(a -> a);',
      'fn f(b: Box(Int)): Text = show(b);']],
    ['holder base', [list, 'type F = F(Unit -> Unit);',
      'fn f(x: L(F)): L(F) = x;']],
    ['record argument', [list, 'fn f(x: L({ y: Int })): L({ y: Int }) = x;']],
    ['transitive record tail', [list, 'type R(...r) = R({ x: Int, ...r });',
      'type N0 = N0(R({ y: Int }));', 'fn f(x: L(N0)): L(N0) = x;']],
    ['apply-meta', ['type Opt(a) = None | Some(a);', 'fn f(): Int = { let n'
      + ' = None; match n { Some(g) => g(1), None => 0 } };']],
    ['pipe-meta', ['type Opt(a) = None | Some(a);', 'fn f(): Int = { let n'
      + ' = None; match n { Some(g) => 1 |> g, None => 0 } };']]];
  const exposing = ['apply-meta', 'pipe-meta'];
  const inScope = [list, 'fn f(x: L(Int)): L(Int) = C(1, x);'];
  const decided = lines => {
    const program = online.programOf([...lines, main].join(' '));
    return program === null ? null
      : { program, found: describe(online.decisionOf(program, 'f')) };
  };
  const boundaryWrong = () => {
    const wrong = [];
    for (const [name, lines] of outside) {
      const run = decided(lines);
      if (run === null) { wrong.push(`${name}: refused before R0`); continue; }
      const { verdict, attempts } = run.found;
      if (verdict === 'Solved' || !/Outside DataApplication/.test(verdict))
        wrong.push(`${name}: ${verdict}`);
      if (exposing.includes(name)) {
        if (verdict !== 'Unresolved Unsupported Outside DataApplication'
          || !/^Accepted/.test(attempts[0])) wrong.push(`${name}: ${verdict}`
            + ` ${attempts[0]}`);
      }
    }
    const control = decided(inScope);
    if (control === null || control.found.verdict !== 'Solved')
      wrong.push(`in-scope control: ${control?.found.verdict}`);
    return wrong;
  };

  // ---- The requirement-definedness refusal (design §16.1): a `BQ`
  // type with an `app` node that GroundRule judges `Holds` but that the
  // candidate leaves undefined (a label repeated by splicing) is refused
  // `Undefined`. Built from a real problem with a flexible row variable;
  // `b` emptied so only the requirement is judged.
  const g0 = (await import('./r0-g0-support.mjs'));
  const definednessWrong = async () => {
    const { stubsFrom } = await import('./r0-stubs.mjs');
    const stubs = await stubsFrom(load);
    const support = await g0.g0From(load, stubs);
    const source = [list, 'fn idR(y: { x: Int, ...s }): { x: Int, ...s } = y;',
      'fn f(): Int = idR({ x: 1 }).x;', main].join(' ');
    const problem = stubs.recorded.problem(source, 'f');
    const rowVar = Maps.toUnfoldable(
      (await load('Data.Unfoldable')).unfoldableArray)(problem.vars)
      .map(pair => pair).find(pair => pair.value1.sort instanceof Atom.SortRow
        && pair.value1.quant instanceof Atom.Exists)?.value0;
    if (rowVar === undefined) return ['no flexible row variable'];
    const x = new Tuple('x', int);
    const bq = [{ origin: problem.b[0].origin, value: new Atom.Printable(
      new Atom.App(new Atom.DataHead(0), [new Atom.Record([x], [rowVar])])) }];
    const candidate = Maps.singleton(rowVar)(new Atom.Record([x], []));
    const found = support.check({ ...problem, b: [], bq }, candidate);
    const wanted = named(found) === 'Left'
      && named(found.value0) === 'Undefined';
    const control = support.check({ ...problem, b: [], bq },
      Maps.singleton(rowVar)(new Atom.Record([new Tuple('y', int)], [])));
    return [...(wanted ? [] : [`repeated label: ${named(found)}`]),
      ...(named(control) === 'Right' ? [] : [`control: ${named(control)}`])];
  };

  // ---- GroundRule reads `DataBase t` as the declared type `t` (S6's
  // `kind (dataB t) = .data t`).
  const groundKindWrong = async () => {
    const GroundRule = await load('Features.Check.GroundRule');
    const Set = await load('Data.Set');
    const ord = (await load('Data.Ord')).ordInt;
    const ids = list => list.reduce((set, n) => Set.insert(ord)(n)(set),
      Set.empty);
    const holders = { declared: ids([0, 1]), holding: ids([1]),
      admitted: ids([0]), overRecords: ids([]) };
    const judge = id => named(GroundRule.judge(holders)(
      () => GroundRule.Holds.value)(new Atom.Base(new Atom.DataBase(id))));
    const wanted = [['Holds', 0], ['Open', 1], ['Unjudged', 2]];
    return wanted.filter(([kind, id]) => judge(id) !== kind)
      .map(([kind, id]) => `DataBase ${id}: ${judge(id)}, not ${kind}`);
  };

  // ---- The exposure check, branch by branch (review of 2026-11-14): a
  // program whose `main` has no marker and two flexible variables, α
  // only in the site type `L(α)` and β standing bare; G0's own check
  // (`substitutionOnly`) with α or β bound to each shape must expose
  // exactly the kinds listed.
  const exposureWrong = async () => {
    const { stubsFrom } = await import('./r0-stubs.mjs');
    const stubs = await stubsFrom(load);
    const support = await g0.g0From(load, stubs);
    const Row = await load('Domain.Row');
    const source = [list, 'type F = F(Unit -> Unit);',
      'type W(a) = W(a, Unit -> Unit);', 'type R(...r) = R({ x: Int, ...r });',
      'fn none(): L(a) = N;', 'fn any(): b = crash(0);',
      'fn main(): Int = { let d = none(); let e = any(); 7 };'].join(' ');
    const problem = stubs.recorded.problem(source, 'main');
    if (problem.outside.length > 0) return ['main is marked'];
    const flexible = Maps.toUnfoldable(
      (await load('Data.Unfoldable')).unfoldableArray)(problem.vars)
      .filter(pair => pair.value1.quant instanceof Atom.Exists)
      .map(pair => pair.value0);
    if (flexible.length !== 2) return [`${flexible.length} flexible`];
    const [alpha, beta] = flexible;
    const app = (id, args) => new Atom.App(new Atom.DataHead(id), args);
    const arrow = new Atom.Arrow(int, int);
    const rOf = app(3, [new Atom.Record([], [])]);
    const DA = 'DataApplication';
    const DOR = 'DataOverRecords';
    const cases = [
      ['α Int', alpha, int, []],
      ['α arrow', alpha, arrow, [DA]],
      ['α record', alpha, new Atom.Record([new Tuple('y', int)], []), [DA]],
      ['α holder base', alpha, new Atom.Base(new Atom.DataBase(1)), [DA]],
      ['α handler', alpha, new Atom.App(new Atom.HandlerHead(
        Row.ConsoleEffect.value), []), [DA]],
      ['α over records', alpha, rOf, [DA, DOR]],
      ['α nested arrow', alpha, app(0, [arrow]), [DA]],
      ['α holder head', alpha, app(2, [int]), [DA]],
      ['β holder head', beta, app(2, [int]), [DA]],
      ['β over records', beta, rOf, [DOR]],
      ['β in scope', beta, app(0, [int]), []],
      // Only the recursion into arguments names the inner node's kind.
      ['β list of over records', beta, app(0, [rOf]), [DA, DOR]],
      ['β under an arrow', beta, new Atom.Arrow(int, app(2, [int])), [DA]]];
    const wrong = [];
    for (const [name, variable, image, wanted] of cases) {
      const found = support.check(problem, Maps.singleton(variable)(image));
      if (named(found) !== 'Right') {
        wrong.push(`${name}: refused ${named(found.value0)}`);
        continue;
      }
      const kinds = found.value0.validity.value0.map(named);
      if (JSON.stringify(kinds) !== JSON.stringify(wanted))
        wrong.push(`${name}: ${JSON.stringify(kinds)}`);
    }
    return wrong;
  };

  return { boundaryWrong, definednessWrong, groundKindWrong, exposureWrong };
};
