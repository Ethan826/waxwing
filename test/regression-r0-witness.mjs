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
import { restReadFrom, slotReadFrom } from './r0-readback-rest.mjs';
import { forgedFrom, id2Source } from './r0-forged-witness-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const load = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const loaded = async context => witnessFrom(load(context));
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
  // R022: a row slot's bare hole read as a type: G0 refused σ as not
  // generic; since §18.172 the package's read fault declines it first.
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
  },
  // Task 4.4b's carry: a named rest's bare hole reads as lowering reads
  // it (a type), not as a row tail.
  'r0-readback-sort-everywhere': async context => {
    const w = await loaded(context);
    const read = (await restReadFrom(load(context), w.online))();
    const found = read.value0.constructor.name;
    if (found !== 'TVar') fail(`the rest's bare hole read as ${found}`);
    passed(context);
  },
  // Review minor 2: a constructor pattern's slot reads plainly too.
  'r0-readback-pattern-slot-sorted': async context => {
    const w = await loaded(context);
    const read = (await slotReadFrom(load(context), w.online))();
    const found = read.value0.constructor.name;
    if (found !== 'TVar')
      fail(`the pattern slot's bare hole read as ${found}`);
    passed(context);
  },
  // BACKLOG R026: `id2`'s pre-default bindings forged to `Bool` must be
  // refused by the check, not Solved and built into ill-typed IR.
  'r0-certified-split': async context => {
    const { outcomeOf, toBool } = await forgedFrom(load(context));
    const found = outcomeOf(id2Source, 'id2', toBool);
    if (found.verdict === 'Solved')
      fail(`id2 forged to Bool was Solved: ${found.attempts.join(', ')}`);
    passed(context);
  }
};
