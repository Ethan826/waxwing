// A2 completion wave (dossier §18.148 (2)): record validation's check 4,
// the companions of `Install`, `HandlerLit` and `Defer` (spec §4.1's
// table; Effects.RecordCompanions). `companionCases` builds the mutants
// from any build's modules, so the probes load the clone's and
// test/r0-a2-companions.test.mjs the healthy build's; the rows are in
// scripts/regression-r0-a2-companions.mjs. Each mutant names the
// provenance its defect is reported at: an owner whose companion is
// missing, miswired or duplicated is reported at the owner's provenance,
// since every owner is recorded before its companions and the owner's
// row is the one violated; a companion no owner requires (its owner
// gone, or stray beside an intact one) at its own.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordCases } from './regression-r0-a2-prereq.mjs';
import { sources } from './regression-r0-a2-validate.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

export const companionCases = async load => {
  const base = await recordCases(load);
  const { Record, Effect, problemOf, withEffects } = base;
  const { Nothing } = await load('Data.Maybe');
  const Origin = await load('Domain.Recorded.Origin');
  const use = problemOf(sources.c1, 'use');
  const mk = problemOf(sources.c1, 'mk');
  const unframed = problemOf(sources.c5, 'main');
  const c15 = problemOf(sources.c15, 'use2');
  const all = problem => problem.effects.obligations;
  const indexOf = (problem, which) => {
    const index = all(problem).findIndex(which);
    if (index < 0) throw new Error('the problem records no such obligation');
    return index;
  };
  const at = (problem, which) => all(problem)[indexOf(problem, which)];
  const dropped = (problem, which) => withEffects(problem, { obligations:
    all(problem).filter((_, index) => index !== indexOf(problem, which)) });
  const changed = (problem, which, change) => withEffects(problem,
    { obligations: all(problem).map((placed, index) =>
      index === indexOf(problem, which) ? change(placed) : placed) });
  const appended = (problem, placed) =>
    withEffects(problem, { obligations: [...all(problem), placed] });
  const site = kind => placed => placed.value instanceof Effect.Consume
    && placed.value.value0.site instanceof kind;
  const is = kind => placed => placed.value instanceof kind;
  const consume = change => placed => ({ ...placed, value:
    new Effect.Consume({ ...placed.value.value0,
      ...change(placed.value.value0) }) });
  const identity = change => placed => ({ ...placed, provenance:
    new Effect.AtSite({ ...placed.provenance.value0,
      ...change(placed.provenance.value0) }) });
  const closed = { labels: [], tail: Nothing.value };
  const owner = (problem, kind) => at(problem, is(kind)).provenance;
  const install = owner(use, Effect.Install);
  const literal = owner(mk, Effect.HandlerLit);
  const defer = owner(use, Effect.Defer);
  const unframedInstall = owner(unframed, Effect.Install);
  // A recorded path that is not the owner's.
  const deferPath = defer.value0.path;
  const installPath = install.value0.path;
  const literalOther = all(mk).find(placed => placed.provenance instanceof
    Effect.AtSite
    && !Origin.eqPath.eq(placed.provenance.value0.path)(literal.value0.path));
  const role = value => () => ({ role: value });
  const consumed = (kind, ordinal) => new Effect.Consumed(kind, ordinal);
  const strayR = identity(() => ({ path: deferPath }))(
    at(use, site(Effect.InstallR)));
  const unframedAt = identity(role(Effect.UnframedWith.value))(
    { ...at(use, is(Effect.Install)),
      value: new Effect.Unsupported(Effect.UnframedInstall.value) });
  const installRAt = identity(role(consumed(Effect.InstallR.value, 0)))(
    { ...at(unframed, is(Effect.Install)), value: new Effect.Consume({
      site: Effect.InstallR.value, source: closed, target: closed,
      marks: false, bare: false }) });
  const deleted = {
    'InstallR': [dropped(use, site(Effect.InstallR)), install],
    'AtInstalledC': [dropped(use, site(Effect.AtInstalledC)), install],
    'ClauseIntoR': [dropped(mk, site(Effect.ClauseIntoR)), literal],
    'ClauseIntoC': [dropped(mk, site(Effect.ClauseIntoC)), literal],
    'AtDefer': [dropped(use, site(Effect.AtDefer)), defer],
    'UnframedInstall': [dropped(unframed, is(Effect.Unsupported)),
      unframedInstall],
    // The whole-branch reviewer's probe (§18.147 (2)): C15's `with`.
    'C15 InstallR': [dropped(c15, site(Effect.InstallR)),
      owner(c15, Effect.Install)]
  };
  const miswired = {
    'InstallR source': [changed(use, site(Effect.InstallR),
      consume(() => ({ source: closed }))), install],
    'AtInstalledC source': [changed(use, site(Effect.AtInstalledC),
      consume(() => ({ source: closed }))), install],
    'ClauseIntoC source': [changed(mk, site(Effect.ClauseIntoC),
      consume(() => ({ source: closed }))), literal],
    'AtDefer source': [changed(use, site(Effect.AtDefer),
      consume(() => ({ source: closed }))), defer],
    'InstallR target': [changed(use, site(Effect.InstallR),
      consume(() => ({ target: closed }))), install],
    'ClauseIntoR target': [changed(mk, site(Effect.ClauseIntoR),
      consume(() => ({ target: closed }))), literal],
    'AtDefer target': [changed(use, site(Effect.AtDefer),
      consume(() => ({ target: closed }))), defer],
    'InstallR path': [changed(use, site(Effect.InstallR),
      identity(() => ({ path: deferPath }))), install],
    'AtDefer path': [changed(use, site(Effect.AtDefer),
      identity(() => ({ path: installPath }))), defer],
    'ClauseIntoR path': [changed(mk, site(Effect.ClauseIntoR),
      identity(() => ({ path: literalOther.provenance.value0.path }))),
    literal],
    'AtInstalledC role': [changed(use, site(Effect.AtInstalledC),
      identity(role(consumed(Effect.AtInstalledC.value, 1)))), install],
    'ClauseIntoC clause': [changed(mk, site(Effect.ClauseIntoC),
      placed => identity(role(consumed(new Effect.ClauseIntoC(1), 0)))(
        consume(() => ({ site: new Effect.ClauseIntoC(1) }))(placed))),
    literal],
    'UnframedInstall role': [changed(unframed, is(Effect.Unsupported),
      identity(role(Effect.UnsupportedOperation.value))), unframedInstall],
    'InstallR duplicated': [appended(use, at(use, site(Effect.InstallR))),
      install]
  };
  const wrongOwner = changed(use, is(Effect.Install),
    identity(role(Effect.EntryRow.value)));
  const unowned = {
    'Install deleted': [dropped(use, is(Effect.Install)),
      at(use, site(Effect.InstallR)).provenance],
    'HandlerLit deleted': [dropped(mk, is(Effect.HandlerLit)),
      at(mk, site(Effect.ClauseIntoR)).provenance],
    'Defer deleted': [dropped(use, is(Effect.Defer)),
      at(use, site(Effect.AtDefer)).provenance],
    'stray InstallR': [appended(use, strayR), strayR.provenance],
    'UnframedInstall beside a handler': [appended(use, unframedAt),
      unframedAt.provenance],
    'InstallR beside an unframed install': [appended(unframed, installRAt),
      installRAt.provenance],
    // The owner's identity is not the table's: the owner is the defect.
    'Install under another role': [wrongOwner,
      at(wrongOwner, is(Effect.Install)).provenance]
  };
  return { Record, Effect, unchanged: { use, mk, unframed, c15 }, deleted,
    miswired, unowned };
};

