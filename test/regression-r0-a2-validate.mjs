// A2 Task 11's regression probes (the validator, spec §4, §5), spread
// into r0A2Probes (test/regression-r0-a2.mjs); the rows are in
// scripts/regression-r0-a2-validate.mjs. `validateCases` builds the
// fixtures from any build's modules, so the probes load the clone's and
// test/r0-a2-validate.test.mjs and test/r0-a2-cases.test.mjs the
// healthy build's.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

// Log is effect 0, Ask 1 (State 1 in `c2c`).
const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Unit; }; ';
const mk = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
  + ' = handler Ask { ask() => Log.log(1) }; ';
const main = 'fn main(): Unit = ();';
// Spec §12's cases.
export const sources = {
  c1: `${mk}fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; `
    + main,
  c2: `${log}fn work(): Unit with Log = { defer Log.log(1); () }; ${main}`,
  c2c: 'effect Log { fn log(n: Int): Unit; }; '
    + 'effect State(a) { fn get(): a; }; '
    + 'fn work(h: Unit -> Unit with State(Int)): Unit with Log + State(Bool)'
    + ' = { defer Log.log(1); h(()) }; ' + main,
  c3: 'effect Op { fn op(): Int with Log; }; '
    + 'effect Log { fn log(n: Int): Unit; }; '
    + 'fn g(): Int with Op = Op.op(); fn main(): Int = 0;',
  c5: 'fn main(): Unit with Console = { let h = 1; with h { () } };',
  c7: 'fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }; '
    + 'fn main(): Int = 0;',
  c7b: 'fn id2(x: Int): Int = { let g = fn(y) => y; g(x) }; '
    + 'fn main(): Int = 0;',
  c13: `${mk}fn use(b: Bool): Unit with Log = { let h = if b then mk() `
    + 'else mk(); with h { defer Ask.ask(); () } }; ' + main,
  c15: `${log}fn mk2(): Handler(nofail Ask with ...s) with pure`
    + ' = handler Ask { ask() => () }; '
    + 'fn use2(): Unit with ...e = with mk2() { defer Ask.ask(); () }; '
    + main,
  c16: `${mk}fn use3(): Unit with Log = { defer Log.log(1); `
    + `with mk() { () } }; ${main}`,
  id: 'fn id(x: Int): Int = x; fn main(): Int = 0;'
};

const right = (result, phase) => {
  if (result.constructor.name !== 'Right')
    throw new Error(`${phase} refused: ${result.value0.constructor.name}`);
  return result.value0;
};

