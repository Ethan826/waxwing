import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';

// A second write of one keyed effect item kind at one path is a
// generation fault (DuplicateEffect kind path), found before the maps are
// built; equal values count; different kinds at one path do not.
const Assemble = await load('Features.Check.Generate.Assemble');
const Out = await load('Features.Check.Generate.Out');
const Fault = await load('Features.Check.Generate.Fault');
const Effect = await load('Domain.Recorded.Effect');
const Origin = await load('Domain.Recorded.Origin');
const Atom = await load('Domain.Recorded.Atom');
const Set = await load('Data.Set');
const Ord = await load('Data.Ord');
const { Nothing } = await load('Data.Maybe');

const path = Origin.Path({ root: Origin.InBody.value, steps: [] });
const other = Origin.Path({ root: Origin.InResult.value, steps: [] });
const int = new Effect.MBase(Atom.IntBase.value);
const closed = { labels: [], tail: Nothing.value };
const holders = { declared: Set.empty, holding: Set.empty,
  admitted: Set.empty, overRecords: Set.empty };
const header = { decl: 0, holders };
const assemble = effects =>
  Assemble.assemble(header)({ ...Out.noOut, effects });
const faultOf = result => (result.constructor.name === 'Left'
  ? result.value0 : null);
// A callee use with no type or row variables.
const sig = { parameters: [int], row: closed, result: int };
const signed = new Out.SignatureAt(
  Origin.Path({ root: Origin.InResult.value, steps: [] }), sig);

test('two NodeAt at one path, equal values, are a fault', () => {
  const fault = faultOf(assemble([new Out.NodeAt(path, int),
    new Out.NodeAt(path, int), signed]));
  assert.ok(fault instanceof Fault.DuplicateEffect);
  assert.equal(fault.value0, 'NodeAt');
  assert.equal(fault.value1, path);
  const problem = Fault.generationProblem(fault);
  assert.equal(problem.value0.constructor.name, 'InputShape');
  assert.match(problem.value1, /NodeAt/);
});

test('a NodeAt and an InstanceAt at one path are no fault', () => {
  const result = assemble([new Out.NodeAt(path, int),
    new Out.InstanceAt(path, sig), signed]);
  assert.equal(result.constructor.name, 'Right');
});

test('two NodeAt at different paths are no fault', () => {
  const result = assemble([new Out.NodeAt(path, int),
    new Out.NodeAt(other, int), signed]);
  assert.equal(result.constructor.name, 'Right');
});

test('a variable-free callee use recorded twice is a fault', () => {
  const fault = faultOf(assemble([new Out.InstanceAt(path, sig),
    new Out.InstanceAt(path, sig), signed]));
  assert.ok(fault instanceof Fault.DuplicateEffect);
  assert.equal(fault.value0, 'InstanceAt');
});

test('each other keyed kind is checked', () => {
  const kinds = {
    AnnotationAt: p => new Out.AnnotationAt(p, int),
    ArityAt: p => new Out.ArityAt(p, 1),
    AmbientAt: p => new Out.AmbientAt(p, closed),
    SignatureAt: p => new Out.SignatureAt(p, sig)
  };
  for (const [kind, make] of Object.entries(kinds)) {
    const fault = faultOf(assemble([make(path), make(path), signed]));
    assert.equal(fault?.value0, kind);
  }
});
