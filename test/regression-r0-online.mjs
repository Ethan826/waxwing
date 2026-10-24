// Task 4.3's regression probes (and Task 4.5's hint row), imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};

const loaded = async context => {
  const load = name => import(pathToFileURL(resolve(
    dirname(context.compilerPath), '..', name, 'index.js')));
  return { load, online: await onlineFrom(load),
    stubs: await stubsFrom(load) };
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const main = 'fn main(): Int = 0;\n';
const decisionText = (online, source, name) => describe(
  online.decisionOf(online.programOf(source), name));

export const r0OnlineProbes = {
  // Criterion 1: `pr Fn` at a holder type is open, so the assembly's
  // detector blocks the Solved G0's check would give.
  'r0-shadow-detector': async context => {
    const { online } = await loaded(context);
    const found = decisionText(online, 'type Fn = Fn(Int -> Int);\n'
      + 'fn main(): Fn = Fn(fn(n: Int) => n);\n', 'main');
    if (found.verdict !== 'Unresolved Unsupported RequirementAtoms')
      fail(`the shadow detector let Solved through: ${found.verdict}`);
    passed(context);
  },
  // A constructor pattern's `inst` slot reads from its type (P4).
  'r0-ctor-slot': async context => {
    const { online } = await loaded(context);
    const found = decisionText(online, 'type List(a) = Nil | Cons(a, '
      + 'List(a));\nfn head(xs: List(Int)): Int = match xs { Cons(x, _) => '
      + `x, Nil => 0 };\n${main}`, 'head');
    if (found.attempts[0] !== 'Accepted')
      fail(`a constructor pattern's slot was not read: ${found.attempts}`);
    passed(context);
  },
  // Criterion 5: a hole under `pr` is bound, so no backstop.
  'r0-hole-unbound': async context => {
    const { online } = await loaded(context);
    const found = decisionText(online, 'fn f(): Int = { let g = fn(y) => '
      + `show(y); 0 };\n${main}`, 'f');
    if (found.verdict !== 'Solved')
      fail(`a hole was left unbound: ${found.attempts}`);
    passed(context);
  },
  // Criterion 3: a stopping kind (TableLookup) is never confined.
  'r0-stop-confined': async context => {
    const { load, online, stubs } = await loaded(context);
    const Problem = await load('Domain.Problem');
    const { Left } = await load('Data.Either');
    const program = online.programOf(`fn f(): Int = 1;\n${main}`);
    const problem = online.problemOf(program, 'f');
    const search = online.Online.searched(online.legacyText)(problem)(
      new Left({ problem: new Problem.Internal(Problem.TableLookup.value,
        'x'), related: [], span: { start: { line: 1, column: 1 },
        end: {} } }));
    const found = describe(stubs.decide(stubs.checking({ strategies: [
      online.Online.onlineWith(() => () => search),
      stubs.behaviours.accepting()] }), problem));
    if (found.fault !== 'BrokenInvariant')
      fail(`a TableLookup failure was confined: ${found.verdict}`);
    passed(context);
  },
  // RT8's recorder defect: a partial perform typed as its result.
  'r0-perform-arity': async context => {
    const { online } = await loaded(context);
    const found = decisionText(online, 'effect Two { fn two(a: Int, b: '
      + 'Int): Int; };\nfn partly(): Int with Two = { let inc = Two.two(1);'
      + ` inc(41) };\n${main}`, 'partly');
    if (found.verdict !== 'Solved')
      fail(`a partial perform was recorded as its result: ${found.attempts}`);
    passed(context);
  },
  // Ruling R10 (iii): a declaration of another program, matched by id.
  'r0-declaration-by-id': async context => {
    const { online, stubs } = await loaded(context);
    const problem = online.problemOf(online.programOf(
      `fn f(): Int = 1;\n${main}`), 'f');
    const other = online.programOf(main);
    const found = describe(stubs.decide(stubs.checking({ strategies: [
      online.Online.online(online.contextOf(other))] }), problem));
    if (found.fault !== 'BrokenInvariant')
      fail(`another program's declaration was searched: ${found.verdict}`);
    passed(context);
  },
  // Task 4.5 fix round (ruling R-b3): a no-candidate hint carries today's
  // text, as the legacy solver's untrusted reason for stopping.
  'r0-hint-text-dropped': async context => {
    const { online } = await loaded(context);
    const program = online.programOf(`fn f(): Int = 1 + true;\n${main}`);
    const [hint] = online.decisionOf(program, 'f').value0.verdict.value0
      .hints.map(found => found.value0);
    if (!/reporting "[^"]+"/.test(hint)) fail(`no legacy text: ${hint}`);
    passed(context);
  }
};
