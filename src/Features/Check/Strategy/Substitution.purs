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
-- `substitutionOnly` is the substitution-only check (BACKLOG R026), a
-- non-minting comparator since §18.174 for tests, loss measurements and
-- performance baselines: given σ before the hole defaults, it checks σ
-- with each hole at its default (ReadBack.Type `settled`) and gives the
-- witness the same σ would build, but constructs no `Certified`.
-- `checkSubstitution`, which yields a bare `Valid`, is not exported
-- (BACKLOG R030). `certifySound` names that check's argument
-- (docs/plans/r0-certify-argument.md) and no minting path uses it.
--
-- `certifyPackage` is the only minter (§18.170, §18.174), the online
-- strategy's check: `validate`'s composition ending in `Certified`. Its
-- statement is `certifyPackageSound`, still Pending
-- (docs/plans/r0-certify-package-argument.md).
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
  , SubstitutionVerdict
  , certifyPackage
  , certifyPackageSound
  , certifySound
  , genericSubstitutionSound
  , substitutionOnly
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

-- The substitution-only check's answer: what it judged and the witness
-- it would give, never a `Certified`.
type SubstitutionVerdict = { validity ∷ Valid, compilation ∷ Compilation }

genericSubstitutionSound ∷ StatementRef
genericSubstitutionSound = StatementRef "genericSubstitutionSound"

certifySound ∷ StatementRef
certifySound = StatementRef "certifySound"

certifyPackageSound ∷ StatementRef
certifyPackageSound = StatementRef "certifyPackageSound"

substitutionOnly
  ∷ RecordedProblem → Substitution → Either CheckRefusal SubstitutionVerdict
substitutionOnly problem unsettled = map judged
  (checkSubstitution problem (map settled unsettled))
  where
  judged validity =
    { validity, compilation: substitutionWitness problem unsettled }

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
