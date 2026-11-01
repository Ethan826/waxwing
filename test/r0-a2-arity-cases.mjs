// A2 arity fixtures (dossier §18.148 (1); docs/plans/
// 2026-11-01-a2-arity-metadata.md): I3's check (k) over package images
// and record check 5 over recorded applications. `arityCases` builds them
// from any build's modules, so the probes (test/regression-r0-a2-arity.mjs)
// load the clone's and test/r0-a2-arity.test.mjs the healthy build's.
// Each image row is [name, problem, package, expected reason]; each
// record row [name, problem, expected defect]. Fixture-level checks.
import { validateCases } from './regression-r0-a2-validate.mjs';

// Cell is effect 0, Log 1, Ask 2; Job is type 0 (one type, one row).
const declared = 'effect Cell(a) { fn put(x: a): Unit; }; '
  + 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; '
  + 'type Job(a, ...effects) = Job(Int -> a with ...effects); ';
const main = 'fn main(): Int = 0;';
export const sources = {
  // `k` is never applied, so its row is bound but read by nothing.
  unused: `${declared}fn g(): Unit = { let k = fn(u: Unit) => (); () }; `
    + main,
  typed: `${declared}fn id2(x: Int): Int = { let g = fn(y) => y; g(x) }; `
    + main,
  literal: `${declared}fn mk(): Handler(nofail Ask with Log + ...s) with `
    + 'pure = handler Ask { ask() => Log.log(1) }; ' + main,
  cell: `${declared}fn f(): Unit with Cell(Int) = Cell.put(1); ${main}`
};

export const arityCases = async load => {
  const cases = await validateCases(load);
  const Search = await load('Domain.Verdict.Search');
  const Malformed = await load('Features.Check.Strategy.Effects.Malformed');
  const Record = await load('Features.Check.Strategy.Effects.Record');
  const Origin = await load('Domain.Recorded.Origin');
  const Ids = await load('Domain.Ids');
  const { P, Atom, Row, Effect, Maps, Just, Nothing, N, unit } = cases;
  const int = new P.PBase(Atom.IntBase.value);
  const row = (...labels) => ({ labels, tail: Nothing.value });
  const label = (effect, args) => ({ effect, args, mark: N });
  const cell = (...args) => label(new Row.UserEffect(0), args);
  const stranger = (...args) => label(new Row.UserEffect(99), args);
  const failing = (...args) => label(Row.FailEffect.value, args);
  const consoled = (...args) => label(Row.ConsoleEffect.value, args);
  const job = (types, rows) => new P.PData(0, types, rows);
  const handler = (head, inference, clauses) => new P.PHandler(head,
    { inference, clauses: clauses === null ? Nothing.value
      : new Just(clauses) });
  const inC = clauses => row(cell(handler(cell(int), row(), clauses)));
  const unused = cases.problemOf(sources.unused, 'g');
  const typed = cases.problemOf(sources.typed, 'id2');
  const literal = cases.problemOf(sources.literal, 'mk');
  const inRow = bound => cases.honest(unused, { rows: () => bound });
  const roleRow = (role, bound) => cases.honest(literal, { rows: variable =>
    cases.role(variable) === role ? bound : cases.closed });
  const image = (name, bound, expected) =>
    [name, unused, inRow(row(bound)), expected];
  const imageRows = [
    image('undeclared effect, unused binding', stranger(),
      'Undeclared KeyEffect effect 99'),
    image('Cell without its argument', cell(), 'WrongArity KeyEffect effect 0'),
    image('Cell with two', cell(int, int), 'WrongArity KeyEffect effect 0'),
    image('Cell as declared', cell(int), null),
    image('Job without arguments', cell(job([], [])),
      'WrongArity KeyEffect data 0'),
    image('Job without its row', cell(job([int], [])),
      'WrongArity KeyEffect data 0'),
    image('Job with two rows', cell(job([int], [row(), row()])),
      'WrongArity KeyEffect data 0'),
    image('Job as declared', cell(job([int], [row()])), null),
    image('undeclared data', cell(new P.PData(7, [], [])),
      'Undeclared KeyEffect data 7'),
    image('Fail with one', failing(int), null),
    image('Fail with two', failing(int, int),
      'WrongArity KeyEffect effect Fail'),
    image('Console with none', consoled(), null),
    image('Console with one', consoled(int),
      'WrongArity KeyEffect effect Console'),
    image('nested: a row inside a data argument',
      cell(job([new P.PArrow(int, row(cell()), int)], [row()])),
      'WrongArity KeyEffect effect 0'),
    image('nested: a handler\'s R', cell(handler(cell(int),
      row(cell(int, int)), null)), 'WrongArity KeyEffect effect 0'),
    ['bare C: no arguments', unused, inRow(inC(row(cell()))), null],
    ['bare C: as declared', unused, inRow(inC(row(cell(int)))), null],
    ['bare C: wrong count', unused, inRow(inC(row(cell(int, int)))),
      'WrongArity KeyEffect effect 0'],
    ['bare C: undeclared', unused, inRow(inC(row(stranger()))),
      'Undeclared KeyEffect effect 99'],
    ['bare C: Fail payload head only', unused,
      inRow(inC(row(failing(job([], []))))), null],
    image('R: Fail payload head only', failing(job([], [])),
      'WrongArity KeyEffect data 0'),
    image('keyless (j) before arity (k)', failing(), 'KeylessFail'),
    ['a type image', typed, cases.honest(typed, { types: () =>
      job([], []) }), 'WrongArity KeyType data 0'],
    ['a literal\'s C key: bare', literal,
      roleRow('HandlerClauses', row(cell())), null],
    ['a literal\'s R key: not bare', literal,
      roleRow('HandlerInference', row(cell())),
      'WrongArity KeyEffect effect 0']
  ];
  const refName = ref => ref instanceof Row.UserEffect ? ref.value0
    : ref.constructor.name.replace('Effect', '');
  const appliedName = applied => applied instanceof Search.AppliedData
    ? `data ${applied.value0}` : `effect ${refName(applied.value0)}`;
  const named = found => ['Undeclared', 'WrongArity']
    .includes(found.constructor.name)
    ? `${found.constructor.name} ${found.value0.constructor.name} `
      + `${appliedName(found.value1)}` : found.constructor.name;
  const reasonOf = found => found.constructor.name === 'Nothing' ? null
    : named(found.value0);
  const imageFound = ([, problem, input]) =>
    reasonOf(Malformed.malformed(problem)(input));
  return { ...cases, Search, Malformed, Record, Origin, Ids, int, row, cell,
    stranger, failing, job, unused, typed, literal, inRow, imageRows,
    imageFound, recordRows: recordRowsOf({ ...cases, Record, Origin, Ids }) };
};

