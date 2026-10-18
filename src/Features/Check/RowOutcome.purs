module Features.Check.RowOutcome
  ( RowOutcome(..)
  , Stop(..)
  , Settled
  , Contradiction
  , settledSubst
  , refusal
  , endOfBody
  , concluded
  , reasonOf
  ) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmpty
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Features.Check.Pending (Pending)
import Features.Check.RowStore (Because(..))
import Features.Check.Subst (Subst, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))
import Features.Check.Waits (pendingOf, waitingOf)

-- How row solving ends (R005 Tranche B plan, "An explicit three-way
-- result"; docs/engineering.md, "Evidence for solvers and diagnostics").
-- `Solved`: no equation with a constant waits, and the substitution read
-- with every unsolved tail empty is a solution, the least (rules §12).
-- `Contradiction`: the solver established that no solution exists; its
-- failure and the reason of the fact it broke, if any. `Unresolved`:
-- neither was established, and the equations still waiting with a
-- constant, earliest site first; it claims nothing about how many
-- solutions exist. Renderers take only this value: a contradiction's text
-- only from `Contradiction`, an unresolved text only from `Unresolved`'s
-- payload. Only the end of a body classifies a substitution (`Settled`
-- has no exported constructor), so a unification that succeeds is never
-- read as `Solved` while an equation may wait (Task 5).
data RowOutcome
  = Solved Settled
  | Contradiction Contradiction
  | Unresolved Settled (NonEmptyArray Pending)

-- A substitution the end of a body classified.
newtype Settled = Settled Subst

type Contradiction = { failure ∷ Failure, because ∷ Maybe Because }

-- Why solving stopped without a semantic outcome: a limit reached (the
-- type grew past `inferredTypeLimit`), an invariant the rules' arguments
-- establish found broken (a checker defect), or work a later task does
-- (a placeholder). None of them says anything about the solutions.
data Stop = Limit | Internal String | Unfinished String

settledSubst ∷ Settled → Subst
settledSubst (Settled subst) = subst

-- A whole run's outcome: a failure classified, or the substitution it
-- reached classified by the end of a body.
concluded ∷ Either Failure Subst → Either Stop RowOutcome
concluded = either (map Contradiction <<< refusal) endOfBody

-- The end of a body (design §6 steps 1-2, rules §12): the state the
-- joint fixpoint drained, classified. An equation with a constant still
-- waiting is `Unresolved` (the default cannot meet it); otherwise every
-- fact and quiet equation is met by the empty default, `Solved`. An
-- equation woken and not examined again means the drain did not reach
-- its fixpoint: a checker defect, `Internal`, never a verdict.
endOfBody ∷ Subst → Either Stop RowOutcome
endOfBody subst
  | not (Set.isEmpty (waitingOf (storeOf subst)).woken) = Left
      (Internal "A pending row equation was woken and not drained")
  | otherwise = Right
      (maybe (Solved settled) (Unresolved settled) (NonEmpty.fromArray open))
  where
  settled = Settled subst
  open = Array.sortWith equationOf
    (Array.filter (not <<< quietOf) (pendingOf subst))
  equationOf pending = pending.equation
  quietOf pending = pending.quiet

-- A unification's failure classified. Every failure is classified by
-- name, so a new constructor forces a decision on what it establishes
-- (docs/plans/2026-10-17-open-row-merge-rules.md §11b): only a refusal a
-- rejection rule argues, or a unifier refusal of field types that has no
-- unifier, is a `Contradiction`; the drain's failure is its inner one's.
refusal ∷ Failure → Either Stop Contradiction
refusal failure = case failure of
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
  Drained _ inner → either Left (const contradiction) (refusal inner)
  where
  contradiction = Right { failure, because: reasonOf failure }

-- The reason of the fact a failure broke, if it broke one.
reasonOf ∷ Failure → Maybe Because
reasonOf = case _ of
  Refused found → refusalReason found
  Drained _ inner → reasonOf inner
  _ → Nothing

refusalReason ∷ Refusal → Maybe Because
refusalReason = case _ of
  Forbidden _ written → Just (Lacks written)
  Overlap _ pair _ → Just (Disjoint pair)
  MayHold _ _ because → Just because
  Unproven _ _ because → Just because
  Twice _ because → Just because
  Derived _ lack → Just lack.because
  Outside _ _ → Nothing
