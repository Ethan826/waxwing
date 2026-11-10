// Tranche 2 Task 12 (design §C.6, Task 7; dossier §18.155 (4), (5)):
// the online certificate carries the honest effect package, or its read
// fault, as a field nothing decides by. Checks shared by
// test/r0-t2-online.test.mjs and the restored-defect probes
// (test/regression-r0-t2-online.mjs); each returns the names of the
// cases that differ, empty when all hold. `onlineChecks(load)` takes a
// module loader, so a probe reads the compiler under test only.
// Fixture-level.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe } from './r0-decide-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';
import { packageCases, sources as packageSources }
  from './r0-t2-package-cases.mjs';
import { sources as imageSources } from './r0-t2-images-cases.mjs';
import { shape } from './regression-r0-amin-support.mjs';

const text = value => JSON.stringify(shape(value));
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Each fixture's whole `decide` result as plain data (verdict, Solution's
// validity, assurance and compilation, attempts, search faults), pinned
// from a plain-purs build of 8ad30c1, before Task 12; `unframed`, `c7` and
// `q7` re-pinned at the minting switch (§18.172); `lone` and `held`'s
// assurance label only, at §18.174.
export const pinnedDecisions = () => JSON.parse(readFileSync(join(root,
  'test/fixtures/r0/t2-online-decisions.json'), 'utf8')).decisions;
const named = value => value.constructor.name;

// Each fixture's declaration, the package's outcome (`Right` or the
// fault), and its `decide` result as test/r0-decide-support.mjs names
// it, observed before Task 12 (8ad30c1, by the Task 12 implementer):
// `lone` and `held` are unchanged. Since the minting switch a read fault
// declines (§18.170), so `unframed`, `c7` and `q7` are as accepted there.
export const fixtures = [
  ['lone', packageSources.lone, 'main', 'Right',
    { verdict: 'Solved', attempts: ['Accepted', 'Shadow Left'],
      searchFaults: [] }],
  ['held', imageSources.uses, 'held', 'Right',
    { verdict: 'Solved', attempts: ['Accepted', 'Shadow Left'],
      searchFaults: [] }],
  ['unframed', packageSources.unframed, 'main', 'Declined',
    { verdict: 'Unresolved Unsupported Outside FailFamily, Outside'
      + ' HandlerType, EffectsUnchecked [UnframedInstall], EffectsUnread'
      + ' Declined',
    attempts: ['CheckFailed ClaimsComplete PackageUnread', 'Shadow Left'],
    searchFaults: [] }],
  ['c7', imageSources.c7, 'statsEvidence', 'UnreadImage',
    { verdict: 'Unresolved Unsupported EffectsUnread UnreadImage',
      attempts: ['CheckFailed ClaimsComplete PackageUnread', 'Shadow Left'],
      searchFaults: [] }],
  ['q7', imageSources.q7, 'statsEvidence', 'UnreadImage',
    { verdict: 'Unresolved Unsupported EffectsUnread UnreadImage',
      attempts: ['CheckFailed ClaimsComplete PackageUnread', 'Shadow Left'],
      searchFaults: [] }]
].map(([name, source, decl, outcome, decision]) =>
  ({ name, source, decl, outcome, decision }));

export const onlineChecks = async load => {
  const online = await onlineFrom(load);
  const cases = await packageCases(load);
  const RB = await load('Features.Check.Strategy.ReadBack');
  const searchOf = fixture => {
    const program = online.programOf(fixture.source);
    return online.search(program, online.problemOf(program, fixture.decl));
  };
  const outcomeOf = found => (named(found) === 'Left'
    ? named(found.value0) : 'Right');

  // The certificate's `effects` is `readEffects` over recheck's function,
  // mark store and trace and the type read-back's result, as Task 11's
  // assembly reads it apart from Online.
  const carriedWrong = () => fixtures.filter(fixture => {
    const found = searchOf(fixture);
    if (named(found) !== 'Candidate') return true;
    const effects = found.value0.effects;
    const apart = cases.effectsOf(cases.live(fixture.source, fixture.decl));
    return effects === undefined || outcomeOf(effects) !== fixture.outcome
      || text(effects) !== text(apart);
  }).map(fixture => fixture.name);

  // A read fault keeps the candidate: still a `Candidate`, its σ, claim
  // and holes the type read-back's, as before Task 12.
  const keptWrong = () => fixtures.filter(fixture => {
    const found = searchOf(fixture);
    if (named(found) !== 'Candidate') return true;
    const item = cases.live(fixture.source, fixture.decl);
    const made = RB.readBack(item.problem)(item.checked).value0;
    return text(found.value0.unsettled) !== text(made.unsettled)
      || text(found.value0.holes) !== text(made.holes)
      || text(found.value1) !== text(made.claim);
  }).map(fixture => fixture.name);

  // Each decides as pinned, the whole result equal to the recorded one;
  // since the switch the verdict reads `effects` (§18.170). Was:
  // build's; no verdict reads `effects`, so a read fault is never shown
  // as effect validation, nor a package as one.
  const verdictWrong = () => {
    const pinned = pinnedDecisions();
    return fixtures.filter(fixture => {
      const program = online.programOf(fixture.source);
      const found = online.decisionOf(program, fixture.decl);
      return text(describe(found)) !== text(fixture.decision)
        || text(found) !== JSON.stringify(pinned[fixture.name]);
    }).map(fixture => fixture.name);
  };

  return { carriedWrong, keptWrong, verdictWrong };
};
