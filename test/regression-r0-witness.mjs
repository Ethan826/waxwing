// Task 4.4's regression probes, imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`, and reads constructors by that compiler's
// classes, never by decoding through the main output.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fieldSource, routeSource, witnessFrom }
  from './r0-witness-support.mjs';
import { r022Probes } from './r0-r022-probes.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const loaded = async context => witnessFrom(name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js'))));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const problemOf = (w, source, name) =>
  w.online.problemOf(w.online.programOf(source), name);

export const r0WitnessProbes = {
  // Cov's domain includes the auxiliaries: a witness missing one is
  // refused.
  'r0-cov-skipped': async context => {
    const w = await loaded(context);
    const problem = problemOf(w, fieldSource, 'field');
    const found = w.online.search(w.online.programOf(fieldSource), problem);
    const made = w.witnessOf(problem, found.value0.unsettled);
    const [aux] = w.flexible(problem).filter(([, info]) =>
      info.position instanceof w.Atom.Auxiliary);
    const result = w.coverage(problem, { ...made.value0,
      bindings: w.without(made.value0.bindings, aux[0]) });
    if (result.constructor.name !== 'Left')
      fail(`a witness missing an auxiliary passed Cov: ${result
        .constructor.name}`);
    passed(context);
  },
  // W §1.5's example: `route`'s `u` left to `{}` breaks `B`.
  'r0-hole-contract-skipped': async context => {
    const w = await loaded(context);
    const problem = problemOf(w, routeSource, 'route');
    const slot = index => w.flexible(problem).find(([variable]) =>
      variable.value1 instanceof w.Atom.Inst
      && variable.value1.value0 === index)[0];
    const sigma = w.substitution([[slot(0), w.holeRow(0)],
      [slot(1), w.rigidRow(0)], [slot(2), w.rigidRow(1)],
      [slot(3), w.rigidRow(2)]]);
    const found = w.reasonName(w.witnessOf(problem, sigma));
    if (found !== 'HoleContract')
      fail(`route's defaulted u was witnessed: ${found}`);
    passed(context);
  },
  // R022: a row slot's bare hole read as a type makes σ not generic, so
  // G0 refuses what today accepts.
  'r0-readback-sort-blind': async context => {
    const w = await loaded(context);
    for (const { origin, source } of r022Probes) {
      const program = w.online.programOf(source);
      const [attempt] = w.online.decisionOf(program, 'g').value0.attempts;
      if (attempt.constructor.name !== 'Accepted')
        fail(`${origin}: the read-back σ was refused: `
          + `${attempt.constructor.name} ${attempt.value2.constructor.name}`);
    }
    passed(context);
  },
  // The amendment: R022's probes hold their atoms at `{}`.
  'r0-hole-arm-defaults-skipped': async context => {
    const w = await loaded(context);
    for (const { origin, source } of r022Probes) {
      const program = w.online.programOf(source);
      const [attempt] = w.online.decisionOf(program, 'g').value0.attempts;
      const found = w.reasonName(attempt.value2);
      if (found !== 'Witnessed')
        fail(`${origin}: no witness at the default: ${found}`);
    }
    passed(context);
  }
};
