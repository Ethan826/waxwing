// Tranche 2 Task 13 regression probes (honest packages through I3 and
// the validator); the rows are in scripts/regression-r0-t2-honest.mjs.
// Each loads modules from the compiler under test only
// (`context.load`), and the gate's from its own copy of test/.
import { fail, passed } from './regression-r0-amin-support.mjs';
import { gateCases } from './r0-t2-honest-gate-cases.mjs';
import { honestReport } from './r0-t2-honest-report.mjs';
import { annotated } from './r0-t2-honest-annotated.mjs';

// Ruling (8)'s fixture: `part` drops one stage of `two`, `both` one of
// `two` and two of `three`, `adder` one of `two` (Calls); `mk` one of
// the constructor `Pair` (a Construct); `putter` one of `Log.put` (a
// Perform).
const stages = `effect Log {
  fn log(n: Int): Unit;
  fn put(k: Int, v: Int): Unit;
};
type Pair = Pair(Int, Int);
fn two(x: Int, y: Int): Int with Log = { Log.log(x); x + y };
fn three(x: Int, y: Int, z: Int): Int = x + y + z;
fn part(): Int -> Int with Log = two(1);
fn both(): Int with Log = { let f = two(1); let g = three(1, 2); f(g(3)) };
fn adder(x: Int): Int -> Int with Log = two(x);
fn mk(): Int -> Pair = Pair(1);
fn putter(): Int -> Unit with Log = Log.put(1);
fn main(): Unit with Console = Console.print(1);
`;
const dropped = 7;

// Every must-fail case: each must name a problem; the gate's own
// observation must name none.
const mustFail = ['extraRefusal', 'removedEntry', 'belowFloor',
  'acceptedRefused', 'malformed', 'extraFault', 'missingFault',
  'otherRefusal', 'differentG0', 'fourUnjudged', 'vanishedRefusal',
  'newRefusal', 'withoutRepin', 'repinVanish', 'repinLowered',
  'repinMissing'];
const mustHold = ['holds', 'admitted', 'explainedVanish', 'repinHolds'];

export const t2HonestProbes = {
  'r0-t2-honest-gate': async context => {
    const cases = gateCases();
    const holding = mustFail.filter(name => cases[name]().length === 0);
    const wrong = [...mustHold.flatMap(name => cases[name]()),
      ...(cases.repinKeeps().length === 2 ? []
        : ['explanations not carried forward'])];
    if (holding.length > 0 || wrong.length > 0)
      fail(`${context.probe}: ${JSON.stringify(holding)} `
        + `${JSON.stringify(wrong)}`);
    passed(context);
  },
  'r0-t2-honest-stages': async context => {
    const rows = (await honestReport(context.load))([
      { origin: 'inline:stages', source: stages }]);
    const found = rows.flatMap(row => row.stages);
    const problems = [...new Set(found.flatMap(stage => stage.problems))];
    if (found.length !== dropped || problems.length > 0)
      fail(`${context.probe}: ${found.length} dropped stages `
        + JSON.stringify(problems));
    passed(context);
  },
  'r0-t2-honest-annotated': async context => {
    const { sourcesOf } = await import('./r0-effects-pin-run.mjs');
    const origins = new Set(annotated.map(at =>
      at.slice(0, at.lastIndexOf('#'))));
    const sources = (await sourcesOf()).filter(entry =>
      origins.has(entry.origin));
    const rows = (await honestReport(context.load))(sources);
    const refused = annotated.filter(at =>
      rows.find(row => row.at === at)?.validate !== 'validated');
    if (refused.length > 0)
      fail(`${context.probe}: ${refused.length} of ${annotated.length} `
        + `not validated: ${refused.map(at => `${at} ${rows.find(row =>
          row.at === at)?.validate}`).join('; ')}`);
    passed(context);
  }
};
