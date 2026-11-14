import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';

// A declaration with no SignatureAt write is a generation fault
// (MissingSignature), read off the item list and never by comparing with
// `emptyEffects`' placeholder, which a legitimate unit signature equals.
const Assemble = await load('Features.Check.Generate.Assemble');
const Out = await load('Features.Check.Generate.Out');
const Fault = await load('Features.Check.Generate.Fault');
const Effect = await load('Domain.Recorded.Effect');
const Origin = await load('Domain.Recorded.Origin');
const Atom = await load('Domain.Recorded.Atom');
const Set = await load('Data.Set');
const { Nothing } = await load('Data.Maybe');

const root = Origin.Path({ root: Origin.InResult.value, steps: [] });
const int = new Effect.MBase(Atom.IntBase.value);
const unit = new Effect.MBase(Atom.UnitBase.value);
const closed = { labels: [], tail: Nothing.value };
const holders = { declared: Set.empty, holding: Set.empty,
  admitted: Set.empty, overRecords: Set.empty };
const assemble = effects => Assemble.assemble({ decl: 0, holders,
  declarations: Effect.emptyEffects.declarations })(
  { ...Out.noOut, effects });
const placeholder = Effect.emptyEffects.signature;
const sigOf = result => ({ parameters: [], row: closed, result });

test('no SignatureAt is a MissingSignature fault', () => {
  for (const effects of [[], [new Out.NodeAt(root, int)]]) {
    const result = assemble(effects);
    assert.equal(result.constructor.name, 'Left');
    assert.ok(result.value0 instanceof Fault.MissingSignature);
    const problem = Fault.generationProblem(result.value0);
    assert.equal(problem.value0.constructor.name, 'InputShape');
    assert.match(problem.value1, /no recorded signature/);
  }
});

test('a recorded signature is no fault, a unit one included', () => {
  assert.deepEqual(sigOf(unit), placeholder);
  for (const sig of [sigOf(unit), sigOf(int)]) {
    const result = assemble([new Out.SignatureAt(root, sig)]);
    assert.equal(result.constructor.name, 'Right');
  }
});
