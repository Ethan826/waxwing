// A2 Task 15's property tallies (spec §11's owed checks), shared by
// test/r0-a2-properties.test.mjs (the healthy build) and this file's
// regression probes (a clone's build; rows in
// scripts/regression-r0-a2-props.mjs). `propertiesOf` loads nothing but
// through the loader it is given. Every tally is over the case packages
// below, so each result is fixture-level.
import { fail, passed, shape, toolkit }
  from './regression-r0-amin-support.mjs';
import { absentPair, c2c, c7, sources, validateCases }
  from './regression-r0-a2-validate.mjs';

const local = {
  // The lane fixtures of test/r0-a2-complete.test.mjs: C6 and a closed C.
  c6: 'type E = E; fn k(): Unit with Fail(E) = '
    + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;',
  closedC: 'effect Ask { fn ask(): Unit; }; '
    + 'fn mk3(): Handler(nofail Ask with pure) with pure'
    + ' = handler Ask { ask() => () }; '
    + 'fn use4(): Unit = with mk3() { () }; fn main(): Unit = ();',
  // G0 accepts with y absent (y left flexible), and refuses (show).
  unusedId: 'fn f(): Int = { let g = fn(y) => y; 0 }; fn main(): Int = 0;',
  unusedShow: 'fn f(): Int = { let g = fn(y) => show(y); 0 }; '
    + 'fn main(): Int = 0;'
};
const declarations = [['c1', 'use'], ['c1', 'mk'], ['c2', 'work'],
  ['c2c', 'work'], ['c3', 'g'], ['c5', 'main'], ['c7', 'g'], ['c7b', 'id2'],
  ['c13', 'use'], ['c15', 'use2'], ['c15', 'mk2'], ['c16', 'use3'],
  ['id', 'id'], ['c6', 'k'], ['closedC', 'use4'], ['unusedId', 'f'],
  ['unusedShow', 'f']];

// Structural equality through the shared `shape` (constructor names and
// fields). Safe here: the values compared are package images, terms and
// `Maybe`s of them, PureScript data with no functions or cycles, so
// equal shapes are equal values.
export const same = (one, other) =>
  JSON.stringify(shape(one)) === JSON.stringify(shape(other));

const fixtures = cases => {
  const { P, Atom, Hole, honest, pkg, problemOf, closed, user, labelled,
    role, isFrame, M, N } = cases;
  const int = new P.PBase(Atom.IntBase.value);
  const bool = new P.PBase(Atom.BoolBase.value);
  const deferred = (effect, mark) => variable =>
    role(variable) === 'EffectOf' ? labelled(user(effect, mark)) : closed;
  const frameM = position => isFrame(position) ? M : N;
  const rigidInst = problem => variable => role(variable) === 'EffInst'
    ? cases.rigidTail(problem.effects.effectRigids[0]) : closed;
  // Per source, the `honest` options of spec §12's variants (tests
  // r0-a2-cases and r0-a2-validate), beside `{}` and `honest()`.
  const variants = {
    c1: [() => ({ terms: frameM, rows: deferred(1, M) }),
      () => ({ rows: deferred(1, M) }), () => ({ types: () => bool })],
    c2: [() => ({ rows: deferred(0, M) }), () => ({ rows: deferred(0, N) })],
    c13: [() => ({ terms: frameM })],
    c15: [problem => ({ terms: frameM, rows: rigidInst(problem) })],
    c16: [() => ({ terms: frameM, rows: deferred(0, M) })]
  };
  const packagesOf = ([source, name]) => {
    const problem = problemOf(sources[source] ?? local[source], name);
    const options = [() => ({}), ...variants[source] ?? []];
    return [{ at: `${source}#${name} {}`, problem, input: pkg({}) },
      ...options.map((option, index) => ({ at: `${source}#${name} ${index}`,
        problem, input: honest(problem, option(problem)) }))];
  };
  // C7(b): y's variable the bare hole 0, every other type Int.
  const holed = () => {
    const problem = problemOf(sources.c7b, 'id2');
    return { at: 'c7b#id2 holed', problem, input: honest(problem,
      { types: variable => role(variable) === 'Param'
        ? new P.PVar(Hole.holeVar(0)) : int }) };
  };
  return { int, bool, holed, casePackages: [
    ...declarations.flatMap(packagesOf),
    { at: 'c2c#work c2c', ...c2c(cases) }, { at: 'c7#g c7', ...c7(cases) },
    { at: 'c7b#id2 absent', ...absentPair(cases) }, holed()] };
};

