module Features.Check.RowMerge.Improve (improve) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM, foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Syntax (Span)
import Domain.Type (Ty(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Features.Check.RowMerge.Cases (Progress(..), Unifier, examine)
import Features.Check.RowMerge.Merge (Merge, Row)
import Features.Check.RowMerge.Predicate
  ( anyWaiting
  , boundByCase
  , moved
  , replaced
  , solved
  , waiting
  )
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.RowStore (arrival, siteOf)
import Features.Check.Subst (Flex, Subst(..), storeOf)
import Features.Check.UnifyFailure (Failure(..))

-- Re-examination (R005 Tranche B plan §2.4): every waiting predicate
-- examined in identity order, pass after pass, until a pass changes
-- nothing (a full rescan, research/row-merge-qt qt-strict.mjs
-- `improveStrict`). Nothing else improves a predicate. Rules §5 bounds
-- the passes by P · (|Λ| + 1) + 1, with P the predicates waiting and Λ
-- the labels in the substitution's bindings and the predicates' rows at
-- the start; it is computed only once the passes exceed a cheap count,
-- and passing it is `Exhausted`, a limit the argument says never comes.
-- A failure is the predicate's (`FromMerge`), located by the L2 rule.
improve ∷ Unifier → Subst → Either Failure Subst
improve unify subst
  | anyWaiting subst = tailRecM (pass unify) { subst, passes: 0, start: subst }
  | otherwise = Right subst

type Rescan = { subst ∷ Subst, passes ∷ Int, start ∷ Subst }

pass ∷ Unifier → Rescan → Either Failure (Step Rescan Subst)
pass unify found
  | found.passes > cheapPasses found.start
      && found.passes > bound found.start =
      Left (Exhausted "re-examination passed its bound (rules §5)")
  | otherwise =
      next <$> foldM (step unify)
        { subst: found.subst, changed: false }
        (waiting found.subst)
      where
      next reached
        | reached.changed = Loop found
            { subst = reached.subst, passes = found.passes + 1 }
        | otherwise = Done reached.subst

step
  ∷ Unifier
  → { subst ∷ Subst, changed ∷ Boolean }
  → Merge
  → Either Failure { subst ∷ Subst, changed ∷ Boolean }
step unify found merge = either (Left <<< located found.subst merge)
  progressed
  (examine unify merge found.subst)
  where
  progressed = case _ of
    Waits → Right found
    Solved reached → Right
      { subst: solved merge.id (boundByCase merge.id found.subst reached)
      , changed: true
      }
    Replaced next taken reached → Right
      { subst: replaced next
          (moved merge.id taken (boundByCase merge.id found.subst reached))
      , changed: true
      }

-- A stop stays a stop; anything else is this predicate's, at the latest
-- written of the requirement being checked, the predicate's site and the
-- arrival sites of its rows' metas (the user's L2 rule, 2026-10-19).
located ∷ Subst → Merge → Failure → Failure
located subst merge failure = case failure of
  TooDeep → failure
  Unexpected _ → failure
  Placeholder _ → failure
  Exhausted _ → failure
  FromMerge _ inner → caused inner
  _ → caused failure
  where
  caused inner = FromMerge { predicate: merge.id, at: latest spans } inner
  store = storeOf subst
  metas = metasThrough subst (rowTails merge)
  spans = Array.catMaybes
    ( [ siteOf store, merge.site ] <> map (arrival store)
        (Array.fromFoldable metas)
    )

latest ∷ Array Span → Maybe Span
latest = foldl later Nothing
  where
  later found span = Just (maybe span (laterOf span) found)
  laterOf span earlier =
    if key span > key earlier then span else earlier
  key span = Tuple span.start.offset span.end.offset

rowTails ∷ Merge → Array Flex
rowTails merge = merge.left.tails <> merge.right.tails <> merge.result.tails

-- Passes no rescan needs in practice; past them the bound is computed.
cheapPasses ∷ Subst → Int
cheapPasses subst = Array.length (waiting subst) * slack + slack
  where
  slack = 16

-- Rules §5's bound: P · (|Λ| + 1) + 1.
bound ∷ Subst → Int
bound subst = Array.length (waiting subst) * (Set.size (labels subst) + 1)
  + 1

labels ∷ Subst → Set String
labels subst@(Subst bindings) = foldl (flip labelsIn)
  (foldl rowLabels Set.empty (waiting subst))
  (Map.values bindings.types)
  where
  rowLabels found merge = foldl (flip rowIn) found
    [ merge.left, merge.right, merge.result ]

-- Every label of the type at any depth: a record's own, and those in
-- its parts and its rows' label arguments (Domain.Type.Parts).
labelsIn ∷ Ty Flex → Set String → Set String
labelsIn ty found = foldl (flip labelsIn) (own ty)
  (children ty <> Array.concatMap rowArguments (rowsOf ty))
  where
  own = case _ of
    TRecord row → foldl (flip Set.insert) found (map fst row.fields)
    _ → found

rowIn ∷ Row → Set String → Set String
rowIn row = labelsIn (TRecord row)
