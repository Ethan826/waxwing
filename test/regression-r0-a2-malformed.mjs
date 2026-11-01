// A2 Task 5's regression probes (I3, spec §5 item 3), spread into
// a2PrereqProbes (test/regression-r0-a2-prereq.mjs); the rows are in
// scripts/regression-r0-a2-malformed.mjs. `malformedCases` builds the
// fixtures from any build's modules, so the probes load the clone's and
// test/r0-a2-malformed.test.mjs the healthy build's.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { supportFrom } from './r0-entailed-support.mjs';

// Spec §12 C1 (as in test/regression-r0-a2-prereq.mjs, which imports
// this file, so the source is repeated rather than imported).
const c1 = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; '
  + 'fn mk(): Handler(nofail Ask with Log + ...s) with pure'
  + ' = handler Ask { ask() => Log.log(1) }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
// Spec §12 C5: a non-handler `with`, its frame term unread.
const c5 = 'fn main(): Unit with Console = { let h = 1; with h { () } };';

const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${result.value0.constructor.name}`);
  return result.value0;
};

export const malformedCases = async load => {
  const Parse = await load('Format.Parse');
  const Resolve = await load('Features.Resolve');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const Effect = await load('Domain.Recorded.Effect');
  const Atom = await load('Domain.Recorded.Atom');
  const Row = await load('Domain.Row');
  const Hole = await load('Domain.Recorded.Hole');
  const P = await load('Domain.Verdict.EffectPackage');
  const Search = await load('Domain.Verdict.Search');
  const Forced = await load('Features.Check.Strategy.Effects.Forced');
  const Malformed = await load('Features.Check.Strategy.Effects.Malformed');
  const Witness = await load('Features.Check.Strategy.Witness');
  const Maps = await load('Data.Map.Internal');
  const Sets = await load('Data.Set');
  const Origin = await load('Domain.Recorded.Origin');
  const { foldableArray } = await load('Data.Foldable');
  const { ordString } = await load('Data.Ord');
  const { Tuple } = await load('Data.Tuple');
  const { Just, Nothing } = await load('Data.Maybe');
  const { v, problemOf: entailed } = await supportFrom(load);
  // A recorded problem is its fields at run time (a newtype).
  const problemOf = (source, name) => {
    const program = right(Resolve.resolve(right(Parse.parse(source),
      'parse')), 'resolve');
    const { tables, signatures } = Inputs.generationInputs(program);
    const decl = program.functions.find(item => item.name === name);
    return Elaborating.problem(right(
      Generate.generate(tables)(signatures)(decl), 'generation'));
  };
  const mapOf = (ord, pairs) => pairs.reduce((made, [key, value]) =>
    Maps.insert(ord)(key)(value)(made), Maps.empty);
  const pkg = ({ types = [], rows = [], effects = [], marks = [] }) => ({
    types: mapOf(Atom.ordVar, types), rows: mapOf(Atom.ordVar, rows),
    effects: mapOf(Effect.ordEVar, effects),
    marks: mapOf(Effect.ordPosition, marks) });
  const N = P.TermN.value;
  const J = (...names) => new P.TermJ(
    Sets.fromFoldable(foldableArray)(ordString)(names));
  const closed = { labels: [], tail: Nothing.value };
  const label = (effect, args, mark) => ({ effect, args, mark });
  const int = new P.PBase(Atom.IntBase.value);
  const arrow = row => new P.PArrow(int, row, int);
  const labelled = item => arrow({ labels: [item], tail: Nothing.value });
  const isAt = (constructor, variable) => variable instanceof constructor;
  // C1's `use`: F's one member, its source, and the package-owned rest.
  const use = problemOf(c1, 'use');
  const [{ forced, source }] = Forced.forcedTails(use);
  const owned = use.effects.flexEff.filter(variable =>
    !Effect.eqEVar.eq(variable)(forced));
  const least = owned.map(variable => [variable, closed]);
  const terms = use.effects.positions.map(position => [position, N]);
  const honest = pkg({ effects: least, marks: terms });
  // An `EffFresh` outside `flexEff` entirely.
  const stranger = new Effect.EffFresh({ root: Origin.InBody.value,
    steps: [] }, new Effect.Clauses(99));
  const failArrow = label(Row.FailEffect.value, [arrow(closed)], N);
  const main = problemOf(c5, 'main');
  const [frame] = main.effects.positions;
  const mainEffects = main.effects.flexEff.map(variable =>
    [variable, closed]);
  // `entailed`'s problem (x, y flexible types; r, s rows; p, q rigids)
  // with an effect problem: no effect variables or positions, and the
  // declared arities its images use (§18.148 (1)): the built-ins and a
  // nullary data type 7.
  const Ids = await load('Domain.Ids');
  const declarations = { effects: mapOf(Row.ordEffectRef,
    [[Row.FailEffect.value, 1], [Row.ConsoleEffect.value, 0]]),
  types: mapOf(Ids.ordTypeId, [[7, { types: 0, rows: 0 }]]) };
  const typed = (effects = {}) => ({ ...entailed({}),
    effects: { ...Effect.emptyEffects, declarations, ...effects } });
  const types = pairs => pkg({ types: pairs });
  const consoleType = mark =>
    labelled(label(Row.ConsoleEffect.value, [], mark));
  const reason = {
    bindsForced: new Search.BindsForced(forced),
    extra: key => new Search.ExtraKey(key),
    missing: key => new Search.MissingKey(key),
    keyType: name => new Search.KeyType(v(name)),
    keyEffect: variable => new Search.KeyEffect(variable)
  };
  return { Search, Malformed, Witness, Effect, Atom, P, Hole, Row, v, use,
    main, forced, source, owned, least, terms, honest, stranger, failArrow,
    frame, mainEffects, typed, types, consoleType, pkg, N, J, closed, label,
    int, arrow, labelled, isAt, reason, Just, Nothing, Tuple };
};

// The cases each restored defect breaks: [name, problem, package,
// expected reason].
export const rowCases = cases => {
  const { Effect, use, pkg, least, terms, forced, stranger, closed, typed,
    types, consoleType, Search, P, v, J, owned, failArrow, reason } = cases;
  const failing = ([variable, row]) => [variable,
    Effect.eqEVar.eq(variable)(owned[0]) ? { ...row, labels: [failArrow] }
      : row];
  return {
    'r0-a2-bindsforced-first': [['C9 B', use, pkg({ effects: [...least,
      [forced, closed], [stranger, closed]], marks: terms }),
    reason.bindsForced]],
    'r0-a2-solved-all-sorts': [['C11', typed(),
      types([[v('x'), new P.PVar(v('y'))]]),
      new Search.UnsolvedImage(reason.keyType('x'))]],
    'r0-a2-termj-empty': [['C12 empty', typed(),
      types([[v('x'), consoleType(J())]]), null]],
    'r0-a2-keyless-image': [['keyless', use,
      pkg({ effects: least.map(failing), marks: terms }),
      new Search.KeylessFail(reason.keyEffect(owned[0]))]]
  };
};

// '' when `found` is `expected` (`null` for `Nothing`), else what it was.
export const judged = (cases, found, expected) => {
  if (expected === null)
    return found.constructor.name === 'Nothing' ? ''
      : `Just ${found.value0.constructor.name}`;
  if (found.constructor.name === 'Nothing') return 'Nothing';
  return cases.Search.eqMalformedReason.eq(found.value0)(expected) ? ''
    : `${found.value0.constructor.name} ${JSON.stringify(found.value0)}`;
};

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

const probe = async context => {
  const cases = await malformedCases(loader(context));
  const wrong = rowCases(cases)[context.probe].map(
    ([name, problem, input, expected]) => [name,
      judged(cases, cases.Malformed.malformed(problem)(input), expected)])
    .filter(([, found]) => found !== '');
  if (wrong.length > 0) {
    console.error(`${context.probe}: ${JSON.stringify(wrong)}`);
    process.exit(1);
  }
  console.log(`${context.probe} regression detects the defect`);
};

export const a2MalformedProbes = {
  'r0-a2-bindsforced-first': probe,
  'r0-a2-solved-all-sorts': probe,
  'r0-a2-termj-empty': probe,
  'r0-a2-keyless-image': probe
};