export const propertiesOf = async load => {
  const cases = await validateCases(load);
  const Dependency = await load('Features.Check.Strategy.Effects.Dependency');
  const Equal = await load('Features.Check.Strategy.Effects.Equal');
  const Row = await load('Domain.Row');
  const { Tuple } = await load('Data.Tuple');
  const { P, Atom, Effect, Maps, Sets, Package, Complete, labelled, closed,
    M, N } = cases;
  const made = fixtures(cases);
  const completedOf = (problem, input) => Complete.complete(problem)(input);
  const accepts = (problem, substitution) =>
    cases.Substitution.certify(problem)(substitution).constructor.name
      === 'Right';

  // The case packages and, from each, every package with one of its
  // bound type or row variables left out.
  const g0Packages = () => made.casePackages.flatMap(item => [item,
    ...cases.flexTypes(item.problem).filter(key =>
      Maps.member(Atom.ordVar)(key)(item.input.types)
      || Maps.member(Atom.ordVar)(key)(item.input.rows)).map(key => ({
      ...item, at: `${item.at} -${cases.role(key)}`, input: { ...item.input,
        types: Maps.delete(Atom.ordVar)(key)(item.input.types),
        rows: Maps.delete(Atom.ordVar)(key)(item.input.rows) } }))]);
  // G0 on erase (settle P_in) against G0 on erase P_c.
  const g0Tally = () => {
    const found = { both: 0, absent: [], completedOnly: [], neither: 0,
      violations: [] };
    // Some flexible type or row variable the input leaves out.
    const leaves = (problem, input) => cases.flexTypes(problem).some(key =>
      !Maps.member(Atom.ordVar)(key)(input.types)
      && !Maps.member(Atom.ordVar)(key)(input.rows));
    for (const { at, problem, input } of g0Packages()) {
      const before = accepts(problem, Package.erase(Package.settle(input)));
      const after = accepts(problem, Package.erase(Complete.settledOf(
        completedOf(problem, input))));
      if (before && after && leaves(problem, input)) found.absent.push(at);
      if (before && after) found.both += 1;
      else if (before) found.violations.push(at);
      else if (after) found.completedOnly.push(at);
      else found.neither += 1;
    }
    return { ...found, packages: g0Packages().length };
  };

  // The check `judgeObligations` runs for one obligation (Effects.Validate
  // `judgeOne`), as a comparable string.
  const checks = { Consume: cases.Consume.consumeCheck,
    HandlerLit: cases.Sites.handlerLitCheck,
    Install: cases.Sites.installCheck, Defer: cases.Sites.deferCheck,
    Entry: cases.Sites.entryCheck,
    FailConcrete: cases.Sites.failConcreteCheck };
  const judgedOf = (problem, input, obligation) => {
    const context = { rigidMarks: problem.effects.rigidMarks,
      package: Complete.settledOf(completedOf(problem, input)) };
    const judged = obligation instanceof Effect.Equal
      ? Equal.equalCheck(context)(obligation.value0)(obligation.value1)
      : checks[obligation.constructor.name](context)(obligation.value0);
    return judged.constructor.name === 'Right' ? 'Right'
      : `Left ${judged.value0.check} ${judged.value0.limit}`;
  };
  // Every node of spec §5.1: flexible type and row variables, effect
  // variables, recorded positions.
  const nodesOf = problem => [
    ...cases.flexTypes(problem).map(key => new Dependency.NodeVar(key)),
    ...problem.effects.flexEff.map(key => new Dependency.NodeEff(key)),
    ...problem.effects.positions.map(key => new Dependency.NodePos(key))];
  const consoleAt = mark =>
    ({ effect: Row.ConsoleEffect.value, args: [], mark });
  const arrow = new P.PArrow(made.int, labelled(consoleAt(M)), made.int);
  const record = name => ({ fields: [new Tuple(name, made.bool)], tails: [] });
  // Other images for the node; one equal to the package's own is left out.
  const perturbed = (problem, input, node) => {
    const at = (map, ord, images) => images.filter(image => !same(
      Maps.lookup(ord)(node.value0)(map), new cases.Just(image)))
      .map(image => Maps.insert(ord)(node.value0)(image)(map));
    if (node instanceof Dependency.NodePos)
      return at(input.marks, Effect.ordPosition, [N, M])
        .map(marks => ({ ...input, marks }));
    if (node instanceof Dependency.NodeEff)
      return at(input.effects, Effect.ordEVar, [closed,
        labelled(consoleAt(M)), labelled(consoleAt(N))])
        .map(effects => ({ ...input, effects }));
    const { sort } = Maps.lookup(Atom.ordVar)(node.value0)(problem.vars)
      .value0;
    if (sort instanceof Atom.SortRow)
      return at(input.rows, Atom.ordVar, [record('zz'), record('zy')])
        .map(rows => ({ ...input, rows }));
    return at(input.types, Atom.ordVar, [made.bool, cases.unit, arrow])
      .map(types => ({ ...input, types }));
  };
  // Each obligation's nodes outside its mentions and outside Dep.
  const outsideOf = (problem, obligation) => {
    const dep = Dependency.dependencySet(problem);
    const mentioned = Dependency.mentions(obligation);
    const member = set => node => Sets.member(Dependency.ordNode)(node)(set);
    return nodesOf(problem).filter(node => !member(dep)(node)
      && !member(mentioned)(node));
  };
  const depTally = () => {
    const found = { triples: 0, runs: 0, wellFormed: 0, failing: 0,
      changed: [], distinct: new Set() };
    const perturbing = (at, problem, input, index, before) => (node, nth) => {
      found.triples += 1;
      found.distinct.add(`${at.split(' ')[0]} ${index} ${nth}`);
      for (const changed of perturbed(problem, input, node)) {
        found.runs += 1;
        if (cases.prerequisites(problem, changed).constructor.name
          === 'Right') found.wellFormed += 1;
        const after = judgedOf(problem, changed, placedAt(problem, index));
        if (after !== before) found.changed.push(
          `${at} obligation ${index}: ${before} -> ${after}`);
      }
    };
    const placedAt = (problem, index) =>
      problem.effects.obligations[index].value;
    for (const { at, problem, input } of made.casePackages)
      problem.effects.obligations.forEach(({ value }, index) => {
        if (value instanceof Effect.Unsupported) return;
        const before = judgedOf(problem, input, value);
        if (before !== 'Right') found.failing += 1;
        outsideOf(problem, value).forEach(
          perturbing(at, problem, input, index, before));
      });
    return found;
  };
  // The potency control: the same perturbations at nodes INSIDE an
  // obligation's mentions, the changed runs counted by node kind.
  const insideTally = () => {
    const found = { runs: 0, changed: { NodeVar: 0, NodeEff: 0, NodePos: 0 } };
    for (const { problem, input } of made.casePackages)
      for (const { value } of problem.effects.obligations) {
        if (value instanceof Effect.Unsupported) continue;
        const before = judgedOf(problem, input, value);
        const mentioned = Dependency.mentions(value);
        for (const node of nodesOf(problem).filter(item =>
          Sets.member(Dependency.ordNode)(item)(mentioned)))
          for (const changed of perturbed(problem, input, node)) {
            found.runs += 1;
            if (judgedOf(problem, changed, value) !== before)
              found.changed[node.constructor.name] += 1;
          }
      }
    return found;
  };
  return { cases, ...made, completedOf, accepts, g0Tally, depTally,
    insideTally };
};

const probe = check => async context => {
  const { load } = await toolkit(context);
  check(await propertiesOf(load));
  passed(context);
};

export const a2PropsProbes = {
  // Task 15, spec §4's owed property: G0 accepts erase P_c whenever it
  // accepts erase (settle P_in), on the case packages.
  'r0-a2-props-g0-monotone': probe(properties => {
    const { violations } = properties.g0Tally();
    if (violations.length > 0)
      fail(`G0 monotonicity: erase P_c refused at ${violations.join('; ')}`);
  }),
  // Task 15, spec §5.1: a node outside an obligation's mentions and Dep
  // leaves its Judged unchanged.
  'r0-a2-props-dep-complete': probe(properties => {
    const { changed } = properties.depTally();
    if (changed.length > 0)
      fail(`Dep completeness: ${changed.slice(0, 3).join('; ')}`);
  })
};