// Record check 5 (spec §4.1's fifth bullet) on `f`, which records
// Cell(Int): appended obligations at a path of their own, and the
// declarations changed.
const recordRowsOf = cases => {
  const { Effect, Atom, Row, Maps, Just, Nothing, Origin, Ids } = cases;
  const f = cases.problemOf(sources.cell, 'f');
  const at = new Effect.AtSite({ decl: f.decl, path: { root:
    Origin.InBody.value, steps: [] }, rule: new Origin.ExprRule(1),
  role: Effect.EntryRow.value });
  const appended = value => ({ ...f, effects: { ...f.effects, obligations:
    [...f.effects.obligations, { ...f.effects.obligations[0],
      provenance: at, value }] } });
  const declaring = (change, problem = f) => ({ ...problem, effects: {
    ...problem.effects, declarations: change(
      problem.effects.declarations) } });
  const effectsSet = (ref, count) => found => ({ ...found, effects:
    count === null ? Maps.delete(Row.ordEffectRef)(ref)(found.effects)
      : Maps.insert(Row.ordEffectRef)(ref)(count)(found.effects) });
  const extraType = found => ({ ...found, types: Maps.insert(
    Ids.ordTypeId)(9)({ types: 0, rows: 0 })(found.types) });
  const mint = new Effect.MBase(Atom.IntBase.value);
  const mrow = (...labels) => ({ labels, tail: Nothing.value });
  const mlabel = (effect, ...args) => ({ effect, args,
    mark: new Effect.Written(Effect.FixedN.value) });
  const mcell = (...args) => mlabel(new Row.UserEffect(0), ...args);
  const mfail = (...args) => mlabel(Row.FailEffect.value, ...args);
  const mjob = (types, rows) => new Effect.MData(0, types, rows);
  const mhandler = (inference, clauses) => new Effect.MHandler(mcell(mint),
    { inference, clauses: new Just(clauses) });
  const equal = left => new Effect.Equal(left, left);
  const entry = (...labels) => new Effect.Entry(mrow(...labels));
  const failCount = effectsSet(Row.FailEffect.value, 2);
  return [
    ['as generated', f, null],
    ['Cell declared with two', declaring(effectsSet(new Row.UserEffect(0),
      2)), 'check 5 obligation 2'],
    ['an undeclared label', appended(entry(mlabel(new Row.UserEffect(99)))),
      'check 5 appended'],
    ['a bare label in a full row', appended(entry(mcell())),
      'check 5 appended'],
    ['Job without its row', appended(equal(mjob([mint], []))),
      'check 5 appended'],
    ['an undeclared data type', appended(equal(new Effect.MData(7, [], []))),
      'check 5 appended'],
    ['a bare C label', appended(equal(mhandler(mrow(mcell(mint)),
      mrow(mcell())))), null],
    ['a C Fail payload by its head', appended(equal(mhandler(mrow(
      mfail(mjob([mint], [mrow()]))), mrow(mfail(mjob([], [])))))), null],
    ['Fail declared with two', declaring(failCount),
      'check 5 InDeclarations'],
    ['Fail with two, a Fail label recorded', declaring(failCount,
      appended(entry(mfail(mint)))), 'check 5 InDeclarations'],
    ['Console undeclared', declaring(effectsSet(Row.ConsoleEffect.value,
      null)), 'check 5 InDeclarations'],
    ['a negative count', declaring(effectsSet(new Row.UserEffect(1), -1)),
      'check 5 InDeclarations'],
    ['a data type not in holders', declaring(extraType),
      'check 5 InDeclarations']
  ].map(([name, problem, expected]) =>
    [name, problem, expected, () => defectOf(cases, problem, at)]);
};

const defectOf = (cases, problem, at) => {
  const found = cases.Record.recordDefect(problem);
  if (found.constructor.name === 'Nothing') return null;
  const { provenance, check } = found.value0;
  if (provenance instanceof cases.Effect.InRecord)
    return `check ${check} ${provenance.value0.table.constructor.name}`;
  if (cases.Effect.eqProvenance.eq(provenance)(at))
    return `check ${check} appended`;
  const index = problem.effects.obligations.findIndex(placed =>
    cases.Effect.eqProvenance.eq(placed.provenance)(provenance));
  return `check ${check} obligation ${index}`;
};