export const validateCases = async load => {
  const m = {};
  for (const [name, module] of [['Parse', 'Format.Parse'],
    ['Resolve', 'Features.Resolve'], ['Generate', 'Features.Check.Generate'],
    ['Inputs', 'Features.Check.Generate.Inputs'],
    ['Elaborating', 'Domain.Elaborating'], ['Effect', 'Domain.Recorded.Effect'],
    ['Atom', 'Domain.Recorded.Atom'], ['Row', 'Domain.Row'],
    ['Hole', 'Domain.Recorded.Hole'], ['P', 'Domain.Verdict.EffectPackage'],
    ['Forced', 'Features.Check.Strategy.Effects.Forced'],
    ['Witness', 'Features.Check.Strategy.Witness'],
    ['Package', 'Features.Check.Strategy.Effects.Package'],
    ['Complete', 'Features.Check.Strategy.Effects.Complete'],
    ['Validate', 'Features.Check.Strategy.Effects.Validate'],
    ['Sites', 'Features.Check.Strategy.Effects.Sites'],
    ['Consume', 'Features.Check.Strategy.Effects.Consume'],
    ['Substitution', 'Features.Check.Strategy.Substitution'],
    ['Maps', 'Data.Map.Internal'], ['Sets', 'Data.Set'],
    ['Maybe', 'Data.Maybe'], ['Foldable', 'Data.Foldable'],
    ['Ord', 'Data.Ord'], ['Unfoldable', 'Data.Unfoldable']])
    m[name] = await load(module);
  const { Effect, Atom, P, Maps, Sets } = m;
  const { Just, Nothing } = m.Maybe;
  // A recorded problem is its fields at run time (a newtype).
  const problemOf = (source, name) => {
    const program = right(m.Resolve.resolve(right(m.Parse.parse(source),
      'parse')), 'resolve');
    const { tables, signatures } = m.Inputs.generationInputs(program);
    const decl = program.functions.find(item => item.name === name);
    return m.Elaborating.problem(right(
      m.Generate.generate(tables)(signatures)(decl), 'generation'));
  };
  const mapOf = (ord, pairs) => pairs.reduce((made, [key, value]) =>
    Maps.insert(ord)(key)(value)(made), Maps.empty);
  const pkg = ({ types = [], rows = [], effects = [], marks = [] }) => ({
    types: mapOf(Atom.ordVar, types), rows: mapOf(Atom.ordVar, rows),
    effects: mapOf(Effect.ordEVar, effects),
    marks: mapOf(Effect.ordPosition, marks) });
  const N = P.TermN.value;
  const M = P.TermM.value;
  const J = (...names) => new P.TermJ(
    Sets.fromFoldable(m.Foldable.foldableArray)(m.Ord.ordString)(names));
  const closed = { labels: [], tail: Nothing.value };
  const user = (effect, mark) => ({ effect: new m.Row.UserEffect(effect),
    args: [], mark });
  const labelled = item => ({ labels: [item], tail: Nothing.value });
  const rigidTail = id => ({ labels: [],
    tail: new Just(new P.PTailRigid(id)) });
  const holeTail = n => ({ labels: [], tail: new Just(new P.PTailHole(n)) });
  const role = variable => variable.value1.constructor.name;
  const isFrame = position => position instanceof Effect.Frame;
  const flexTypes = problem => Sets.toUnfoldable(
    m.Unfoldable.unfoldableArray)(m.Witness.flexDomain(problem));
  const forcedOf = problem =>
    m.Forced.forcedTails(problem).map(entry => entry.forced);
  const unit = new P.PBase(Atom.UnitBase.value);
  // Every flexible type variable bound to `types` (Unit), every
  // package-owned effect variable (flexEff less F) to `rows` (closed),
  // every position to `terms` (N): the cases' "least" packages.
  const honest = (problem, { terms = () => N, rows = () => closed,
    types = () => unit } = {}) => {
    const forced = forcedOf(problem);
    const owned = problem.effects.flexEff.filter(variable =>
      !forced.some(item => Effect.eqEVar.eq(item)(variable)));
    return pkg({
      types: flexTypes(problem).map(variable => [variable, types(variable)]),
      effects: owned.map(variable => [variable, rows(variable)]),
      marks: problem.effects.positions.map(at => [at, terms(at)]) });
  };
  const validate = (problem, input) =>
    m.Substitution.validate(problem)(input);
  const prerequisites = (problem, input) =>
    m.Validate.prerequisites(problem)(input);
  const judge = (problem, input) => m.Validate.judgeObligations(problem)(
    m.Complete.complete(problem)(input));
  // The outcome's name: `Right`, the refusal, and a refusal's reason or
  // limitation where it has one.
  const describe = result => {
    if (result.constructor.name === 'Right') return 'Right';
    const refusal = result.value0;
    const name = refusal.constructor.name;
    if (name === 'NotCertifiable')
      return `${name} ${refusal.value0.constructor.name}`;
    if (name === 'Malformed')
      return `${name} ${refusal.value0.constructor.name}`;
    return name;
  };
  const obligations = problem => problem.effects.obligations;
  // The recorded index of a refusal's provenance.
  const indexOf = (problem, refusal) => {
    const at = refusal.value1 ?? refusal.value0;
    return obligations(problem).findIndex(placed =>
      Effect.eqProvenance.eq(placed.provenance)(at.provenance));
  };
  const context = (problem, input) => ({
    package: m.Complete.settledOf(m.Complete.complete(problem)(input)),
    rigidMarks: problem.effects.rigidMarks });
  return { ...m, problemOf, pkg, N, M, J, closed, user, labelled,
    rigidTail, holeTail, role, isFrame, flexTypes, forcedOf, unit, honest,
    validate, prerequisites, judge, describe, obligations, indexOf, context,
    Just, Nothing };
};

