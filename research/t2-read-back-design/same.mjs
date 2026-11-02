// Design §C's non-interference probe: with the research trace collecting
// (`trace` scratch copy, hook-trace.mjs installed), today's outputs are
// unchanged. Per corpus program, `compile` and `compileReport` against
// the pinned first-diagnostic snapshot (Go text by SHA-256, wired first
// diagnostic), as test/r0-first-diagnostic.serial.test.mjs compares
// them; per declaration, a SHA-256 of `recheck`'s whole result (the
// checked declaration and the final `State`) written to a file, and
// compared with a second run's file when one is named. Corpus-observed.
//   node .../same.mjs <digests-out> [<digests-to-compare>]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';
import { keyOf } from '../t2-read-back-inventory/shape.mjs';
import { trace } from './hook-trace.mjs';

const { compile, compileReport } = await load('Program.Compile');
const { Right } = await load('Data.Either');
const { wire } = await load('Format.Diagnostic');
const Function = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');

const sha = text => createHash('sha256').update(text).digest('hex');
const snapshot = JSON.parse(readFileSync(
  'test/fixtures/r0/first-diagnostic.json', 'utf8')).outcomes;
const outcome = result => (result instanceof Right
  ? { go: sha(result.value0) } : { diagnostic: wire(result.value0) });
const firstOutcome = report => (report instanceof Right ? outcome(report)
  : { diagnostic: wire(report.value0[0]) });
const same = (one, other) => JSON.stringify(one) === JSON.stringify(other);

const [written, compared] = process.argv.slice(2);
const digests = {};
const moved = [];
let entries = 0;
for (const { origin, source } of await loadCorpus()) {
  trace.reset();
  if (!same(outcome(compile(source)), snapshot[origin])
    || !same(firstOutcome(compileReport(source)), snapshot[origin]))
    moved.push(origin);
  let program;
  try { program = resolved(source); } catch { continue; }
  const holders = functional(program.ctors);
  for (const decl of program.functions) {
    trace.reset();
    const found = Function.recheck(holders)(program)(decl);
    entries += trace.entries.length;
    digests[`${origin}#${decl.name}`] = sha(keyOf(found));
  }
}
writeFileSync(written, JSON.stringify(digests));
const result = { firstDiagnosticMoved: moved, traceEntries: entries,
  declarations: Object.keys(digests).length };
if (compared !== undefined) {
  const other = JSON.parse(readFileSync(compared, 'utf8'));
  result.recheckApart = Object.keys(digests)
    .filter(key => other[key] !== digests[key]);
  result.missing = Object.keys(other).filter(key => !(key in digests));
}
console.log(JSON.stringify(result, null, 1));
