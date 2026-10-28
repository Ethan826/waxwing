// R0 a-min tranche 1 regression probes for the declaration's own marked
// signature (Task 19, R032), spread into test/regression-r0-amin.mjs.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'type Job(a) = Job(a); '
  + 'fn use(h: Handler(Log with Fail(Job(Int)))): Int = 0; '
  + 'fn main(): Unit = ();';

export const signatureProbes = {
  // Task 19: a signature-only handler declaration records no MHandler,
  // so the handler type written in its signature is invisible.
  'r0-amin-signature-recorded': async context => {
    const { fieldsOf } = await toolkit(context);
    const { signature } = fieldsOf(source, 'use').effects;
    const [parameter] = signature.parameters;
    if (parameter?.constructor.name !== 'MHandler')
      fail('the signature-only handler declaration lacks a recorded '
        + `MHandler: ${signature.parameters.length} parameters`);
    passed(context);
  },
  // Task 19: a second SignatureAt is a DuplicateEffect, not an overwrite.
  'r0-amin-signature-duplicate': async context => {
    const { load } = await toolkit(context);
    const Assemble = await load('Features.Check.Generate.Assemble');
    const Out = await load('Features.Check.Generate.Out');
    const Effect = await load('Domain.Recorded.Effect');
    const Origin = await load('Domain.Recorded.Origin');
    const Atom = await load('Domain.Recorded.Atom');
    const Set = await load('Data.Set');
    const { Nothing } = await load('Data.Maybe');
    const path = Origin.Path({ root: Origin.InResult.value, steps: [] });
    const unit = new Effect.MBase(Atom.UnitBase.value);
    const sig = { parameters: [], row: { labels: [], tail: Nothing.value },
      result: unit };
    const effects = [new Out.SignatureAt(path, sig),
      new Out.SignatureAt(path, sig)];
    const holders = { declared: Set.empty, holding: Set.empty };
    const result = Assemble.assemble({ decl: 0, holders })(
      { ...Out.noOut, effects });
    if (result.constructor.name !== 'Left')
      fail('a duplicate SignatureAt write went undetected');
    passed(context);
  },
  // Task 21: a unit signature equals the placeholder, so omitting its
  // SignatureAt leaves the assembled problem unchanged; assembly must
  // still refuse the omission (no comparison with the placeholder).
  'r0-amin-signature-missing': async context => {
    const { load } = await toolkit(context);
    const Assemble = await load('Features.Check.Generate.Assemble');
    const Out = await load('Features.Check.Generate.Out');
    const Effect = await load('Domain.Recorded.Effect');
    const Origin = await load('Domain.Recorded.Origin');
    const Atom = await load('Domain.Recorded.Atom');
    const Set = await load('Data.Set');
    const Recorded = await load('Domain.Recorded');
    const { Nothing } = await load('Data.Maybe');
    const root = Origin.Path({ root: Origin.InResult.value, steps: [] });
    const unit = { parameters: [], row: { labels: [], tail: Nothing.value },
      result: new Effect.MBase(Atom.UnitBase.value) };
    const holders = { declared: Set.empty, holding: Set.empty };
    const assemble = effects => Assemble.assemble({ decl: 0, holders })(
      { ...Out.noOut, effects });
    const signatureOf = result => JSON.stringify(shape(Recorded.fields(
      result.value0).effects.signature));
    const written = assemble([new Out.SignatureAt(root, unit)]);
    const omitted = assemble([]);
    if (omitted.constructor.name === 'Right'
      && signatureOf(omitted) === signatureOf(written))
      fail('a missing SignatureAt write went undetected');
    if (omitted.constructor.name !== 'Left')
      fail('a missing SignatureAt write was accepted');
    passed(context);
  }
};
