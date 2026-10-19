module Features.Check.RowSettle (settle) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, maybe')
import Features.Check.RecordTail (bindTail, shareTails)
import Features.Check.Refused (Failed)
import Features.Check.RowResidue (Residue, Side, constants)
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.UnifyFailure (Failure(..))

-- The one-tail rules on a residue with metas (ADR 013 rules 1-3; R005
-- Tranche B plan §1.2): a side that is one meta alone is bound to the
-- other side (of two bare metas the newer, the larger, to the older, as
-- unification binds type metas); one meta on each side, both with
-- constants, share one fresh remainder. A residue with two or more metas
-- on a side reaches placeholder P1, never a guess: B3 makes such rows
-- one unknown tail and `Merge` predicates, and P1 becomes the guard of
-- that invariant. (Task 4's sum rule, bounds and commits went in B2.)
settle ∷ Failed → Subst → Residue → Either Failure Subst
settle failed subst found
  | lone found.mine && lone found.theirs = bareMetas failed subst found
  | lone found.mine = alone failed subst found.mine found.theirs
  | lone found.theirs = alone failed subst found.theirs found.mine
  | single found.mine && single found.theirs = shared failed subst found
  | otherwise = Left (Placeholder twoUnknown)

bareMetas ∷ Failed → Subst → Residue → Either Failure Subst
bareMetas failed subst found = maybe' (const (Right subst)) bound
  (metaPair found)
  where
  bound pair = bindTail failed subst (max pair.mine pair.theirs) []
    [ Meta (min pair.mine pair.theirs) ]

-- The lone meta of `own` takes the other side whole.
alone ∷ Failed → Subst → Side → Side → Either Failure Subst
alone failed subst own other = maybe' (const (Right subst)) bound
  (Array.head own.metas)
  where
  bound meta = bindTail failed subst meta other.fields
    (other.rigids <> map Meta other.metas)

shared ∷ Failed → Subst → Residue → Either Failure Subst
shared failed subst found = maybe' (const (Right subst)) bound
  (metaPair found)
  where
  bound pair = shareTails failed subst
    { meta: pair.mine
    , fields: found.theirs.fields
    , rigids: found.theirs.rigids
    }
    { meta: pair.theirs, fields: found.mine.fields, rigids: found.mine.rigids }

-- The first meta of each side.
metaPair ∷ Residue → Maybe { mine ∷ Int, theirs ∷ Int }
metaPair found = paired <$> Array.head found.mine.metas
  <*> Array.head found.theirs.metas
  where
  paired mine theirs = { mine, theirs }

-- One meta and nothing else.
lone ∷ Side → Boolean
lone side = single side && Array.null (constants side)

single ∷ Side → Boolean
single side = Array.length side.metas == 1

twoUnknown ∷ String
twoUnknown = "rows with two unknown tails on one side are solved in Task B3"
