// Tranche 2 Task 13, ruling §18.155 (8)'s test (design §D): generation
// records a consumption `Consume … AtStage k` of each stage a partial
// application supplies (Generate/Consume.purs `partialStages`), which
// the live checker does not perform. The claim tested, for those stages
// only: each such row is traced unconstrained (the trace's row and the
// package's are a bare hole tail with no labels), settles empty (the
// validator's own `settle`, Effects.Package), and its consumption
// obligation passes (the validator's exported `consumeCheck` on the
// settled completed package `validate` returned, the context
// `judgeObligations` builds). The validator is called, never changed.
//
// The stages are found by generation's rule, not by their shape: a
// `Consumed (AtStage k)` obligation at a path whose checked node is a
// Call, Construct or Perform given fewer arguments than the arity
// recorded there. `stagesCheck(load)` gives
// `(problem, live, package, completed) → [{ at, problems }]`, one entry
// per such stage; `completed` is null when the package was refused,
// and then the consumption is not checked and the stage says so among
// its problems (it never reads as passing).
const named = value => value.constructor.name;

const argumentsOf = node => {
  switch (named(node)) {
    case 'Call': case 'Construct': return node.value2;
    case 'Perform': return node.value3;
    default: return null;
  }
};

const bareHole = row => row.labels.length === 0
  && named(row.tail) === 'Just' && named(row.tail.value0) === 'PTailHole';

export const stagesCheck = async load => {
  const { fields } = await load('Domain.Recorded');
  const Origin = await load('Domain.Recorded.Origin');
  const Effect = await load('Domain.Recorded.Effect');
  const Maps = await load('Data.Map.Internal');
  const Sites = await load('Features.Check.Strategy.ReadBack.EffectSites');
  const Package = await load('Features.Check.Strategy.Effects.Package');
  const { settledOf } = await load('Features.Check.Strategy.Effects.Complete');
  const { consumeCheck } =
    await load('Features.Check.Strategy.Effects.Consume');
  const lookupPath = (key, map) => Maps.lookup(Origin.ordPath)(key)(map);
  const lookupEVar = (key, map) => Maps.lookup(Effect.ordEVar)(key)(map);
  const just = found => (named(found) === 'Just' ? found.value0 : null);

  // A partial use's supplied stage: the obligation's site record, its
  // stage variable and its path, or null for any other obligation.
  const partialStage = (view, body) => placed => {
    const obligation = placed.value;
    const provenance = placed.provenance;
    if (named(obligation) !== 'Consume' || named(provenance) !== 'AtSite')
      return null;
    const site = obligation.value0;
    const { path, role } = provenance.value0;
    if (named(site.site) !== 'AtStage' || named(role) !== 'Consumed')
      return null;
    const arity = just(lookupPath(path, view.effects.arities));
    const expr = just(Sites.exprAt(body)(path));
    const given = expr === null ? null : argumentsOf(expr.value0.node);
    if (arity === null || given === null || given.length >= arity)
      return null;
    return { site, path, variable: just(site.source.tail) };
  };

  // The source is the stage's own row `⟨p, Stage k⟩` with no labels
  // (Generate/Obligation.purs `stageRow`).
  const ownStage = stage => {
    const variable = stage.variable;
    return stage.site.source.labels.length === 0 && variable !== null
      && named(variable) === 'EffFresh'
      && Origin.eqPath.eq(variable.value0)(stage.path)
      && named(variable.value1) === 'Stage'
      && variable.value1.value0 === stage.site.site.value0;
  };

  // The trace's row for the stage, as the read-back finds it: a bare
  // meta (no labels) is what "traced unconstrained" means on that side.
  const tracedBare = (live, variable) => {
    const read = Sites.tracedRow(live.trace)(live.function.body)(variable);
    if (named(read) !== 'Right') return false;
    const row = just(read.value0);
    return row !== null && unlabelled(row);
  };
  const unlabelled = row => named(row) === 'Row'
    ? row.value0.length === 0 && named(row.value1) === 'Just'
      && named(row.value1.value0) === 'Hole'
    : false;

  return (problem, live, pkg, completed) => {
    const view = fields(problem);
    const found = view.effects.obligations
      .map(partialStage(view, live.function.body)).filter(Boolean);
    return found.map(stage => {
      const problems = [];
      if (!ownStage(stage)) problems.push('not the stage\'s own row');
      const row = stage.variable === null ? null
        : just(lookupEVar(stage.variable, pkg.effects));
      if (row === null || !bareHole(row)) problems.push('not a bare hole');
      if (stage.variable !== null && !tracedBare(live, stage.variable))
        problems.push('trace not bare');
      const settled = row === null ? null
        : just(lookupEVar(stage.variable, Package.settle(pkg).effects));
      if (settled === null || settled.labels.length > 0
        || named(settled.tail) !== 'Nothing')
        problems.push('does not settle empty');
      if (completed === null) problems.push('consumption unchecked: '
        + 'the package was refused');
      else {
        const context = { package: settledOf(completed),
          rigidMarks: view.effects.rigidMarks };
        if (named(consumeCheck(context)(stage.site)) !== 'Right')
          problems.push('consumption fails');
      }
      return { path: stage.path, problems };
    });
  };
};
