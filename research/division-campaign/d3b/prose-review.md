# D3b prose review, 2026-10-21

Reviewed with the humanizer skill and the author's README memory.

## Before rewriting

- "How each requirement of the task is met:" describes the assignment
  instead of the construction (humanizer §25). State the construction's
  obligations directly.
- "They are unified, not ignored." adds a staged contrast (§1). The
  following examples already explain which constants unification shares.
- "**Assumption, reported.**" is a decorative bold label (§19). State the
  actual `Fresh` premise and its scope directly.
- "Together, D3bExists, D3bSound and D3bComplete reduce validity per
  pattern to one call-site problem" hides outstanding premises behind a
  confident conclusion (Garner: precision). Name existence, realization
  and finite encoding obligations before any reduction claim.
- "Results: see §15 (filled after the runs)." and "(To be filled after
  the runs.)" are draft residue (§22). Replace them with recorded evidence.

Technical corrections catalogued before editing:

- "It exists iff π has an instance" conflates the proved empty-cell
  unifiability equivalence with the unproved MGU over all allowed cells.
- "everything else by `inl`, is injective" misdescribes `dn`, which reads
  labels via `rinv`, and overclaims the global inverse map.
- "only finitely many constants occur in θs" does not weaken the Lean
  premise: `Fresh` injects every `CConst Label` into `B`.
- "completeness open there" needs the finite-base equation obstruction
  and its missing `SigProblem`/source bridge.
- "contextFree mutant ... fails as expected (§13)" has no completed
  historical run in RESUME; preserve that distinction in the results.

## After rewriting

- Rechecked §6: the five proof obligations remain explicitly open;
  no locality or global injectivity assertion is promoted to a theorem.
- Rechecked §7: both Fresh injections retain their full domains. The
  general finite-base equation family has no claimed AST/source bridge.
- Rechecked §8 and status rows: the classical flat constructor is not
  called an executable unifier or equated to thetaStar.
- Rechecked §15: historical counts, timed-out prefixes, completed
  targeted runs and the unknown verdict are distinct. No test bounds
  or expectations were weakened.
- Remaining bold labels name examples or technical checks and retain
  the source's navigation style. No decorative new labels were added.
- Fixed draft residue "recorded below after validation" before the final
  review. No remaining humanizer tells require a technical rewrite.
- The added extension-stability lemma describes model bases, without
  prescribing Waxwing semantics. Public pre-existing theorem statements
  survived the split unchanged.
