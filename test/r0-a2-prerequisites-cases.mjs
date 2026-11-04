// Fixtures for the activation prerequisites R034 (2) and (10)
// (docs/plans/2026-11-04-activation-prerequisites-proposal.md; dossier
// §18.161 (2)), built from any build's modules, so the probes in
// test/regression-r0-a2-prerequisites.mjs load the clone's and
// test/r0-a2-r034-2.test.mjs the healthy build's.
import { shape } from './regression-r0-amin-support.mjs';

// R034 (2): `reason` over injected blocks and declines. Effect 1's
// operations 0 and 1, and an unframed install: three distinct kinds.
export const mergeCases = async load => {
  const Reason = await load('Features.Check.Decide.Reason');
  const Verdict = await load('Domain.Verdict');
  const Effect = await load('Domain.Recorded.Effect');
  const kinds = [new Effect.OperationWithRow(1, 0),
    new Effect.OperationWithRow(1, 1), Effect.UnframedInstall.value];
  const unchecked = list => new Verdict.EffectsUnchecked(list);
  const declining = why =>
    new Verdict.Declined(Verdict.OnlineSolver.value, why);
  // The reason's entries as plain data, or the reason's own constructor.
  const entries = (blocks, declines) => {
    const found = Reason.reason(blocks)(declines.map(declining));
    return found.constructor.name === 'Unsupported'
      ? found.value0.map(shape) : [shape(found)];
  };
  const count = list => list.filter(entry =>
    Object.keys(entry)[0] === 'EffectsUnchecked').length;
  return { Verdict, Effect, kinds, unchecked, entries, count };
};
