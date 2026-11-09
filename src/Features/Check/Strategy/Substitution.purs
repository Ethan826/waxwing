-- trusted surface: every diff needs token review; see docs/engineering.md
-- G0, the generic-substitution check (T-R0a §4.2; Task 4.2): trusted,
-- and the only module of Features.Check.Strategy* that mints `Valid`
-- (scripts/structure.mjs). Every diff here needs token review
-- (docs/engineering.md; scripts/trusted-surface.json).
--
-- It checks every `B` atom under the candidate against `D`
-- (Features.Check.Strategy.Atoms), then every `BQ` atom outside
-- §3.2(a)'s open set by the ground rule (Features.Check.Strategy.Asked).
-- The open atoms already block Solved through rule 1, so it neither
-- accepts nor refuses on them. Assurance: `Pending
-- genericSubstitutionSound`, argued as the standard check of a proposed
-- unifier, not proved.
--
-- `certify` is the substitution-only check (BACKLOG R026), no longer the
-- online strategy's since the minting switch (§18.170): given σ
-- before the hole defaults, it checks σ with each hole at its default
-- (ReadBack.Type `settled`, the defaults lowering and the hole contract
-- use) and builds the witness from the same σ, so a hole stays `Free`
-- for the contract to judge, the witness always built from what this
-- check judged. `checkSubstitution`, which yields a bare
-- `Valid`, is no longer exported (BACKLOG R030): `certify` is the only
-- entry besides `validate` (below), and a substitution without holes
-- settles to itself.
-- `certifySound` names `certify`'s statement: G0's check
-- (`genericSubstitutionSound`) plus C1 and C2 of
-- docs/plans/r0-certify-argument.md, argued with checks, not proved.
--
-- `validate` is A2's non-minting runner (dossier §18.145 (b); spec §4):
-- record validation, the first `Unsupported`, I3 (Effects.Validate
-- `prerequisites`), G0's check on `erase (settle P_in)`, completion
-- once, the obligations on the settled completed package
-- (`judgeObligations`), then the witness of the completed package and
-- `coverage`. It lives here because only this module mints `Valid`.
-- Its success is a validation result, never a `Certified` value: it
-- constructs none. `certifyPackage` is the same composition and mints.
module Features.Check.Strategy.Substitution
  ( ValidationResult
  , certify
  , certifyPackage
  , certifySound
  , genericSubstitutionSound
  , validate
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Traversable (traverse_)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Verdict (Compilation(..), StatementRef(..))
import Domain.Verdict.Certified.Internal (Certified(..))
import Domain.Verdict.EffectPackage (Completed, EffectPackage)
import Domain.Verdict.Internal (Valid(..))
import Domain.Verdict.Search (CheckRefusal(..))
import Features.Check.Strategy.Asked (requirementUnder)
import Features.Check.Strategy.Atoms (atomUnder, facts)
import Features.Check.Strategy.Candidate (Substitution, generic)
import Features.Check.Strategy.Effects.Complete (complete, witnessOf)
import Features.Check.Strategy.Effects.Package (erase, settle)
import Features.Check.Strategy.Effects.Validate
  ( judgeObligations
  , prerequisites
  )
import Features.Check.Strategy.ReadBack.Type (settled)
import Features.Check.Strategy.Witness
  ( coverage
  , flexDomain
  , substitutionWitness
  )

type ValidationResult =
  { validity ∷ Valid, completed ∷ Completed, compilation ∷ Compilation }

genericSubstitutionSound ∷ StatementRef
genericSubstitutionSound = StatementRef "genericSubstitutionSound"

certifySound ∷ StatementRef
certifySound = StatementRef "certifySound"

certify ∷ RecordedProblem → Substitution → Either CheckRefusal Certified
certify problem unsettled = map witnessed
  (checkSubstitution problem (map settled unsettled))
  where
  witnessed validity =
    Certified validity (substitutionWitness problem unsettled)

-- Each step runs only when the earlier ones hold; completion runs once,
-- after G0, and its package is the one the obligations and the witness
-- read (spec §4 steps 0-5, §18.141). G0 reads erase (settle P_in), not
-- P_c: it does not see completion's fresh holes, so an absent flexible
-- variable stays flexible for G0 (test "G0 reads erase (settle P_in)").
-- Owed (Task 15): G0 accepts erase P_c whenever it accepts this input.
validate
  ∷ RecordedProblem → EffectPackage → Either CheckRefusal ValidationResult
validate = validatedBy resultOf
  where
  resultOf validity completed compilation =
    { validity, completed, compilation }

-- `validate`'s own composition, ending in a `Certified` in place of a
-- result (§18.159 criterion 5; plan Task 16; §18.170).
certifyPackage
  ∷ RecordedProblem → EffectPackage → Either CheckRefusal Certified
certifyPackage = validatedBy minted
  where
  minted validity _ compilation = Certified validity compilation

validatedBy
  ∷ ∀ r
  . (Valid → Completed → Compilation → r)
  → RecordedProblem
  → EffectPackage
  → Either CheckRefusal r
validatedBy finish problem package = do
  prerequisites problem package
  validity ← checkSubstitution problem (erase (settle package))
  validated finish problem validity (complete problem package)

validated
  ∷ ∀ r
  . (Valid → Completed → Compilation → r)
  → RecordedProblem
  → Valid
  → Completed
  → Either CheckRefusal r
validated finish problem validity completed = do
  judgeObligations problem completed
  Right (finish validity completed (compiledFrom problem completed))

-- As `substitutionWitness`: offered only if `coverage` accepts it.
compiledFrom ∷ RecordedProblem → Completed → Compilation
compiledFrom problem completed =
  either NoWitness (const (Witnessed witness))
    (coverage (flexDomain problem) problem witness)
  where
  witness = witnessOf problem completed

checkSubstitution
  ∷ RecordedProblem → Substitution → Either CheckRefusal Valid
checkSubstitution problem candidate
  | not (generic problem candidate) = Left NotGeneric
  | otherwise =
      do
        traverse_ (atomUnder (facts problem) candidate) view.b
        traverse_ (requirementUnder problem candidate) view.bq
        Right Valid
      where
      view = fields problem
