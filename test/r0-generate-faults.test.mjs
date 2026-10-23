import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 Task 3.2 fix round 1 (controller ruling 2): a lookup that misses,
// or input not of the shape Resolve guarantees, is a generation fault
// (`Left`), never an empty callee, `Unit` or a marker. Each is injected
// by doctoring a resolved program's inputs or declaration, and maps to
// today's `Internal` kind that stops a run (ruling R3).
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Resolved = await load('Domain.Resolved');
const Row = await load('Domain.Row');

const source = `type Box(a) = Box(a);
effect Log { fn log(n: Int): Unit; };
fn g(n: Int): Int = n;
fn calls(): Int = g(1);
fn builds(): Box(Int) = Box(1);
fn logs(): Unit with Log = Log.log(1);
fn reads(x: Int): Int = x;
fn handles(): Int = handle 1 { fail(error: Int) => 2 };
fn main(): Int = 1;
`;
const program = resolved(source);
const { tables, signatures } = Inputs.generationInputs(program);
const decl = name => program.functions.find(found => found.name === name);
const fault = (result, name, kind) => {
  assert.equal(result.constructor.name, 'Left', name);
  assert.equal(result.value0.constructor.name, name);
  const problem = Generate.generationProblem(result.value0);
  assert.equal(problem.constructor.name, 'Internal', name);
  assert.equal(problem.value0.constructor.name, kind, name);
};
const run = (found, use = tables, signed = signatures) =>
  Generate.generate(use)(signed)(found);
// `calls` with its callee's id replaced by one no function has.
const unknownCall = () => {
  const calls = decl('calls');
  return { ...calls, body: Resolved.Call.create(calls.body.value0)(99)(
    calls.body.value2) };
};

test('the undoctored program generates Right for every declaration', () => {
  for (const found of program.functions)
    assert.equal(run(found).constructor.name, 'Right', found.name);
});

test('a missing callee, constructor, type, effect or operation', () => {
  fault(run(unknownCall()), 'UnknownFunction', 'TableLookup');
  fault(Generate.staticRules(tables)(signatures)(unknownCall()),
    'UnknownFunction', 'TableLookup');
  fault(run(decl('builds'), { ...tables, ctors: [] }), 'UnknownCtor',
    'TableLookup');
  fault(run(decl('builds'), { ...tables, types: [] }), 'UnknownType',
    'TableLookup');
  fault(run(decl('logs'), { ...tables, effects: [] }), 'UnknownEffect',
    'TableLookup');
  fault(run(decl('logs'), { ...tables, effects: tables.effects.map(info =>
    ({ ...info, operations: [] })) }), 'UnknownOperation', 'TableLookup');
});

test('an unbound local, a payload-less clause, no result syntax', () => {
  const reads = decl('reads');
  fault(run({ ...reads, body: Resolved.Local.create(reads.body.value0)(99) }),
    'UnboundLocal', 'InputShape');
  const handles = decl('handles');
  const clauses = handles.body.value2.map(clause => ({ ...clause,
    label: Row.Label.create(Row.FailEffect.value)([])(Row.Unmarked.value) }));
  fault(run({ ...handles, body: Resolved.Handle.create(handles.body.value0)(
    handles.body.value1)(clauses) }), 'PayloadShape', 'InputShape');
  fault(run({ ...reads, syntax: [] }), 'ResultShape', 'InputShape');
});
