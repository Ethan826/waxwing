-- The body as CX's search reads it (Counter/Search.purs): atoms grouped
-- by id, in first-appearance order, since `withBody` reads every atom of
-- an id; only groups of at most `smallGroup` expression nodes, counted
-- by a loop that stops at the bound, so a signature's long arrow spine
-- (thousands of parameters) is never walked by recursion here. A
-- group's rows are the row variables its atoms mention.
module Features.Check.Refute.Counter.Groups
  ( Group
  , groupsOf
  , labelsIn
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concatMap, cons, mapMaybe, nub, uncons)
import Data.Map (fromFoldableWith, lookup)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), snd)
import Domain.Recorded (AtomId)
import Domain.Recorded.Atom (Var)
import Features.Check.Refute.Counter.Instance (atomRows)
import Features.Check.Refute.Sig
  ( SigAtom(..)
  , SigEntry
  , SigExpr(..)
  , SigProblem
  )

type Group = { id ∷ AtomId, entries ∷ Array SigEntry, rows ∷ Array Var }

-- Expression nodes a group may hold to be tried.
smallGroup ∷ Int
smallGroup = 200

groupsOf ∷ SigProblem → Array Group
groupsOf sig = mapMaybe groupAt (nub (map keyOf sig.b))
  where
  byKey = fromFoldableWith (flip (<>)) (map keyed sig.b)
  keyed entry = Tuple (keyOf entry) [ entry ]
  groupAt key = lookup key byKey >>= small
  small entries = maybe Nothing (grouped entries) (firstId entries)
  grouped entries id =
    if within smallGroup (concatMap (sides <<< _.atom) entries) then
      Just { id, entries, rows: nub (concatMap (atomRows <<< _.atom) entries) }
    else Nothing
  firstId entries = map (_.id <<< _.head) (uncons entries)
  keyOf entry = Tuple entry.id.path entry.id.index

-- Labels written in `D` and in the groups, each once.
labelsIn ∷ SigProblem → Array Group → Array String
labelsIn sig groups = nub
  ( concatMap (atomLabels <<< _.atom) sig.d
      <> concatMap (concatMap (atomLabels <<< _.atom) <<< _.entries) groups
  )

sides ∷ SigAtom → Array SigExpr
sides atom = case atom of
  SigEqual left right → [ left, right ]
  SigLacks _ _ → []
  SigDisjoint _ _ → []
  SigFf → []

-- At most `bound` nodes in all, counted with an explicit stack.
within ∷ Int → Array SigExpr → Boolean
within bound start = tailRec counted { stack: start, count: 0 }
  where
  counted { stack, count } =
    if count > bound then Done false
    else maybe (Done true) (popped count) (uncons stack)
  popped count { head, tail } =
    Loop { stack: children head <> tail, count: count + 1 }

children ∷ SigExpr → Array SigExpr
children expression = case expression of
  SigBase _ → []
  SigArrow parameter result → [ parameter, result ]
  SigTVar _ → []
  SigRecord fieldList _ → map snd fieldList

atomLabels ∷ SigAtom → Array String
atomLabels atom = case atom of
  SigEqual left right → exprLabels left <> exprLabels right
  SigLacks _ label → [ label ]
  SigDisjoint _ _ → []
  SigFf → []

exprLabels ∷ SigExpr → Array String
exprLabels expression = case expression of
  SigBase _ → []
  SigArrow parameter result → exprLabels parameter <> exprLabels result
  SigTVar _ → []
  SigRecord fieldList _ → concatMap fieldLabels fieldList
  where
  fieldLabels (Tuple label value) = cons label (exprLabels value)
