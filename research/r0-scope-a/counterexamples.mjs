// Scope A's refuted variants as reproducible fixtures (dossier §18.192;
// docs/plans/2026-11-13-scope-a-free-constructor-design.md R1-R6). Each
// runs on the committed compiler, with no patched copy, and prints, for
// the named declaration `f`:
// - today: what today's checker does with the whole program;
// - check: what G0's own check (`substitutionOnly`) says of the recorded
//   problem with the candidate test/r0-g0-support.mjs's search builds
//   from the problem's most general unifier (`Valid`, a refusal, or
//   `no candidate` when the unifier finds none).
// R1, R4, R5 and R6 are counterexamples because the check accepts a
// program today's checker refuses: without D6's conditions, nothing but
// the marker would stand between them and Solved. R2 and R3 show the
// model must be free and nominal: today refuses, and so does the check.
// Evidence only; changes nothing.
// usage: node research/r0-scope-a/counterexamples.mjs
import { compile } from '../../output/Program.Compile/index.js';
import { wire } from '../../output/Format.Diagnostic/index.js';
import { load } from '../../test/r0-generate-support.mjs';
import { stubsFrom } from '../../test/r0-stubs.mjs';
import { g0From } from '../../test/r0-g0-support.mjs';

const log = 'effect Log { fn log(n: Int): Unit; };';
const tick = 'effect Tick { fn tick(): Unit; };';
const list = 'type L(a) = N | C(a, L(a));';
const main = 'fn main(): Int = 0;';
export const fixtures = [
  { id: 'R1', boundary: 'D6.2 (effect-row head)', expect: 'accepted',
    source: [log, tick, 'type Job(...e) = Job(Unit -> Unit with ...e);',
      'fn f(j: Job(Log)): Job(Tick) = j;', main] },
  { id: 'R4', boundary: 'D6.3 (holder head: a function field)',
    expect: 'accepted',
    source: [log, tick, 'type W(a) = W(a, Unit -> Unit with Log);',
      'fn f(g: Unit -> Unit with Tick): W(Int) = W(1, g);', main] },
  { id: 'R5', boundary: 'D6.4 (an arrow inside an argument)',
    expect: 'accepted',
    source: [log, tick, list,
      'fn f(x: L(Unit -> Unit with Log)): L(Unit -> Unit with Tick) = x;',
      main] },
  { id: 'R6', boundary: 'D6.7 (an open requirement atom)',
    expect: 'accepted',
    source: ['type Box(a) = Box(a -> a);',
      'fn f(b: Box(Int)): Text = show(b);', main] },
  { id: 'R2', boundary: 'free: no collapse', expect: 'refused',
    source: [list, 'fn f(x: L(Int)): L(Bool) = x;', main] },
  { id: 'R3', boundary: 'nominal: no field equality', expect: 'refused',
    source: ['type Tag(a) = Tag(Int);', 'fn f(x: Tag(Int)): Tag(Bool) = x;',
      main] }];

const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const named = value => value.constructor.name;

const results = fixtures.map(fixture => {
  const source = fixture.source.join(' ');
  const today = compile(source);
  const todayText = named(today) === 'Right' ? 'compiles'
    : `${wire(today.value0).code} ${wire(today.value0).message}`;
  const problem = stubs.recorded.problem(source, 'f');
  let check;
  try {
    const found = g0.check(problem, g0.candidateOf(problem));
    check = named(found) === 'Right' ? 'Valid'
      : `refused ${named(found.value0)}`;
  } catch (error) {
    check = `no candidate (${String(error.message).slice(0, 80)})`;
  }
  const accepted = check === 'Valid';
  const holds = fixture.expect === 'accepted'
    ? accepted && todayText !== 'compiles'
    : !accepted && todayText !== 'compiles';
  return { id: fixture.id, boundary: fixture.boundary, today: todayText,
    check, expect: fixture.expect, holds };
});
console.log(JSON.stringify(results, null, 1));
process.exitCode = results.every(result => result.holds) ? 0 : 1;
