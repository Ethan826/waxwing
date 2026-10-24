import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe } from './r0-decide-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

// Task 4.3, acceptance criterion 3 (fault confinement): a failure in an
// untrusted search's own code is `SearchBroke` and another strategy
// still reaches its verdict (G-Q13); a trusted-boundary failure stops the
// run. Ruling R3's routing (Online/Ending.purs) is exercised with every
// `InternalKind` and every `Problem` constructor injected directly.
const online = await onlineFrom(load);
const stubs = await stubsFrom(load);
const Problem = await load('Domain.Problem');
const Ending = await load('Features.Check.Strategy.Online.Ending');
const Fault = await load('Features.Check.Generate.Fault');
const Decide = await load('Features.Check.Decide');
const { Left } = await load('Data.Either');
const { Online, Shadow } = online;

const confined = ['LaterWork', 'RuleBroken', 'BoundPassed', 'BodyState',
  'Unrendered'];
const stopping = ['TableLookup', 'InputShape', 'PassInvariant'];
const span = { start: { offset: 0, line: 3, column: 7 },
  end: { offset: 1, line: 3, column: 8 } };
const diagnostic = problem => ({ problem, span, related: [] });
const internal = kind => new Problem.Internal(Problem[kind].value, kind);

test('every InternalKind is routed by ruling R3', () => {
  const declared = readFileSync('src/Domain/Problem.purs', 'utf8')
    .match(/data InternalKind\n((?:\s+[=|] \w+\n)+)/)[1]
    .match(/\w+/g);
  assert.deepEqual([...declared].sort(), [...confined, ...stopping].sort());
  for (const kind of confined)
    assert.equal(Ending.route(Problem[kind].value).constructor.name,
      'Confined', kind);
  for (const kind of stopping)
    assert.equal(Ending.route(Problem[kind].value).constructor.name,
      'Stops', kind);
});

// Each `Problem` constructor, read from the source's data block with
// its arity from the compiled class.
const problemNames = readFileSync('src/Domain/Problem.purs', 'utf8')
  .match(/data Problem\n([\s\S]*?)\n\n/)[1].split('\n')
  .map(line => line.match(/^\s+[=|] (\w+)/)?.[1]).filter(Boolean);
const built = name => {
  if (name === 'Internal') return internal('BodyState');
  if (name === 'Hinted') return new Problem.Hinted(internal('TableLookup'),
    'hint');
  if (name === 'TypeTooDeep') return new Problem.TypeTooDeep(1000);
  const made = Problem[name];
  return made.length === 0 ? made.value
    : new made(...Array.from({ length: made.length }, () => 'x'));
};
const endingText = value => (value instanceof Ending.Stopped ? 'Stopped'
  : `Ended ${value.value0.constructor.name}`);

test('ending reads every Problem constructor', () => {
  assert.ok(problemNames.length > 60);
  for (const name of problemNames) {
    const found = endingText(Ending.ending(built(name)));
    const expected = { Internal: 'Ended Broke', Hinted: 'Stopped',
      TypeTooDeep: 'Ended OutOfBudget' }[name] ?? 'Ended Exhausted';
    assert.equal(found, expected, name);
  }
  const deep = Ending.ending(built('TypeTooDeep')).value0;
  assert.equal(deep.value0.value0, 1000);
});

const program = online.programOf('fn f(): Int = 1;\nfn main(): Int = 0;\n');
const problem = online.problemOf(program, 'f');
const injected = found => Online.onlineWith(() => () => found);
const searchedLeft = made => Online.searched(online.legacyText)(problem)(
  new Left(diagnostic(made)));
const decided = strategies => describe(Decide.decide(stubs.checking(
  { strategies }))(problem));

test('a confined kind is SearchBroke and the next strategy decides', () => {
  for (const kind of confined) {
    const search = searchedLeft(internal(kind));
    assert.equal(search.value0.constructor.name, 'Broke', kind);
    assert.equal(search.value0.value0, kind);
    assert.deepEqual(search.value1.map(hint => hint.value0),
      [`untrusted search hint: the legacy solver stopped at 3:7, reporting`
        + ` "${online.legacyText(diagnostic(internal(kind)))}" (its reason`
        + ' for stopping, never evidence of a contradiction)']);
    assert.deepEqual(decided([injected(search),
      stubs.behaviours.accepting()]), { verdict: 'Solved',
      attempts: ['Searched Broke', 'Accepted'],
      searchFaults: ['SearchBroke'] }, kind);
  }
});

test('a stopping kind stops the run before the next strategy', () => {
  for (const kind of stopping) {
    const search = searchedLeft(internal(kind));
    assert.equal(search.constructor.name, 'Inconsistent', kind);
    const after = stubs.behaviours.accepting();
    assert.deepEqual(decided([injected(search), after]),
      { fault: 'BrokenInvariant' }, kind);
    assert.equal(after.calls, 0, kind);
  }
});

test("fx010's Unrendered failure, through today's solver, is confined",
  () => {
    const source = JSON.parse(readFileSync(
      'test/fixtures/r0/audit/fx010-record-payload.pinned.json', 'utf8'))
      .source;
    const fx010 = online.programOf(source);
    const recorded = online.problemOf(fx010, 'k');
    assert.equal(online.todayOf(fx010, 'k').value0.problem.value0
      .constructor.name, 'Unrendered');
    assert.deepEqual(describe(Decide.decide(stubs.checking({ strategies: [
      Online.online(online.contextOf(fx010)),
      stubs.behaviours.accepting()] }))(recorded)), {
      verdict: 'Unresolved Unsupported Outside FailFamily',
      attempts: ['Searched Broke', 'Accepted'],
      searchFaults: ['SearchBroke'] });
  });

test('a declaration the program lacks stops the run (ruling R10)', () => {
  const other = online.programOf('fn main(): Int = 0;\n');
  const after = stubs.behaviours.accepting();
  assert.equal(online.search(other, problem).constructor.name,
    'Inconsistent');
  assert.deepEqual(describe(Decide.decide(stubs.checking({ strategies: [
    Online.online(online.contextOf(other)), after] }))(problem)),
  { fault: 'BrokenInvariant' });
  assert.equal(after.calls, 0);
});

// Task 3.2 ruling (2): every generation fault maps to a stopping kind,
// and the shadow run reports it as a broken invariant.
const generationFaults = ['UnknownFunction', 'UnknownCtor', 'UnknownType',
  'UnknownEffect', 'UnknownBuiltinEffect', 'UnknownOperation',
  'UnboundLocal', 'PayloadShape', 'BinderShape', 'ResultShape',
  'VariableSort'];

test('a generation fault stops the run', () => {
  const declared = readFileSync('src/Features/Check/Generate/Fault.purs',
    'utf8').match(/data GenerationFault\n((?:\s+[=|] .*\n)+)/)[1]
    .match(/[=|] (\w+)/g).map(arm => arm.slice(2));
  assert.deepEqual(declared, generationFaults);
  for (const name of generationFaults) {
    const made = Fault[name];
    const fault = made.length === 0 ? made.value
      : new made(...Array.from({ length: made.length }, () => 0));
    const problemOf = Fault.generationProblem(fault);
    assert.equal(Ending.route(problemOf.value0).constructor.name, 'Stops',
      name);
    const stopped = Shadow.generationStop(fault);
    assert.equal(stopped.constructor.name, 'BrokenInvariant', name);
    assert.equal(stopped.value0, problemOf.value1, name);
  }
});
