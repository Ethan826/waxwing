// A2 Task 12's regression probes (spec §6, Decide's readings and the
// record-defect block), spread into a2PrereqProbes
// (test/regression-r0-a2-prereq.mjs); the rows are in
// scripts/regression-r0-a2-decide.mjs. `defectCases` builds the fixtures
// from any build's modules, so the probes load the clone's and
// test/r0-a2-decide.test.mjs the healthy build's.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stubsFrom } from './r0-stubs.mjs';

// test/fx008-probes/witness/famw.wxw (as in
// test/regression-r0-a2-prereq.mjs, which imports this file, so the
// source is repeated rather than imported).
const famw = 'type Job(a) = Job(a); '
  + 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn use(h: Handler(Log with Fail(Job(Int)))): Int = 0; '
  + 'fn main(): Unit with Console = { let h = handler Log { log(n) => '
  + 'Fail.fail(Job(n)) }; Console.print(use(h)) };';
const clash = 'fn f(): Int = 1 + true;\nfn main(): Int = 0;\n';

// Spec §12 C4: famw's `main` with its `ClauseIntoC` consume recorded
// non-bare (famw installs nothing, so it records no `AtInstalledC`; as
// test/r0-a2-record.test.mjs), and that obligation's provenance. A
// recorded problem is its fields at run time (a newtype).
export const defectCases = async load => {
  const stubs = await stubsFrom(load);
  const Effect = await load('Domain.Recorded.Effect');
  const problem = stubs.recorded.problem(famw, 'main');
  const obligations = problem.effects.obligations;
  const index = obligations.findIndex(placed =>
    placed.value instanceof Effect.Consume
    && placed.value.value0.site instanceof Effect.ClauseIntoC);
  if (index < 0) throw new Error('famw records no ClauseIntoC');
  const flipped = placed => ({ ...placed, value: new Effect.Consume(
    { ...placed.value.value0, bare: false }) });
  const mutant = { ...problem, effects: { ...problem.effects,
    obligations: obligations.map((placed, at) =>
      at === index ? flipped(placed) : placed) } };
  return { stubs, mutant, plain: stubs.recorded.problem(clash),
    provenance: obligations[index].provenance };
};

const fail = message => {
  console.error(message);
  process.exit(1);
};
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const reasonOf = result => {
  const verdict = result.value0.verdict;
  return verdict.constructor.name !== 'Unresolved' ? []
    : [verdict.value0.reason.constructor.name,
      ...[verdict.value0.reason.value0].flat()
        .map(item => item.constructor.name)];
};

export const a2DecideProbes = {
  // Task 12 (spec §6, C4(b)): with no strategy at all, the record defect
  // still blocks, first, as `Unsupported RecordDefective`.
  'r0-a2-defect-block': async context => {
    const { stubs, mutant } = await defectCases(loader(context));
    const found = reasonOf(stubs.decide(stubs.checking({}), mutant));
    if (found.slice(0, 2).join(' ') !== 'Unsupported RecordDefective')
      fail(`a record defect not blocked: ${found.join(' ')}`);
    passed(context);
  },
  // Task 12 (spec §6): a `NotCertifiable` limitation declines; it is not
  // a refused candidate.
  'r0-a2-limit-declines': async context => {
    const load = loader(context);
    const { stubs, plain, provenance } = await defectCases(load);
    const Search = await load('Domain.Verdict.Search');
    const Verdict = await load('Domain.Verdict');
    const refusal = new Search.NotCertifiable(Search.RigidExact.value,
      { provenance, check: 0 });
    const result = stubs.decide(stubs.checking({ strategies: [
      stubs.behaviours.refusing(Verdict.ClaimsComplete.value, refusal)] }),
    plain);
    const found = reasonOf(result);
    if (found.join(' ') !== 'Unsupported EffectLimit'
      || result.value0.searchFaults.length > 0)
      fail(`a limitation read as a refused candidate: ${found.join(' ')}`);
    passed(context);
  }
};
