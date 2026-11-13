// Scope A boundary probes (dossier §18.190). Evidence only. Run in an
// isolated copy whose compiled Decide/Reason.js `ordinary` drops the
// marker kinds named in WAXWING_SUPPRESS (as docs/plans/2026-11-12-
// census-analysis.md describes); never in the working tree. Prints, per
// probe, today's compile and each declaration's `decide` verdict.
// usage (in the copy): node probes.mjs; WAXWING_SUPPRESS=DataApplication
// node probes.mjs
import { compile } from './output/Program.Compile/index.js';
import { wire } from './output/Format.Diagnostic/index.js';
import { declarationsOf } from './test/r0-rt8-run.mjs';
import { describe } from './test/r0-decide-support.mjs';

const program = lines => `${lines.join(' ')} fn main(): Int = 0;`;
const log = 'effect Log { fn log(n: Int): Unit; };';
const tick = 'effect Tick { fn tick(): Unit; };';
const job = 'type Job(...e) = Job(Unit -> Unit with ...e);';
const list = 'type L(a) = N | C(a, L(a));';
const probes = {
  // An effect-row head: the recorder drops row arguments.
  effectRowHead: program([log, tick, job,
    'fn g(j: Job(Log)): Job(Tick) = j;']),
  effectRowHeadOk: program([log, job, 'fn g(j: Job(Log)): Job(Log) = j;']),
  // Constructor injectivity: different arguments.
  argumentClash: program([list, 'fn g(x: L(Int)): L(Bool) = x;']),
  // No confusion: different heads, same argument.
  headClash: program(['type Box(a) = Box(a);', 'type Wrap(a) = Wrap(a);',
    'fn g(x: Box(Int)): Wrap(Int) = x;']),
  // A phantom parameter: nominal, not by fields.
  phantom: program(['type Tag(a) = Tag(Int);',
    'fn g(x: Tag(Int)): Tag(Bool) = x;']),
  // In scope: structural use of an applied type.
  inScope: `${list} fn head(x: L(Int)): Int = match x { C(h, _) => h,`
    + ' N => 0 }; fn main(): Int = head(C(1, N));',
  // A holder head printed: Open, stays blocked.
  holderPrinted: program(['type Box(a) = Box(a -> a);',
    'fn g(b: Box(Int)): Text = show(b);']),
  // A non-holder head printed with a printable argument.
  printed: `${list} fn g(x: L(Int)): Text = show(x);`
    + ' fn main(): Text = g(C(1, N));',
  // A function argument printed through a non-holder head.
  printedFunction: program(['type Wrap(a) = Wrap(a);',
    'fn g(x: Wrap(Int -> Int)): Text = show(x);']),
  // Generic over the argument: the atom stays at a rigid variable.
  generic: `${list} fn g(x: L(a)): Text = show(x);`
    + ' fn main(): Text = g(C(1, N));'
};

for (const [name, source] of Object.entries(probes)) {
  const today = compile(source);
  const todayText = today.constructor.name === 'Right' ? 'compiles'
    : `${wire(today.value0).code} ${wire(today.value0).message}`;
  const decisions = declarationsOf({ origin: name, source })
    .filter(row => row.decl.name !== 'main')
    .map(row => `${row.decl.name}: ${describe(row.decision).verdict
      ?? row.decision.constructor.name}`);
  console.log(JSON.stringify({ name,
    suppressed: process.env.WAXWING_SUPPRESS || '', today: todayText,
    decide: decisions }));
}
