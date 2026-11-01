// A2 Task 11's regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-validate.mjs. Each restores one defect in a whole,
// compiling form.
const validate = 'src/Features/Check/Strategy/Effects/Validate.purs';
const substitution = 'src/Features/Check/Strategy/Substitution.purs';
const unsupportedStep = '  refuseWith identity\n'
  + '    (findMap unsupportedIn (fields problem).effects.obligations)\n';
const i3Step = '  refuseWith Malformed (malformed problem package)\n';
const judged = '  traverse_ (judgeOne problem context)';
const refused = '  refused failure = Left (classify (dependencySet problem)';
const g0Step = '  validity ← checkSubstitution problem'
  + ' (erase (settle package))\n';

export const a2ValidateRows = [
  {
    // Spec §4, C5: I3 before `Unsupported`, so a package without the
    // unread frame term is Malformed instead of the step-1 refusal.
    name: 'r0-a2-unsupported-before-i3',
    file: validate,
    needle: unsupportedStep + i3Step,
    replacement: i3Step + unsupportedStep,
    probe: 'r0-a2-unsupported-before-i3',
    message: /C5 without a frame term: expected NotCertifiable Unsupported/
  },
  {
    // Spec §5, C2(c) (the previous revision's steps 5 then 6): conditions
    // everywhere, then edges. The kinds whose checks are edges (`Defer`,
    // `HandlerLit`, `Install`) are judged after every other obligation,
    // so the `AtCallback` (7) is reported before the `Defer` (2).
    name: 'r0-a2-recorded-order',
    edits: [
      {
        file: validate,
        needle: 'import Data.Array (findMap)\n',
        replacement: 'import Data.Array (findMap, partition)\n'
      },
      {
        file: validate,
        needle: `${judged} view.effects.obligations\n  where\n`,
        replacement: `${judged} (split.no <> split.yes)\n`
          + '  where\n'
          + '  split = partition edges view.effects.obligations\n'
          + '  edges placed = case placed.value of\n'
          + '    Defer _ → true\n'
          + '    HandlerLit _ → true\n'
          + '    Install _ → true\n'
          + '    _ → false\n'
      }
    ],
    probe: 'r0-a2-recorded-order',
    message: /C2\(c\) obligation: expected 2, got 7/
  },
  {
    // Spec §5 ("every edge carries (provenance of i, j)"): failures
    // reported from one pool under the declaration's first obligation.
    name: 'r0-a2-edge-provenance',
    edits: [
      {
        file: validate,
        needle: 'import Data.Array (findMap)\n',
        replacement: 'import Data.Array (findMap, head)\n'
      },
      {
        file: validate,
        needle: 'import Data.Maybe (Maybe(..), maybe)\n',
        replacement: 'import Data.Maybe (Maybe(..), fromMaybe, maybe)\n'
      },
      {
        file: validate,
        needle: `${refused} placed failure)\n`,
        replacement: `${refused} pooled failure)\n`
          + '  pooled = fromMaybe placed'
          + ' (head (fields problem).effects.obligations)\n'
      }
    ],
    probe: 'r0-a2-edge-provenance',
    message: /C2\(c\) provenance is the Defer's: expected true, got false/
  },
  {
    // §18.145 (b), spec §4: G0 before the prerequisites, so a package
    // binding a forced tail is refused by G0 instead of I3.
    name: 'r0-a2-runner-sequence',
    file: substitution,
    needle: `  prerequisites problem package\n${g0Step}`,
    replacement: `${g0Step}  prerequisites problem package\n`,
    probe: 'r0-a2-runner-sequence',
    message: /I3 before G0: expected Malformed BindsForced, got Unsatisfied/
  },
  {
    // Task 11's review, spec §4 ("G0 does not see completion's fresh
    // holes"): G0 judges erase P_c, so an absent variable C7(b)'s G0
    // refuses is accepted.
    name: 'r0-a2-g0-input',
    edits: [
      {
        file: substitution,
        needle: g0Step,
        replacement: '  validity ← checkSubstitution problem\n'
          + '    (erase (settledOf (complete problem package)))\n'
      },
      {
        file: substitution,
        needle: '(complete, witnessOf)\n',
        replacement: '(complete, settledOf, witnessOf)\n'
      }
    ],
    probe: 'r0-a2-g0-input',
    message: /G0 on erase \(settle P_in\): expected Unsatisfied, got Right/
  },
  {
    // Task 9's review, spec §4 ("the obligations' package: P_c only"):
    // obligations judged on the unsettled completed package, so C7(a)'s
    // holes 3 and 4 differ.
    name: 'r0-a2-judge-settled',
    edits: [
      {
        file: validate,
        needle: 'import Domain.Verdict.EffectPackage'
          + ' (Completed, EffectPackage)\n',
        replacement: 'import Domain.Verdict.EffectPackage\n'
          + '  ( Completed, EffectPackage, completedPackage )\n'
      },
      {
        file: validate,
        needle: '    { package: settledOf completed,',
        replacement: '    { package: completedPackage completed,'
      },
      {
        file: validate,
        needle: 'import Features.Check.Strategy.Effects.Complete'
          + ' (settledOf)\n',
        replacement: ''
      }
    ],
    probe: 'r0-a2-judge-settled',
    message: /C7\(a\) on the settled completed package: expected Right, got/
  }
];
