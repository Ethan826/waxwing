// The compiler with its re-examination passes observed (tranche 1, Task
// 0.2). `improve` is Features.Check.RowMerge.Improve's only export; its
// pass count and `bound` are local to `pass` and its `tailRecM` loop, so
// no wrapper of `improve` sees a pass. This copies a built output/ and
// patches the copy, as stream 7b's instrument.mjs does (its
// `patchedCopy`, imported): appended to the copy's Improve module, a
// reassignment of the module's own `pass` reports each pass and then
// calls the original. `pass` and `bound` are module-level `var`s in
// purs's output and `improve` looks `pass` up at each call, so the
// reassignment takes effect. No compiler source is changed.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { patchedCopy }
  from '../research/division-campaign/integration/measure/instrument.mjs';
import { repoRoot } from './r0-corpus.mjs';
import { fiveOrders, mulberry, permProblem, rawProblem, shapedProblem }
  from './row-merge-gen.mjs';

export const improveModule = 'Features.Check.RowMerge.Improve';

// The declarations the patch reassigns or reads; one missing means the
// output changed and the patch would measure nothing, so the helper
// fails instead.
const declarations = ['var pass = function (unify)',
  'var bound = function (subst)'];

// One rescan is one `pass(unify)` closure; `found.start` is the same
// for its every pass, so its bound is computed once. Each pass reports
// the rescan's own counter, `found.passes` (the passes before it that
// changed the state), and the rescan's bound.
const recorder = `pass = (original => unify => {
  const inner = original(unify);
  let limit;
  return found => {
    limit ??= bound(found.start);
    globalThis.__wxPass?.({ passes: found.passes, bound: limit });
    return inner(found);
  };
})(pass);`;

const checkDeclared = from => {
  const file = join(from, improveModule, 'index.js');
  if (!existsSync(file)) throw new Error(`${file}: build first`);
  const text = readFileSync(file, 'utf8');
  const missing = declarations.filter(line => !text.includes(line));
  if (missing.length > 0) {
    throw new Error(`${improveModule} no longer declares `
      + `${missing.join(', ')}: the pass recorder would measure nothing`);
  }
};

const newMeasure = () => ({ passes: 0, rescans: 0, ratio: 0, worst: null });

const noted = (measure, report) => {
  measure.passes += 1;
  if (report.passes === 0) measure.rescans += 1;
  const ratio = report.passes / report.bound;
  if (ratio > measure.ratio) {
    measure.ratio = ratio;
    measure.worst = report;
  }
};

// The passes made while `action` runs: { passes, rescans, ratio, worst },
// `ratio` the largest `found.passes` / bound reported, `worst` that
// pass's report; `value` is what `action` returned.
const measured = action => {
  const measure = newMeasure();
  globalThis.__wxPass = report => noted(measure, report);
  try {
    const value = action();
    return { ...measure, value };
  } finally {
    globalThis.__wxPass = undefined;
  }
};

// The patched copy of `from` (default: the repository's output/) under
// `scratch`, with its `compile`, test/row-merge-entry.mjs loaded on it
// (`entry`), `measured`, and `remove` (deletes the copy).
export const measuringCompiler = async (scratch,
  from = join(repoRoot, 'output')) => {
  checkDeclared(from);
  const copy = join(scratch, 'output');
  patchedCopy(from, copy, { [improveModule]: recorder },
    'R0 Task 0.2 pass recorder');
  const load = name =>
    import(pathToFileURL(join(copy, name, 'index.js')).href);
  const { compile } = await load('Program.Compile');
  const previous = process.env.WAXWING_OUTPUT;
  process.env.WAXWING_OUTPUT = copy;
  const entry = await import(
    `./row-merge-entry.mjs?output=${encodeURIComponent(copy)}`);
  if (previous === undefined) delete process.env.WAXWING_OUTPUT;
  else process.env.WAXWING_OUTPUT = previous;
  const remove = () => rmSync(copy, { recursive: true, force: true });
  return { compile, entry, measured, remove };
};

// The decision rule's domain (plan Task 0.2, fixed before running): the
// five families of test/row-merge-gen.mjs as test/row-merge.test.mjs
// drives them, each problem from its own seed 1..2000, in its five
// orders; and every corpus program, compiled. Every run counts, valid
// or not.
export const families = [
  ['raw (perm.mjs)', rnd => permProblem(rnd, false)],
  ['dense (perm.mjs DENSE=1)', rnd => permProblem(rnd, true)],
  ['raw (programs-gen.mjs)', rnd => rawProblem(rnd)],
  ['program-shaped', rnd => shapedProblem(rnd, false)],
  ['program-shaped, shared', rnd => shapedProblem(rnd, true)],
];
export const seeds = 2000;

const newSummary = () =>
  ({ runs: 0, passes: 0, rescans: 0, ratio: 0, worst: null });

const counted = (summary, where, measure) => {
  summary.runs += 1;
  summary.passes += measure.passes;
  summary.rescans += measure.rescans;
  if (measure.ratio > summary.ratio) {
    summary.ratio = measure.ratio;
    summary.worst = { where, ...measure.worst };
  }
};

// One family's runs: { runs, passes, rescans, ratio, worst }.
export const familyRuns = (compiler, generate) => {
  const summary = newSummary();
  for (let seed = 1; seed <= seeds; seed++) {
    const rnd = mulberry(seed);
    const problem = generate(rnd);
    fiveOrders(rnd, problem.cs).forEach((order, index) => counted(summary,
      { seed, order: index },
      compiler.measured(() => compiler.entry.run(problem.hyp, order))));
  }
  return summary;
};

// The corpus's runs: each program compiled through the copy.
export const corpusRuns = (compiler, entries) => {
  const summary = newSummary();
  for (const { origin, source } of entries) {
    counted(summary, { origin },
      compiler.measured(() => compiler.compile(source)));
  }
  return summary;
};
