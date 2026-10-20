module Features.Check.RowOutcome
  ( RowOutcome(..)
  , Stop(..)
  , Contradiction
  , Settled
  , settledSubst
  , concluded
  , stepped
  , reasonOf
  ) where

import Prelude
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..))
import Features.Check.RowMerge.End (Ended, ended)
import Features.Check.RowMerge.Merge (Merge)
import Features.Check.RowStore (Because(..))
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- How row solving ends (R005 Tranche B plan, "An explicit three-way
-- result"; docs/engineering.md, "Evidence for solvers and diagnostics").
-- `Solved`: no predicate waits, and the substitution read with every
-- unsolved tail empty is a solution. `Contradiction`: the solver
-- established that no solution exists; its failure and the reason of the
-- fact it broke, if any. `Unresolved`: neither was established; the
-- predicates still waiting, in identity order. It claims nothing about
-- how many solutions exist. Renderers take only this value: a
-- contradiction's text only from `Contradiction`, an unresolved text
-- only from `Unresolved`'s payload. `Solved` and `Unresolved` carry a
-- `Settled`, made only from the end of a body (`concluded`).
data RowOutcome
  = Solved Settled
  | Contradiction Contradiction
  | Unresolved Settled (NonEmptyArray Merge)

type Contradiction = { failure ∷ Failure, because ∷ Maybe Because }

-- A substitution at the end of a body; its constructor is not exported.
newtype Settled = Settled Subst

settledSubst ∷ Settled → Subst
settledSubst (Settled subst) = subst

-- Why solving stopped without a semantic outcome: a limit reached (the
-- type grew past `inferredTypeLimit`), an invariant the rules' arguments
-- establish found broken (a checker defect), or work a later task does
-- (a placeholder). None of them says anything about the solutions.
data Stop = Limit | Internal String | Unfinished String

-- The end of a body classified (Features.Check.RowMerge.End `endOfBody`).
concluded ∷ Either Failure Ended → Either Stop RowOutcome
concluded = either (map Contradiction <<< classified)
  (Right <<< ended (Solved <<< Settled) (Unresolved <<< Settled))

-- One step of solving (a unification, a fact) classified: it went on, or
-- it established a contradiction, or it stopped. A step is never a
-- verdict on the body.
stepped ∷ Either Failure Subst → Either Stop (Either Contradiction Subst)
stepped = either (map Left <<< classified) (Right <<< Right)

-- Every failure is classified by name, so a new constructor forces a
-- decision on what it establishes (docs/plans/2026-10-17-open-row-merge-
-- rules.md §11b): only a refusal a rejection rule argues, or a unifier
-- refusal of field types that has no unifier, is a contradiction.
classified ∷ Failure → Either Stop Contradiction
classified failure = case failure of
  Mismatch _ _ → contradiction
  Occurs _ _ → contradiction
  RowMissing _ _ _ → contradiction
  RowExtra _ _ _ → contradiction
  RowPayload _ _ _ → contradiction
  RowSharedTail _ _ → contradiction
  RowMismatch _ _ → contradiction
  RowOccurs _ _ → contradiction
  Refused _ → contradiction
  TooDeep → Left Limit
  Unexpected what → Left (Internal what)
  Placeholder what → Left (Unfinished what)
  -- B3: what a predicate caused is what its own failure establishes,
  -- kept with its cause for the renderers.
  FromMerge _ found → const failure' <$> classified found
  -- B3: the rescan's bound (rules §5), a safeguard: a limit.
  Exhausted _ → Left Limit
  -- B4: H's refusal, established by H's argument (rules §7).
  Homeless _ → contradiction
  where
  contradiction = Right failure'
  failure' = { failure, because: reasonOf failure }

-- The reason of the fact a failure broke, if it broke one.
reasonOf ∷ Failure → Maybe Because
reasonOf = case _ of
  Refused found → refusalReason found
  FromMerge _ found → reasonOf found
  _ → Nothing

refusalReason ∷ Refusal → Maybe Because
refusalReason = case _ of
  Forbidden _ written → Just (Lacks written)
  Overlap _ pair _ → Just (Disjoint pair)
  MayHold _ _ because → Just because
  Unproven _ _ because → Just because
  Twice _ because → Just because
