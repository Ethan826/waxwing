// Fixtures for the activation prerequisites R034 (2) and (10)
// (docs/plans/2026-11-04-activation-prerequisites-proposal.md; dossier
// §18.161 (2)), built from any build's modules, so the probes in
// test/regression-r0-a2-prerequisites.mjs load the clone's and
// test/r0-a2-r034-2.test.mjs and test/r0-a2-r034-10.test.mjs the healthy
// build's.
import { recordCases } from './regression-r0-a2-prereq.mjs';
import { sources } from './regression-r0-a2-validate.mjs';
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

// R034 (10): owners recorded twice at one identity, and the nearby cases
// the proposal's table names, as [problem, expected] pairs: `expected`
// is the owner's provenance where check 4 must report it, or null where
// the record must have no defect.
export const ownerCases = async load => {
  const { Record, Effect, problemOf, withEffects } = await recordCases(load);
  const log = 'effect Log { fn log(n: Int): Unit; }; '
    + 'effect Ask { fn ask(): Unit; }; ';
  const mk = `${log}fn mk(): Handler(nofail Ask with Log + ...s) with pure`
    + ' = handler Ask { ask() => Log.log(1) }; ';
  const main = 'fn main(): Unit = ();';
  const use = problemOf(sources.c1, 'use');
  const literal = problemOf(sources.c1, 'mk');
  const unframed = problemOf(sources.c5, 'main');
  const empty = problemOf('effect Nil { }; fn mk0(): Handler(Nil) with pure'
    + ' = handler Nil { }; fn main(): Int = 0;', 'mk0');
  const twoWith = problemOf(`${mk}fn use(): Unit with Log = { with mk()`
    + ` { () }; with mk() { () } }; ${main}`, 'use');
  const inline = problemOf(`${log}fn use(): Unit with Log = with handler`
    + ` Ask { ask() => Log.log(1) } { defer Ask.ask(); () }; ${main}`, 'use');
  const all = problem => problem.effects.obligations;
  const is = kind => placed => placed.value instanceof kind;
  const site = kind => placed => placed.value instanceof Effect.Consume
    && placed.value.value0.site instanceof kind;
  const at = (problem, which) => {
    const found = all(problem).find(which);
    if (found === undefined) throw new Error('no such obligation');
    return found;
  };
  const appended = (problem, ...placed) =>
    withEffects(problem, { obligations: [...all(problem), ...placed] });
  // Every obligation `which` accepts, recorded a second time.
  const twice = (problem, which) =>
    appended(problem, ...all(problem).filter(which));
  const owner = (problem, kind) => at(problem, is(kind)).provenance;
  const install = at(use, is(Effect.Install));
  // (b): a non-handler Install at the MHandler Install's identity, with
  // the `UnframedWith` companion its own row requires.
  const handler = at(unframed, is(Effect.Install)).value.value0.handler;
  const unframedCopy = { ...install, value: new Effect.Install(
    { ...install.value.value0, handler }) };
  const unframedWith = { ...install, value: new Effect.Unsupported(
    Effect.UnframedInstall.value), provenance: new Effect.AtSite({
    ...install.provenance.value0, role: Effect.UnframedWith.value }) };
  const installed = placed => is(Effect.Install)(placed)
    || site(Effect.InstallR)(placed) || site(Effect.AtInstalledC)(placed);
  const rejected = {
    'Install twice': [twice(use, is(Effect.Install)), install.provenance],
    'Install beside an unframed copy': [appended(use, unframedCopy,
      unframedWith), install.provenance],
    'HandlerLit with no clauses twice': [twice(empty, is(Effect.HandlerLit)),
      owner(empty, Effect.HandlerLit)],
    'HandlerLit twice': [twice(literal, is(Effect.HandlerLit)),
      owner(literal, Effect.HandlerLit)],
    'Defer twice': [twice(use, is(Effect.Defer)), owner(use, Effect.Defer)],
    'owner and companions twice': [twice(use, installed), install.provenance]
  };
  const accepted = {
    'Equal twice': twice(empty, is(Effect.Equal)),
    'Consume AtCall twice': twice(use, site(Effect.AtCall)),
    'two Installs at two paths': twoWith,
    'a HandlerLit inside an Install': inline
  };
  return { Record, Effect, rejected, accepted, problems: { use, literal,
    unframed, empty, twoWith, inline } };
};

// The names of the rejected cases not reported as check 4 at their
// owner, and of the accepted cases that record a defect.
export const ownerMissed = cases => [
  ...Object.entries(cases.rejected).filter(([, [problem, provenance]]) => {
    const found = cases.Record.recordDefect(problem);
    return found.constructor.name !== 'Just' || found.value0.check !== 4
      || !cases.Effect.eqProvenance.eq(found.value0.provenance)(provenance);
  }).map(([name]) => name),
  ...Object.entries(cases.accepted).filter(([, problem]) =>
    cases.Record.recordDefect(problem).constructor.name !== 'Nothing')
    .map(([name]) => `${name} (accepted)`)
];
