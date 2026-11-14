// Scope A's checks (dossier §18.198-§18.200; implementation proposal §8
// task 4), shared by test/r0-scope-a.test.mjs and the restored-defect
// probes (test/regression-r0-scope-a.mjs). Each returns the cases that
// fail, so a probe can name them. `load` loads a compiled module.
import { choose, generator } from './coverage-oracle.mjs';

const named = value => value.constructor.name;

export const scopeAChecks = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Hole = await load('Domain.Recorded.Hole');
  const Maps = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { under } = await load('Features.Check.Strategy.Candidate');
  const ordVar = Atom.ordVar;

  // ---- `under` is canonicalization after one substitution (design
  // §17.6): a JS reference splices bound tails after the record's own
  // fields, replaces bound variables, then sorts fields by label (code
  // units, stable) and tails by the derived Ord Var, at every depth.
  const int = new Atom.Base(Atom.IntBase.value);
  const bool = new Atom.Base(Atom.BoolBase.value);
  const rigid = n => new Atom.RigidVar(n);
  const flexTy = [Hole.holeVar(1), Hole.holeVar(2)];
  const flexRow = [Hole.holeVar(11), Hole.holeVar(12)];
  const rigidTy = [rigid(0)];
  const rigidRow = [rigid(5)];
  const labels = ['b', 'a', 'c'];
  const pick = (next, items) => items[choose(next, items.length)];
  const typeOf = (next, depth, vars, tails) => {
    const k = choose(next, depth > 2 ? 3 : 6);
    if (k === 0) return pick(next, [int, bool]);
    if (k === 1 || k === 2) return new Atom.TVar(pick(next, vars));
    if (k === 3) return new Atom.Arrow(typeOf(next, depth + 1, vars, tails),
      typeOf(next, depth + 1, vars, tails));
    if (k === 4) return new Atom.App(new Atom.DataHead(choose(next, 2)),
      [typeOf(next, depth + 1, vars, tails)]);
    const fields = Array.from({ length: choose(next, 3) }, () =>
      new Tuple(pick(next, labels), typeOf(next, depth + 1, vars, tails)));
    const rows = [...new Set(Array.from({ length: choose(next, 3) }, () =>
      pick(next, tails)))];
    return new Atom.Record(fields, rows);
  };
  const isRecord = ty => ty instanceof Atom.Record;
  const reference = (image, ty) => {
    if (ty instanceof Atom.TVar) {
      const bound = image.get(ty.value0);
      return bound === undefined ? ty : reference(new Map(), bound);
    }
    if (ty instanceof Atom.Arrow) return new Atom.Arrow(
      reference(image, ty.value0), reference(image, ty.value1));
    if (ty instanceof Atom.App) return new Atom.App(ty.value0,
      ty.value1.map(arg => reference(image, arg)));
    if (!isRecord(ty)) return ty;
    let fields = ty.value0.map(pair =>
      new Tuple(pair.value0, reference(image, pair.value1)));
    let tails = [];
    for (const tail of ty.value1) {
      const bound = image.get(tail);
      if (bound === undefined) { tails.push(tail); continue; }
      const row = reference(new Map(), bound);
      fields = fields.concat(row.value0);
      tails = tails.concat(row.value1);
    }
    const byLabel = (x, y) => (x.value0 < y.value0 ? -1
      : x.value0 > y.value0 ? 1 : 0);
    const byVar = (x, y) => ({ LT: -1, EQ: 0, GT: 1 })[
      named(ordVar.compare(x)(y))];
    return new Atom.Record([...fields].sort(byLabel), [...tails].sort(byVar));
  };
  const same = (x, y) => Atom.eqRTExpr.eq(x)(y);
  const canonicalWrong = (cases = 400) => {
    const next = generator(0x5ca);
    const wrong = [];
    for (let index = 0; index < cases; index += 1) {
      // Generic: keys flexible, images mention no key, a row's image a
      // record (Candidate.purs `generic`).
      const image = new Map();
      for (const v of flexTy) if (choose(next, 2) === 0)
        image.set(v, typeOf(next, 1, rigidTy, rigidRow));
      for (const v of flexRow) if (choose(next, 2) === 0) {
        const fields = Array.from({ length: 1 + choose(next, 2) }, () =>
          new Tuple(pick(next, labels), typeOf(next, 2, rigidTy, rigidRow)));
        image.set(v, new Atom.Record(fields,
          choose(next, 2) === 0 ? [] : rigidRow));
      }
      let candidate = Maps.empty;
      for (const [k, v] of image) candidate = Maps.insert(ordVar)(k)(v)(
        candidate);
      const ty = typeOf(next, 0, [...flexTy, ...rigidTy],
        [...flexRow, ...rigidRow]);
      const found = under(candidate)(ty);
      if (!same(found, reference(image, ty)))
        wrong.push(`under ${index}`);
      if (!same(under(Maps.empty)(found), found))
        wrong.push(`idempotent ${index}`);
    }
    return wrong;
  };

  // ---- Generated declaration tables (§8 task 4): the holder set,
  // the admitted set and S7, each against a literal JS reference over
  // the generator's own declarations, never the compiler's tables.
  // Generation through `load`, so a probe reads the compiler under test;
  // recorded terms as JSON by constructor name.
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const { generationInputs } = await load('Features.Check.Generate.Inputs');
  const { generate } = await load('Features.Check.Generate');
  const Elaborating = await load('Domain.Elaborating');
  const Recorded = await load('Domain.Recorded');
  const Sets = await load('Data.Set');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const ids = set => Sets.toUnfoldable(unfoldableArray)(set);
  const termJson = ty => {
    switch (named(ty)) {
    case 'Base': return { base: named(ty.value0) === 'DataBase'
      ? { data: ty.value0.value0 } : named(ty.value0) };
    case 'Arrow': return { fun: [termJson(ty.value0), termJson(ty.value1)] };
    case 'TVar': return { tvar: true };
    case 'Record': return { record: { fields: ty.value0.map(pair =>
      [pair.value0, termJson(pair.value1)]), tails: ty.value1.length } };
    default: return { app: { head: named(ty.value0) === 'DataHead'
      ? { data: ty.value0.value0 } : { handler: true },
    args: ty.value1.map(termJson) } };
    }
  };
  const atomJson = atom => named(atom) === 'Equal'
    ? { eq: [termJson(atom.value0), termJson(atom.value1)] }
    : named(atom) === 'Printable' || named(atom) === 'Comparable'
      ? { req: termJson(atom.value0) } : { other: named(atom) };
  const problemsOf = source => {
    const program = resolve(parse(source).value0);
    if (named(program) !== 'Right') throw new Error('refused');
    const { tables, signatures } = generationInputs(program.value0);
    return program.value0.functions.map(decl => {
      const made = generate(tables)(signatures)(decl);
      if (named(made) !== 'Right') throw new Error('generation');
      const f = Recorded.fields(Elaborating.problem(made.value0));
      const terms = list => list.map(entry => atomJson(entry.value));
      return { decl, problem: { holders: { holding: ids(f.holders.holding),
        admitted: ids(f.holders.admitted) },
      outside: f.outside.map(entry => ({ value: named(entry.value) })),
      b: terms(f.b), d: terms(f.d), bq: terms(f.bq) } };
    });
  };
  const declsOf = next => {
    const count = 2 + choose(next, 4);
    const decls = Array.from({ length: count }, (_, id) =>
      ({ id, recrow: choose(next, 6) === 0, params: choose(next, 3) }));
    const field = (d, depth) => {
      const k = choose(next, depth > 1 ? 3 : 8);
      if (k === 0) return { base: pick(next, ['Int', 'Bool']) };
      if (k === 1 && d.params > 0 && !d.recrow)
        return { param: choose(next, d.params) };
      if (k === 1 || k === 2) return { base: 'Int' };
      if (k === 3) return { arrow: true };
      if (k === 4) return { handler: true };
      if (k === 5) return { record: field(d, depth + 1) };
      const target = pick(next, decls);
      return { data: target.id, args: target.recrow
        ? [{ record: field(d, depth + 1) }]
        : Array.from({ length: target.params }, () => field(d, depth + 1)) };
    };
    for (const d of decls) d.ctors = Array.from(
      { length: 1 + choose(next, 2) }, () => d.recrow ? [{ tailed: true }]
        : Array.from({ length: choose(next, 3) }, () => field(d, 0)));
    return decls;
  };
  const paramNames = ['a', 'b'];
  const write = ft => {
    if (ft.base) return ft.base;
    if (ft.param !== undefined) return paramNames[ft.param];
    if (ft.tvar !== undefined) return ft.tvar;
    if (ft.arrow) return 'Unit -> Unit';
    if (ft.handler) return 'Handler(Console)';
    if (ft.tailed) return '{ x: Int, ...r }';
    if (ft.record) return `{ f: ${write(ft.record)} }`;
    return ft.args.length === 0 ? `T${ft.data}`
      : `T${ft.data}(${ft.args.map(write).join(', ')})`;
  };
  const sourceOf = (decls, probes) => decls.map(d => {
    const params = d.recrow ? '(...r)' : d.params === 0 ? ''
      : `(${paramNames.slice(0, d.params).join(', ')})`;
    const ctors = d.ctors.map((fields, c) => fields.length === 0
      ? `K${d.id}x${c}` : `K${d.id}x${c}(${fields.map(write).join(', ')})`);
    return `type T${d.id}${params} = ${ctors.join(' | ')};`;
  }).concat(probes.map((ty, i) => `fn p${i}(x: ${write(ty)}): ${write(ty)}`
    + ' = x;'), ['fn main(): Int = 0;']).join('\n');
  const referenceOf = decls => {
    const fieldsOf = d => d.ctors.flat();
    const holder = new Set();
    const holds = ft => ft.arrow || ft.handler
      || (ft.record !== undefined && holds(ft.record))
      || (ft.data !== undefined
        && (holder.has(ft.data) || ft.args.some(holds)));
    for (let changed = true; changed;) {
      changed = false;
      for (const d of decls) if (!holder.has(d.id)
        && fieldsOf(d).some(holds)) { holder.add(d.id); changed = true; }
    }
    const mentions = ft => ft.record ? mentions(ft.record)
      : ft.data !== undefined ? [ft.data, ...ft.args.flatMap(mentions)] : [];
    const reach = id => {
      const seen = new Set([id]);
      const todo = [id];
      while (todo.length > 0) for (const u of fieldsOf(decls[todo.pop()])
        .flatMap(mentions)) if (!seen.has(u)) { seen.add(u); todo.push(u); }
      return seen;
    };
    const admitted = new Set(decls.filter(d => !d.recrow && !holder.has(d.id)
      && ![...reach(d.id)].some(u => decls[u].recrow)).map(d => d.id));
    return { holder, admitted };
  };
  // The kinds the written type's `app` nodes need, in pre-order.
  const kindsOf = (decls, ref, ft) => {
    if (ft.handler) return ['HandlerType'];
    if (ft.data === undefined) return ft.record
      ? kindsOf(decls, ref, ft.record) : [];
    const inner = ft.args.flatMap(arg => kindsOf(decls, ref, arg));
    if (ft.args.length === 0) return inner;
    const plain = arg => arg.base !== undefined || arg.tvar !== undefined
      || (arg.data !== undefined
      && ref.admitted.has(arg.data) && arg.args.every(plain));
    const kind = decls[ft.data].recrow ? ['DataOverRecords']
      : ref.admitted.has(ft.data) && ft.args.every(plain) ? []
        : ['DataApplication'];
    return [...kind, ...inner];
  };
  const coverage = { resolved: 0, refused: 0, holders: 0, transitive: 0,
    probes: 0, unmarked: 0, marked: 0 };
  const tablesWrong = (programs = 150) => {
    const next = generator(0x7ab);
    const wrong = [];
    for (let index = 0; index < programs; index += 1) {
      const decls = declsOf(next);
      const probes = Array.from({ length: 3 }, () => {
        const d = pick(next, decls);
        return { data: d.id, args: d.recrow ? [{ record: { base: 'Int' } }]
          : Array.from({ length: d.params }, () => pick(next, [{ base: 'Int' },
            { data: pick(next, decls).id, args: [] }, { tvar: 'a' },
            { arrow: true }, { record: { base: 'Int' } }, { handler: true }]))
        };
      }).filter(ft => ft.args.every(arg => arg.data === undefined
        || decls[arg.data].params === 0 && !decls[arg.data].recrow));
      let found;
      try { found = problemsOf(sourceOf(decls, probes)); }
      catch { coverage.refused += 1; continue; }
      coverage.resolved += 1;
      const ref = referenceOf(decls);
      if (ref.holder.size > 0) coverage.holders += 1;
      if (decls.some(d => !d.recrow && !ref.holder.has(d.id)
        && !ref.admitted.has(d.id))) coverage.transitive += 1;
      const ids = set => [...set].sort((x, y) => x - y);
      for (const { decl, problem } of found) {
        const at = `${index}#${decl.name}`;
        if (JSON.stringify(problem.holders.holding) !==
          JSON.stringify(ids(ref.holder))) wrong.push(`holders ${at}`);
        if (JSON.stringify(problem.holders.admitted) !==
          JSON.stringify(ids(ref.admitted))) wrong.push(`admitted ${at}`);
        const text = JSON.stringify(problem);
        // D6.5: `D` holds no equation, so no `app` node.
        if (problem.d.some(atom => atom.eq !== undefined))
          wrong.push(`D equation ${at}`);
        for (const [, u] of text.matchAll(/"base":\{"data":(\d+)\}/g))
          if (decls[u].params !== 0 || decls[u].recrow)
            wrong.push(`TableBases ${at}`);
        const probe = /^p(\d+)$/.exec(decl.name);
        if (probe === null) continue;
        const ft = probes[Number(probe[1])];
        const kinds = problem.outside.map(entry => entry.value);
        const wanted = kindsOf(decls, ref, ft);
        coverage.probes += 1;
        coverage[wanted.length === 0 ? 'unmarked' : 'marked'] += 1;
        if (JSON.stringify(kinds) !== JSON.stringify([...wanted, ...wanted]))
          wrong.push(`S7 markers ${at}`);
        const nodes = (value, found = []) => {
          if (Array.isArray(value)) value.forEach(item => nodes(item, found));
          else if (value !== null && typeof value === 'object') {
            if (value.app !== undefined && value.app.head.data !== undefined)
              found.push(value.app);
            Object.values(value).forEach(item => nodes(item, found));
          }
          return found;
        };
        for (const node of nodes(problem))
          if (!decls[node.head.data].recrow && node.args.length > 0
            && decls[node.head.data].params !== node.args.length)
            wrong.push(`S7 args ${at}`);
      }
    }
    return wrong;
  };

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

  return { canonicalWrong, tablesWrong, coverage, boundaryWrong,
    definednessWrong, groundKindWrong, exposureWrong };
};
