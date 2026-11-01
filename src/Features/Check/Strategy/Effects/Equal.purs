-- trusted surface: every diff needs token review; see docs/engineering.md
-- E1, `Equal lhs rhs` (statements §4; spec §9): both sides read through
-- the settled completed package (`under`), then compared structurally
-- (Robinson-style term equality), rows by R-A and handler types by
-- Definition 4.1 (Effects.Handler), marks on normal forms. The check
-- index j is spec §9's pre-order over the left side: at a node its
-- constructor and head, then its marks, then its children left to right
-- (an arrow's parameter, row, result; a record's fields by label; data's
-- arguments, then rows). A record's head is its sorted field labels and
-- its sorted tails (O6's multiset of rigid tails; proposed, statements
-- §4).
module Features.Check.Strategy.Effects.Equal
  ( equalCheck
  , samePTy
  ) where

import Prelude
import Data.Array (length, sort, sortWith, zipWith)
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded.Effect (MTy)
import Domain.Verdict.EffectPackage (PRecordRow, PTy(..))
import Features.Check.Strategy.Effects.Handler
  ( Checks
  , Compare
  , check
  , handlerEqual
  , rowEqual
  , sequenced
  , withMarks
  )
import Features.Check.Strategy.Effects.Judged (Context, Judged)
import Features.Check.Strategy.Effects.Package (under)

-- The context's package must be the settled completed package, which
-- binds every key a record names (spec §2.3); a side that cannot be read
-- is refused at the first check, never accepted unread.
equalCheck ∷ Context → MTy → MTy → Judged
equalCheck context lhs rhs = maybe unread judged
  (Tuple <$> under context.package lhs <*> under context.package rhs)
  where
  unread = Left { check: 0, limit: false }
  judged (Tuple left right) = samePTy context left right

samePTy ∷ Context → PTy → PTy → Judged
samePTy context left right = void (sameAt context left right 0)

sameAt ∷ Context → Compare
sameAt context left right = case left, right of
  PBase leftBase, PBase rightBase → check (leftBase == rightBase)
  PVar leftVar, PVar rightVar → check (leftVar == rightVar)
  PArrow parameter row result, PArrow parameter' row' result' →
    check true
      >=> same parameter parameter'
      >=> rowEqual same withMarks row row'
      >=> same result result'
  PRecord leftRow, PRecord rightRow → recordEqual same leftRow rightRow
  PData owner arguments rows, PData owner' arguments' rows' →
    check (owner == owner' && sameShape arguments arguments' rows rows')
      >=> sequenced (zipWith same arguments arguments')
      >=> sequenced (zipWith (rowEqual same withMarks) rows rows')
  PHandler _ _, PHandler _ _ → handlerEqual context same { left, right }
  _, _ → check false
  where
  same = sameAt context

recordEqual ∷ Compare → PRecordRow → PRecordRow → Checks
recordEqual same left right =
  check (map fst lefts == map fst rights && sameTails)
    >=> sequenced (zipWith same (map snd lefts) (map snd rights))
  where
  lefts = sortWith fst left.fields
  rights = sortWith fst right.fields
  sameTails = sort left.tails == sort right.tails

sameShape ∷ ∀ a b. Array a → Array a → Array b → Array b → Boolean
sameShape arguments arguments' rows rows' =
  length arguments == length arguments' && length rows == length rows'
