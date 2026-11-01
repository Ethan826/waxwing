// A2 Task 13's M-B differential (spec §8, M-C: test only) and its
// regression probe, spread into r0A2Probes (test/regression-r0-a2.mjs);
// the row is in scripts/regression-r0-a2-mb.mjs. Bounded agreement on
// exercised inputs only; not E12 exhaustiveness, not soundness (the
// author's D6 ruling). `differential` runs on any build's modules, so
// the probe loads the clone's and test/r0-a2-mb.test.mjs the healthy
// build's.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';
import { collector } from './r0-a2-mb-collector.mjs';
import { everyValuation, leastTerms, pinned } from './r0-a2-mb-graph.mjs';
import { c2c, c7, sources, validateCases }
  from './regression-r0-a2-validate.mjs';

export const scope = 'bounded agreement on exercised inputs only; '
  + 'not E12 exhaustiveness, not soundness';

// Task 11's case packages (test/r0-a2-cases.test.mjs and
// test/r0-a2-validate.test.mjs), as [name, problem, input].
export const validateList = cases => {
  const { problemOf, honest, role, isFrame, labelled, user, closed, M, N }
    = cases;
  const deferred = (effect, mark) => variable => role(variable)
    === 'EffectOf' ? labelled(user(effect, mark)) : closed;
  const frameM = position => isFrame(position) ? M : N;
  const of = (name, source, decl, options) => {
    const problem = problemOf(source, decl);
    return [name, problem, honest(problem, options)];
  };
  const c15 = problemOf(sources.c15, 'use2');
  const c15Rigid = honest(c15, { terms: frameM, rows: variable =>
    role(variable) === 'EffInst' ? cases.rigidTail(
      c15.effects.effectRigids[0]) : deferred(1, M)(variable) });
  return [
    of('id', sources.id, 'id', {}),
    of('C2(b) d at M', sources.c2, 'work', { rows: deferred(0, M) }),
    of('C2(b) d at N', sources.c2, 'work', { rows: deferred(0, N) }),
    ['C2(c)', c2c(cases).problem, c2c(cases).input],
    of('C3', sources.c3, 'g', {}),
    of('C5', sources.c5, 'main', {}),
    ['C7(a)', c7(cases).problem, c7(cases).input],
    of('C13', sources.c13, 'use', { terms: frameM }),
    of('C1 A', sources.c1, 'use', { terms: frameM, rows: deferred(1, M) }),
    of('C1 A\'', sources.c1, 'use', { terms: () => N,
      rows: deferred(1, M) }),
    ['C15 rigid', c15, c15Rigid],
    of('C15 least', sources.c15, 'use2', { rows: deferred(1, N) }),
    of('C16', sources.c16, 'use3', { terms: frameM, rows: deferred(0, M) })
  ];
};

const forgedTerm = term => term === 'N' ? 'M' : 'N';

export const differential = cases => {
  const { P, J, Maps, Effect, describe } = cases;
  const collect = collector(cases);
  const toTerm = term => term === 'N' ? P.TermN.value
    : term === 'M' ? P.TermM.value : J(...term);
  const withTerm = (input, position, term) => ({ ...input,
    marks: Maps.insert(Effect.ordPosition)(position)(toTerm(term))(
      input.marks) });
  // The pinned M-B verdict and the validator's on one package.
  const judgeBoth = (problem, input) => {
    const pc = cases.context(problem, input).package;
    const { graph, terms, gaps } = collect(problem, pc);
    const missing = [...terms].filter(([, term]) => term === undefined);
    const rigid = problem.effects.rigidMarks;
    const valuations = everyValuation(pinned(graph, [...terms.keys()]
      .filter(node => terms.get(node) !== undefined),
    node => terms.get(node)), rigid);
    return { graph, terms, gaps: [...gaps, ...missing.map(([node]) =>
      [-1, `no term at ${node}`])], valuations,
    mb: gaps.length === 0 && missing.length === 0
      && valuations.failing.length === 0,
    validator: describe(cases.judge(problem, input)) };
  };
  // The case package, then one forgery per position (statements §3: a
  // position is a package-supplied term). `terms` lists the positions'
  // nodes in `positions` order.
  const variants = (name, problem, input) => {
    const base = { name, problem, input, ...judgeBoth(problem, input) };
    const nodes = [...base.terms.keys()];
    return [base, ...problem.effects.positions.flatMap((position, index) => {
      const term = base.terms.get(nodes[index]);
      if (term === undefined) return [];
      const forged = withTerm(input, position, forgedTerm(term));
      return [{ name: `${name} forged at ${nodes[index]}`, problem,
        input: forged, forgedAt: index, ...judgeBoth(problem, forged) }];
    })];
  };
  const leastOf = (problem, input, graph, terms) => {
    const least = leastTerms(graph, [...terms.keys()]);
    const positions = problem.effects.positions;
    return positions.reduce((made, position, index) => withTerm(made,
      position, least.get([...terms.keys()][index])), input);
  };
  return { judgeBoth, variants, leastOf, withTerm };
};

// Disagreements of direction 1: the validator accepts, M-B does not.
export const acceptedButFailing = runs => runs.filter(run =>
  run.validator === 'Right' && !run.mb).map(run =>
  `${run.name}: judgeObligations accepts; M-B refuses (gaps ${
    JSON.stringify(run.gaps)}, failing valuations ${
    JSON.stringify(run.valuations.failing)})`);

export const a2MbProbes = {
  // Task 13: an edge kind dropped from the validator; a package it now
  // accepts fails the pinned M-B graph.
  'r0-a2-mb-detects': async context => {
    const { load } = await toolkit(context);
    const cases = await validateCases(load);
    const mb = differential(cases);
    const runs = validateList(cases).flatMap(([name, problem, input]) =>
      mb.variants(name, problem, input));
    const found = acceptedButFailing(runs);
    if (found.length > 0) fail(`accepted packages pass the pinned graph: ${
      found.join('; ')}`);
    passed(context);
  }
};