// C2(c), honest terms: d holds `Log` at M and the call's stage row is
// h's, `State(Int)` ending in the ambient rigid. Its `Defer` (2) fails
// an edge, its `AtCallback` (7) a condition.
export const c2c = cases => {
  const problem = cases.problemOf(sources.c2c, 'work');
  const [ambient] = problem.effects.effectRigids;
  const int = new cases.P.PBase(cases.Atom.IntBase.value);
  const stage = { labels: [{ ...cases.user(1, cases.M), args: [int] }],
    tail: cases.rigidTail(ambient).tail };
  const rows = variable => ({ EffectOf: cases.labelled(cases.user(0,
    cases.M)), Stage: stage })[cases.role(variable)] ?? cases.closed;
  return { problem, input: cases.honest(problem, { rows }) };
};

// C7(a): the lambda's row hole 3 and the Apply's hole 4 settle alike.
export const c7 = cases => {
  const problem = cases.problemOf(sources.c7, 'g');
  const input = cases.honest(problem, { rows: variable =>
    cases.holeTail(cases.role(variable) === 'EffectOf' ? 3 : 4) });
  return { problem, input };
};

// C7(b)'s program with y's variable absent and no type bound: G0 on
// erase (settle P_in) leaves y flexible and refuses; on erase P_c it
// would see completion's settled hole and accept (spec §4: G0 does not
// see completion's fresh holes).
export const absentPair = cases => {
  const problem = cases.problemOf(sources.c7b, 'id2');
  const input = cases.pkg({ effects: problem.effects.flexEff.map(
    variable => [variable, cases.closed]),
  marks: problem.effects.positions.map(at => [at, cases.N]) });
  return { problem, input };
};

const expect = (actual, expected, label) => {
  if (actual !== expected) fail(`${label}: expected ${expected}, got ${
    actual}`);
};

const probe = check => async context => {
  const { load } = await toolkit(context);
  check(await validateCases(load));
  passed(context);
};

export const a2ValidateProbes = {
  // Task 11, C5: step 1 (`Unsupported`) before I3, the frame term absent.
  'r0-a2-unsupported-before-i3': probe(cases => {
    const problem = cases.problemOf(sources.c5, 'main');
    const input = cases.pkg({ effects: problem.effects.flexEff.map(
      variable => [variable, cases.closed]) });
    expect(cases.describe(cases.validate(problem, input)),
      'NotCertifiable UnsupportedRecorded', 'C5 without a frame term');
  }),
  // Task 11, C2(c): obligations in recorded order, each judged fully.
  'r0-a2-recorded-order': probe(cases => {
    const { problem, input } = c2c(cases);
    const result = cases.validate(problem, input);
    expect(cases.indexOf(problem, result.value0), 2, 'C2(c) obligation');
  }),
  // Task 11, C2(c): the edge failure carries its own obligation's
  // provenance and check index.
  'r0-a2-edge-provenance': probe(cases => {
    const { problem, input } = c2c(cases);
    const result = cases.validate(problem, input);
    const defer = cases.obligations(problem)[2];
    const own = cases.Sites.deferCheck(cases.context(problem, input))(
      defer.value.value0);
    const at = result.value0.value0;
    expect(cases.Effect.eqProvenance.eq(at.provenance)(defer.provenance),
      true, 'C2(c) provenance is the Defer\'s');
    expect(at.check, own.value0.check, 'C2(c) check index');
  }),
  // Task 11, §18.145 (b): I3 before G0 (C1's `use`, a forced binding
  // and a result type G0 refuses).
  'r0-a2-runner-sequence': probe(cases => {
    const problem = cases.problemOf(sources.c1, 'use');
    const input = cases.honest(problem, { types: () => new cases.P.PBase(
      cases.Atom.BoolBase.value) });
    const [forced] = cases.forcedOf(problem);
    const both = { ...input, effects: cases.Maps.insert(
      cases.Effect.ordEVar)(forced)(cases.closed)(input.effects) };
    expect(cases.describe(cases.validate(problem, both)),
      'Malformed BindsForced', 'I3 before G0');
  }),
  // Task 11 (review): G0 reads erase (settle P_in), not erase P_c.
  'r0-a2-g0-input': probe(cases => {
    const { problem, input } = absentPair(cases);
    expect(cases.describe(cases.validate(problem, input)), 'Unsatisfied',
      'G0 on erase (settle P_in)');
  }),
  // Task 11 (Task 9's review): obligations read settle (complete P_in).
  'r0-a2-judge-settled': probe(cases => {
    const { problem, input } = c7(cases);
    expect(cases.describe(cases.validate(problem, input)), 'Right',
      'C7(a) on the settled completed package');
  })
};
