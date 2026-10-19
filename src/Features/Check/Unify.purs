module Features.Check.Unify
  ( module Features.Check.Subst
  , module Features.Check.Binding
  , module Features.Check.Compose
  , module Features.Check.UnifyFailure
  , unify
  , reexamine
  , settleRows
  ) where

import Prelude hiding (compose)
import Control.Monad.Rec.Class (Step(..), tailRec, tailRecM)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Maybe (isNothing)
import Data.Tuple (Tuple(..))
import Domain.Row (HandlerRows, Label(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Binding (exceedsLimit, inferredTypeLimit)
import Features.Check.Binding as Binding
import Features.Check.Compose (compose)
import Features.Check.Subst
  ( Flex(..)
  , Subst(..)
  , empty
  , isEmpty
  , substitute
  , substituteRow
  , walk
  , walkRow

  , resolve
  , resolveRow
  )
import Features.Check.UnifyFailure (Failure(..))
import Features.Check.Origin (linked)
import Features.Check.RowMerge.Improve (improve)
import Features.Check.UnifyParts
  ( handledMarks
  , mismatch
  , sameLength
  , unifyClauses
  )
import Features.Check.UnifyRecord (unifyRecord)
import Features.Check.UnifyRow
  ( unifyRows
  , unifyRowsIgnoring
  , unifyRowsTraced
  )

-- Rigid matches only the same rigid; a meta binds to any type that does not
-- properly contain it; applied types unify argument-wise, left to right,
-- then row argument-wise, stopping at the first failure; arrows unify
-- parameter, then row, then result. The recursion is bounded by level (one
-- per applied type, arrow parameter or label argument entered, so a level
-- is a resolved depth; an arrow's result stays at the arrow's level,
-- design §1): metas bound earlier in the same unification can chain into
-- types deeper than either operand was, so past `inferredTypeLimit` it
-- fails with TooDeep instead of recursing further (ruling R7, fix round 2).
-- Rows unify by scoped labels (Features.Check.UnifyRow, FX001); records'
-- fields one level deeper, by label (Features.Check.UnifyRecord, R001).
-- After a top-level unification the waiting `Merge` predicates are
-- re-examined (R005 Tranche B plan §2.4), with the plain unifier, so a
-- case's own unification never starts another rescan; with none waiting
-- this costs nothing.
unify ∷ Subst → Ty Flex → Ty Flex → Either Failure Subst
unify subst left right = unifyAt 1 subst left right >>= reexamine

-- The waiting predicates re-examined on their own (the test entry runs
-- this after making a step's rows, as the research prototype's driver
-- does).
reexamine ∷ Subst → Either Failure Subst
reexamine = improve (unifyAt 1)

-- Retries the postponed row pairs, in order, until a pass decides none
-- (a pair is decided when it unifies or fails; the first failure is the
-- result). Pairs still undecidable stay in `postponed`: FX001 Task 5
-- reports them (`Fail needs a concrete error family`).
settleRows ∷ Subst → Either Failure Subst
settleRows = tailRecM pass
  where
  pass subst@(Subst bindings) = next subst <$> foldM retry
    { subst: Subst bindings { postponed = [] }, decided: false }
    bindings.postponed
  next original found =
    if found.decided then Loop found.subst else Done original
  retry reached pair = settled reached <$> unifyRowsTraced unify pair.mode
    pair.sides
    reached.subst
    pair.left
    pair.right
  settled reached traced =
    { subst: linked traced.events traced.subst
    , decided: reached.decided || not traced.postponed
    }

unifyAt ∷ Int → Subst → Ty Flex → Ty Flex → Either Failure Subst
unifyAt level subst left right =
  if level > inferredTypeLimit then Left TooDeep
  else unifyHeads level subst (walk subst left) (walk subst right)

-- Two arrows' spines in step, by a loop: each pair of parameters one level
-- deeper, each pair of rows (their label arguments one level deeper), each
-- pair of results at this level, until one side is no arrow. Only two
-- arrows enter the loop, so an applied type's levels cost the frames they
-- did before (stack headroom after unifying 1,000 levels was unchanged
-- when measured; through the loop for each level, every level of 1,000
-- nested parameters left more headroom than nested lists do).
unifyArrows ∷ Int → Subst → Ty Flex → Ty Flex → Either Failure Subst
unifyArrows level subst left right = tailRec (unifySpines level)
  { subst, left, right }

unifySpines
  ∷ Int
  → { subst ∷ Subst, left ∷ Ty Flex, right ∷ Ty Flex }
  → Step { subst ∷ Subst, left ∷ Ty Flex, right ∷ Ty Flex }
      (Either Failure Subst)
unifySpines level pending =
  case walk pending.subst pending.left, walk pending.subst pending.right of
    TFun first firstRow rest, TFun second secondRow more →
      either (Done <<< Left) (next rest more)
        ( unifyAt (level + 1) pending.subst first second
            >>= unifyRowAt level firstRow secondRow
        )
    left, right → Done (unifyHeads level pending.subst left right)
  where
  next rest more subst = Loop { subst, left: rest, right: more }

-- Both sides are walked, so a meta here is unbound. Of two metas, the
-- newer (larger) is bound to the older, so siblings joined one after
-- another all point at the oldest: binding the older to the newer built a
-- chain as long as the siblings, which every later walk followed (P001
-- final review: 5,000 `Nothing` arms took 15.9 s).
unifyHeads ∷ Int → Subst → Ty Flex → Ty Flex → Either Failure Subst
unifyHeads level subst left right = case left, right of
  TVar (Meta older), TVar (Meta newer) | older < newer →
    Binding.bindType subst newer (TVar (Meta older))
  TVar (Meta meta), _ → Binding.bindType subst meta right
  _, TVar (Meta meta) → Binding.bindType subst meta left
  TVar (Rigid one), TVar (Rigid other) | one == other → Right subst
  TInt, TInt → Right subst
  TBool, TBool → Right subst
  TUnit, TUnit → Right subst
  TText, TText → Right subst
  TData one lefts leftRows, TData other rights rightRows
    | one == other && sameLength lefts rights
        && sameLength leftRows rightRows →
        foldM unifyPair subst (Array.zip lefts rights)
          >>= unifyRowsAt level leftRows rightRows
  THandler leftLabel@(Label one lefts _) leftRows,
  THandler rightLabel@(Label other rights _) rightRows
    | one == other && sameLength lefts rights →
        foldM unifyPair subst (Array.zip lefts rights)
          >>= handledMarks left right leftLabel rightLabel
          >>= unifyInference level leftRows rightRows
          >>= unifyClauses leftRows rightRows
  TFun _ _ _, TFun _ _ _ → unifyArrows level subst left right
  TRecord one, TRecord other → unifyRecord (unifyAt (level + 1)) subst one
    other
  _, _ → mismatch subst left right
  where
  -- Arguments pairwise, one level deeper, left to right. Folded here,
  -- not in a helper: each level of a deeply applied type then costs the
  -- frames it did before rows (a helper's one more frame per level
  -- overflowed test/unify-arrow at 1,000 levels).
  unifyPair reached (Tuple leftArgument rightArgument) =
    unifyAt (level + 1) reached leftArgument rightArgument

-- R is the inference row: it unifies with the context ignoring marks,
-- which are dead there (design §3.4). When neither type has a C of its
-- own, C is R and its marks are compared with it, in one pass (P3).
unifyInference
  ∷ Int
  → HandlerRows (Ty Flex) Flex
  → HandlerRows (Ty Flex) Flex
  → Subst
  → Either Failure Subst
unifyInference level left right subst =
  if isNothing left.clauses && isNothing right.clauses then
    unifyRowAt level left.inference right.inference subst
  else unifyRowsIgnoring (unifyAt (level + 1)) subst left.inference
    right.inference

-- Two rows at this level: their label arguments one level deeper.
unifyRowAt
  ∷ Int → TyRow Flex → TyRow Flex → Subst → Either Failure Subst
unifyRowAt level left right subst = unifyRows (unifyAt (level + 1)) subst
  left
  right

unifyRowsAt
  ∷ Int
  → Array (TyRow Flex)
  → Array (TyRow Flex)
  → Subst
  → Either Failure Subst
unifyRowsAt level lefts rights subst = foldM unifyPair subst
  (Array.zip lefts rights)
  where
  unifyPair reached (Tuple left right) = unifyRowAt level left right reached
