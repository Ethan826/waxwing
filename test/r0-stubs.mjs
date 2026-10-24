// Test-only tokens and stubs (ruling R11: Task 5.1 created this module,
// Task 4.1 extends it). Production cannot make a `TheoremRef`, a
// `SoundRule` or a `Valid`: their constructors are in
// Domain.Verdict.Theorem.Internal, Features.Check.Refute.Rules.Internal
// and Domain.Verdict.Internal, which only the trusted modules import
// (scripts/structure.mjs). Tests mint them through those modules'
// compiled JS. `stubsFrom` takes a loader and loads nothing itself, so a
// regression probe mints through the clone's output only
// (`context.compilerPath`).
//
// Task 4.1's stubs: strategies made by the production `strategy` from a
// stub spec (each behaviour below names what its search and check do),
// trusted refuters made by the production `trustedRefuter` with a
// test-minted theorem, shadow refuters by `shadowRefuter`, rules by
// the minted `SoundRule`, and recorded problems from source. A stub
// check's acceptance is a test-minted `Certified` (BACKLOG R026) holding
// the minted `Valid` and a `NonConstructive` compilation.
export const stubsFrom = async load => {
  const Theorem = await load('Domain.Verdict.Theorem.Internal');
  const Rule = await load('Features.Check.Refute.Rules.Internal');
  const Internal = await load('Domain.Verdict.Internal');
  const CertifiedInternal = await load('Domain.Verdict.Certified.Internal');
  const Verdict = await load('Domain.Verdict');
  const Search = await load('Domain.Verdict.Search');
  const Strategy = await load('Features.Check.Strategy');
  const Rules = await load('Features.Check.Refute.Rules');
  const Refuters = await load('Features.Check.Decide.Refuters');
  const Decide = await load('Features.Check.Decide');
  const { Left, Right } = await load('Data.Either');
  const { Just, Nothing } = await load('Data.Maybe');
  const theoremRef = name => new Theorem.TheoremRef(name);
  // A `RuleName` is a newtype, so its compiled form is the string.
  const soundRule = (name, theorem, apply) =>
    new Rule.SoundRule({ name, theorem, apply });
  const valid = Internal.Valid.value;
  const name = Verdict.OnlineSolver.value;
  const hint = text => new Search.SearchHint(text);
  const nonConstructive = new Verdict.NoWitness(
    new Verdict.NonConstructive(name));

  // A strategy over a stub spec; `calls` counts its searches.
  const strategyOf = ({ guard = Strategy.InScope.value, search }) => {
    const made = { calls: 0 };
    made.strategy = Strategy.strategy({ name,
      sound: new Verdict.Pending('Test.pending'),
      guard: () => guard,
      search: budget => problem => {
        made.calls += 1;
        return search(budget, problem);
      },
      check: () => cert => cert });
    return made;
  };
  // The certificate is the check's answer, so the stub check returns it.
  const offering = (claim, answer, hints) => strategyOf({ search: () =>
    new Strategy.Candidate(answer, claim, hints) });
  const behaviours = {
    accepting: (hints = []) => offering(Verdict.ClaimsComplete.value,
      new Right(new CertifiedInternal.Certified(valid, nonConstructive)),
      hints),
    refusing: (claim, refusal, hints = []) => offering(claim,
      new Left(refusal), hints),
    ending: (end, hints = []) => strategyOf({ search: () =>
      new Strategy.NoCandidate(end, hints) }),
    declining: unsupport => strategyOf({
      guard: new Strategy.OutOfScope(unsupport),
      search: () => { throw new Error('a declined search ran'); } }),
    inconsistent: text => strategyOf({ search: () =>
      new Strategy.Inconsistent(text) })
  };

  // A refuter spec whose search finds a counter-instance when `finds`
  // holds of its hints and budget; its check accepts when `confirmed`.
  const counterInstance = { rho: 'stub', body: ['stub'] };
  const refuterSpec = ({ refuter = 'Test.refuter', finds = () => true,
    confirmed = true } = {}) => ({ name: refuter,
    search: budget => hints => () => (finds(hints, budget)
      ? new Just(counterInstance) : Nothing.value),
    check: () => () => (confirmed ? new Right('checked')
      : new Left('refused')) });
  const trusted = options => Rules.trustedRefuter(
    theoremRef('Test.refutes'))(refuterSpec(options));
  const shadow = options => Refuters.shadowRefuter('Test.awaits')(
    refuterSpec(options));

  // A rule that fires with its premises chosen from the projection.
  const ruleOf = (rule, premisesOf, blame = []) => soundRule(rule,
    theoremRef(`Test.${rule}`), sig => {
      const premises = premisesOf(sig);
      return premises.length === 0 ? Nothing.value
        : new Just({ rule, premises, blame });
    });
  const firstB = sig => sig.b.slice(0, 1).map(entry => entry.id);

  const ends = { production: Decide.untilVerdict, everything: () => false };
  const checking = ({ strategies = [], refuters = [], shadows = [],
    rules = [], budget = { fuel: 5, depth: 1000, keys: 10000 },
    open = () => [], stop = ends.production } = {}) => ({
    strategies: strategies.map(made => made.strategy ?? made),
    refuters, shadows, rules, budget, openRequirements: open, ends: stop });

  return { theoremRef, soundRule, valid, name, hint, nonConstructive,
    behaviours, refuterSpec, trusted, shadow, ruleOf, firstB, ends,
    checking, decide: (made, problem) => Decide.decide(made)(problem),
    recorded: await recordedFrom(load) };
};

// The named declaration's recorded problem, as generation built it, and
// the same problem with one more `vars` key (rule 1′ needs a second
// spread, which Resolve refuses today: T-R0a §5.3 rule 1′). A
// `RecordedProblem` is a newtype, so its compiled form is its fields.
const recordedFrom = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const { generationInputs } = await load('Features.Check.Generate.Inputs');
  const { generate } = await load('Features.Check.Generate');
  const Elaborating = await load('Domain.Elaborating');
  const Atom = await load('Domain.Recorded.Atom');
  const Origin = await load('Domain.Recorded.Origin');
  const Map = await load('Data.Map.Internal');
  const { Just } = await load('Data.Maybe');
  const problem = (source, name = 'f') => {
    const program = resolve(parse(source).value0).value0;
    const decl = program.functions.find(item => item.name === name);
    return Elaborating.problem(generate(generationInputs(program).tables)(
      generationInputs(program).signatures)(decl).value0);
  };
  // E25's auxiliary row variable `⟨p, spread j⟩`, at the first B atom.
  const withSpread = (recorded, spread) => {
    const path = recorded.b[0].origin.atom.path;
    const role = new Atom.Spread(spread);
    const info = { sort: Atom.SortRow.value, quant: Atom.Exists.value,
      origin: { path, role: new Just(role), rule: new Origin.ExprRule(25),
        span: recorded.b[0].origin.span },
      position: Atom.Auxiliary.value };
    return { ...recorded, vars: Map.insert(Atom.ordVar)(
      new Atom.FreshVar(path, role))(info)(recorded.vars) };
  };
  return { problem, withSpread };
};
