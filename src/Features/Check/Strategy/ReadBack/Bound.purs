-- Package values read under ReadBack step 2's θ restricted to holes
-- (`holeBindings`; tranche 2 read-back design §C.7), so the type images
-- and the effect rows read a hole θ binds as σ does, and the package
-- never disagrees with itself on a hole. Untrusted search.
--
-- A hole n that θ binds takes its binding converted by the injected
-- `image` (Images `rowFree`: row-free images naming only holes and
-- rigids). A binding it cannot convert (one needing rows or marks, or
-- naming a flexible problem variable) is `UnreadImage (holeVar n)`: the
-- effect side has no live value for it, and nothing is invented. A bound
-- record tail takes a record's fields and tails, as Entailed/Merge.purs
-- `substitute` merges them; where Merge would not substitute (a tail
-- bound to anything but a record, or a merge repeating a field label),
-- the read is `UnreadImage` on that tail (the first bound one, for a
-- repeated label), fail-closed rather than a value σ does not hold. A
-- bound effect-row tail (`PTailHole n`) is always `UnreadImage`, since
-- θ's values carry no effect row. With no binding the value is
-- returned as it is (corpus-observed: θ binds no hole today).
-- Arrow spines are walked by a loop (as ReadBack/Convert.purs).
module Features.Check.Strategy.ReadBack.Bound
  ( Under
  , boundRow
  , boundTy
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concat, find, foldr, length, nub, snoc)
import Data.Either (Either(..), note)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, isJust, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom (RTExpr, Var)
import Domain.Recorded.Hole (holeIndex, holeVar)
import Domain.Verdict.EffectPackage
  ( PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  )
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))

type Under =
  { bindings ∷ Map Int RTExpr
  , image ∷ RTExpr → Maybe PTy
  }

type Stage = { parameter ∷ PTy, row ∷ PRow }

boundTy ∷ Under → PTy → Either ReadFault PTy
boundTy under ty
  | Map.isEmpty under.bindings = Right ty
  | otherwise =
      case ty of
        PVar variable → maybe (Right ty) (imageOf under variable)
          (bindingOf under variable)
        PArrow _ _ _ → boundArrow under ty
        PRecord row → PRecord <$> boundRecord under row
        PData owner arguments rows → PData owner
          <$> traverse (boundTy under) arguments
          <*> traverse (boundRow under) rows
        PHandler label rows → PHandler <$> boundLabel under label
          <*> handlerRows rows.inference rows.clauses
        PBase _ → Right ty
      where
      handlerRows inference clauses = { inference: _, clauses: _ }
        <$> boundRow under inference
        <*> traverse (boundRow under) clauses

boundRow ∷ Under → PRow → Either ReadFault PRow
boundRow under row = { labels: _, tail: _ }
  <$> traverse (boundLabel under) row.labels
  <*> traverse tailOf row.tail
  where
  tailOf tail = case tail of
    PTailHole index
      | Map.member index under.bindings → Left (UnreadImage (holeVar index))
    _ → Right tail

boundLabel ∷ Under → PLabel → Either ReadFault PLabel
boundLabel under label = label { args = _ }
  <$> traverse (boundTy under) label.args

-- Fields bound in place; each bound tail's record spliced in, in tail
-- order, its labels distinct (Merge `record`).
boundRecord ∷ Under → PRecordRow → Either ReadFault PRecordRow
boundRecord under row = do
  fields ← traverse field row.fields
  parts ← traverse (boundTail under) row.tails
  let
    merged =
      { fields: fields <> concat (map _.fields parts)
      , tails: concat (map _.tails parts)
      }
  maybe (Right merged) (distinct merged) firstBound
  where
  field (Tuple label value) = Tuple label <$> boundTy under value
  firstBound = find (isJust <<< bindingOf under) row.tails

-- A merged record whose labels repeat is no value Merge substitutes.
distinct ∷ PRecordRow → Var → Either ReadFault PRecordRow
distinct merged tail =
  if length (nub labels) == length labels then Right merged
  else Left (UnreadImage tail)
  where
  labels = map fst merged.fields

boundTail ∷ Under → Var → Either ReadFault PRecordRow
boundTail under variable =
  maybe (Right unbound) recordOf (bindingOf under variable)
  where
  unbound = { fields: [], tails: [ variable ] }
  recordOf value = imageOf under variable value >>= asRecord
  asRecord = case _ of
    PRecord row → Right row
    _ → Left (UnreadImage variable)

boundArrow ∷ Under → PTy → Either ReadFault PTy
boundArrow under ty = foldr arrow <$> boundTy under found.result
  <*> traverse stage found.stages
  where
  found = stagesOf ty
  stage each = { parameter: _, row: _ } <$> boundTy under each.parameter
    <*> boundRow under each.row
  arrow each rest = PArrow each.parameter each.row rest

-- The arrows along a spine and its final result, by a loop.
stagesOf ∷ PTy → { stages ∷ Array Stage, result ∷ PTy }
stagesOf ty = tailRec step { stages: [], at: ty }
  where
  step found = case found.at of
    PArrow parameter row result → Loop
      { stages: snoc found.stages { parameter, row }, at: result }
    other → Done { stages: found.stages, result: other }

bindingOf ∷ Under → Var → Maybe RTExpr
bindingOf under variable =
  holeIndex variable >>= flip Map.lookup under.bindings

imageOf ∷ Under → Var → RTExpr → Either ReadFault PTy
imageOf under variable value =
  note (UnreadImage variable) (under.image value)
