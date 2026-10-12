module Features.Check.Unify
  ( module Features.Check.Subst
  , module Features.Check.Binding
  , unify
  , settleRows
  , compose
  ) where

import Prelude hiding (compose)
import Control.Monad.Rec.Class (Step(..), tailRec, tailRecM)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (isNothing, maybe')
import Data.Tuple (Tuple(..))
import Domain.Row (HandlerRows, Label(..), clauseRow)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Aliases (noAliases)
import Features.Check.Binding (exceedsLimit, inferredTypeLimit)
import Features.Check.Binding as Binding
import Features.Check.Subst
  ( Failure(..)
  , Flex(..)
  , Subst(..)
  , empty
  , isEmpty
  , resolve
  , resolveRow
  , substitute
  , substituteRow
  , walk
  , walkRow
  )
import Features.Check.Origin (linked)
import Features.Check.UnifyMark (equateMarks)
import Features.Check.UnifyRow
  ( ignoringArguments
  , unifyRows
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
-- Rows unify by scoped labels (Features.Check.UnifyRow, FX001).
unify ∷ Subst → Ty Flex → Ty Flex → Either Failure Subst
unify = unifyAt 1

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

-- `substitute (compose later earlier)` is `substitute later` after
-- `substitute earlier`; Map.union keeps the earlier side's bindings.
-- Precondition: `later` was made from `earlier` (or neither made fresh row
-- metas), so their fresh metas do not collide; the smaller counter is
-- kept. Postponed pairs are the earlier's, then the later's; of two links
-- from one occurrence the earlier's stays; mark bindings likewise. The
-- edges and the watch are the later's alone, which hold the earlier's under the
-- precondition (made from it); nothing in src composes, tests only.
compose ∷ Subst → Subst → Subst
compose later@(Subst laterBindings) (Subst earlierBindings) = Subst
  { types: Map.union (map (substitute later) earlierBindings.types)
      laterBindings.types
  , rows: Map.union (map (substituteRow later) earlierBindings.rows)
      laterBindings.rows
  , fresh: min laterBindings.fresh earlierBindings.fresh
  , postponed: earlierBindings.postponed <> laterBindings.postponed
  , links: Map.union earlierBindings.links laterBindings.links
  , marks: laterBindings.marks
      { bindings = Map.union earlierBindings.marks.bindings
          laterBindings.marks.bindings
      , fresh = min laterBindings.marks.fresh earlierBindings.marks.fresh
      }
  , watch: laterBindings.watch
  , aliases: noAliases
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
  _, _ → mismatch subst left right
  where
  -- Arguments pairwise, one level deeper, left to right. Folded here,
  -- not in a helper: each level of a deeply applied type then costs the
  -- frames it did before rows (a helper's one more frame per level
  -- overflowed test/unify-arrow at 1,000 levels).
  unifyPair reached (Tuple leftArgument rightArgument) =
    unifyAt (level + 1) reached leftArgument rightArgument

-- The handled labels' marks are types' parts and unify by equality; a clash
-- is the handler types differing (P3).
handledMarks
  ∷ Ty Flex
  → Ty Flex
  → Label (Ty Flex)
  → Label (Ty Flex)
  → Subst
  → Either Failure Subst
handledMarks left right (Label _ _ one) (Label _ _ other) subst =
  maybe' refused Right (equateMarks subst one other)
  where
  refused _ = mismatch subst left right

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

-- C is compared only when a side has one of its own; `Nothing` is R, which
-- was just unified with marks if neither has one (a written type then costs
-- one row, not two).
unifyClauses
  ∷ HandlerRows (Ty Flex) Flex
  → HandlerRows (Ty Flex) Flex
  → Subst
  → Either Failure Subst
unifyClauses left right subst =
  if isNothing left.clauses && isNothing right.clauses then Right subst
  else unifyRows ignoringArguments subst
    (clauseRow left)
    (clauseRow right)

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

sameLength ∷ ∀ a b. Array a → Array b → Boolean
sameLength one other = Array.length one == Array.length other

-- The differing pair is resolved for the message only when that is safe.
mismatch ∷ Subst → Ty Flex → Ty Flex → Either Failure Subst
mismatch subst left right =
  if exceedsLimit subst left || exceedsLimit subst right then Left TooDeep
  else Left (Mismatch (resolve subst left) (resolve subst right))
