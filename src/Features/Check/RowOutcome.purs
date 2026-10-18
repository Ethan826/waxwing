module Features.Check.RowOutcome
  ( RowOutcome(..)
  , Stop(..)
  , Contradiction
  , Pending
  , outcome
  , reasonOf
  ) where

import Prelude
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..))
import Features.Check.FlatRecord (Flat)
import Features.Check.RowStore (Because(..))
import Features.Check.Subst (Subst)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- How row solving ends (R005 Tranche B plan, "An explicit three-way
-- result"; docs/engineering.md, "Evidence for solvers and diagnostics").
-- `Solved`: no equation waits, and the substitution read with every
-- unsolved tail empty is a solution. `Contradiction`: the solver
-- established that no solution exists; its failure and the reason of the
-- fact it broke, if any. `Unresolved`: neither was established, and the
-- equations still waiting; it claims nothing about how many solutions
-- exist. Renderers take only this value: a contradiction's text only from
-- `Contradiction`, an unresolved text only from `Unresolved`'s payload.
-- Task 4 makes the first two; `Unresolved` is made only at the end of a
-- body, by Task 5, which also gives `Pending` its identity and site.
data RowOutcome
  = Solved Subst
  | Contradiction Contradiction
  | Unresolved Subst (NonEmptyArray Pending)

type Contradiction = { failure ∷ Failure, because ∷ Maybe Because }

-- An equation that waits: its residue's two sides (Task 5 adds the rest).
type Pending = { left ∷ Flat, right ∷ Flat }

-- Why solving stopped without a semantic outcome: a limit reached (the
-- type grew past `inferredTypeLimit`), an invariant the rules' arguments
-- establish found broken (a checker defect), or work a later task does
-- (a placeholder). None of them says anything about the solutions.
data Stop = Limit | Internal String | Unfinished String

-- The outcome of solving that ended in `found`, or why it stopped
-- without one. Every failure is classified by name, so a new constructor
-- forces a decision on what it establishes (docs/plans/2026-10-17-open-
-- row-merge-rules.md §11b): only a refusal a rejection rule argues, or a
-- unifier refusal of field types that has no unifier, is a
-- `Contradiction`.
outcome ∷ Either Failure Subst → Either Stop RowOutcome
outcome = either classified (Right <<< Solved)
  where
  contradiction failure = Right
    (Contradiction { failure, because: reasonOf failure })
  classified failure = case failure of
    Mismatch _ _ → contradiction failure
    Occurs _ _ → contradiction failure
    RowMissing _ _ _ → contradiction failure
    RowExtra _ _ _ → contradiction failure
    RowPayload _ _ _ → contradiction failure
    RowSharedTail _ _ → contradiction failure
    RowMismatch _ _ → contradiction failure
    RowOccurs _ _ → contradiction failure
    Refused _ → contradiction failure
    TooDeep → Left Limit
    Unexpected what → Left (Internal what)
    Placeholder what → Left (Unfinished what)

-- The reason of the fact a failure broke, if it broke one.
reasonOf ∷ Failure → Maybe Because
reasonOf = case _ of
  Refused found → refusalReason found
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