const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// The names of the mutants not reported as check 4 at their provenance.
export const missed = (cases, mutants) => Object.entries(mutants)
  .filter(([, [problem, provenance]]) => {
    const found = cases.Record.recordDefect(problem);
    return found.constructor.name !== 'Just' || found.value0.check !== 4
      || !cases.Effect.eqProvenance.eq(found.value0.provenance)(provenance);
  }).map(([name]) => name);

const probeOf = (pick, what) => async context => {
  const cases = await companionCases(loader(context));
  const wrong = missed(cases, pick(cases));
  if (wrong.length > 0) fail(`${what} not check 4: ${wrong.join(', ')}`);
  passed(context);
};

export const a2CompanionProbes = {
  'r0-a2-companion-deleted': probeOf(cases => cases.deleted,
    'deleted companions'),
  'r0-a2-companion-miswired': probeOf(cases => cases.miswired,
    'miswired companions'),
  'r0-a2-companion-unowned': probeOf(cases => cases.unowned,
    'unowned companions'),
  // The table's own rows: an unchanged problem records no defect.
  'r0-a2-companion-table': async context => {
    const cases = await companionCases(loader(context));
    const wrong = Object.entries(cases.unchanged).filter(([, problem]) =>
      cases.Record.recordDefect(problem).constructor.name !== 'Nothing')
      .map(([name]) => name);
    if (wrong.length > 0) fail(`unchanged problems refused: ${wrong}`);
    passed(context);
  }
};
