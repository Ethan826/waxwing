module Features.Check.RowMerge.Reach (metasThrough) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Set (Set)
import Data.Set as Set
import Domain.Type (Ty(..))
import Features.Check.Subst (Flex(..), Subst(..))

-- Every meta the tails lead to through their bindings, the bound ones
-- with the unbound one they end in, by a loop (a chain of bound tails
-- costs no stack): the metas a binding of a predicate's case may have
-- reached (R10.1) and whose arrival sites locate a failure (L2).
metasThrough ∷ Subst → Array Flex → Set Int
metasThrough (Subst bindings) tails = tailRec step
  { pending: tails, seen: Set.empty }
  where
  step found = maybe (Done found.seen) (next found.seen)
    (Array.uncons found.pending)
  next seen { head, tail } = Loop (visit head tail seen)
  visit flex rest seen = case flex of
    Meta meta
      | Set.member meta seen → { pending: rest, seen }
      | otherwise →
          { pending: rest <> leads meta, seen: Set.insert meta seen }
    Rigid _ → { pending: rest, seen }
  leads meta = maybe [] tailsOf (Map.lookup meta bindings.types)
  tailsOf = case _ of
    TRecord row → row.tails
    TVar flex → [ flex ]
    _ → []
