module Features.Check.RowSettle (settle) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..))
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, maybe')
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow)
import Features.Check.RecordTail (bindTail, shareTails)
import Features.Check.Refused (Failed)
import Features.Check.RowPlacing (placing)
import Features.Check.RowResidue (Exam, Residue, Side, constants)
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.UnifyFailure (Failure)

type Row = RecordRow (Ty Flex) Flex

-- Steps 6-8 of R005 Tranche B design §2.1, once the sum rule changes
-- nothing (rules §6, §8). A side that is one meta alone is bound to the
-- other side (of two bare metas the newer, the larger, to the older, as
-- unification binds type metas). One meta on each side, both with
-- constants: one fresh remainder shared. Otherwise each constant's homes:
-- one with none is placed anyway, so the fact excluding it reports
-- itself; one with a single home is committed and the equation examined
-- again; constants each with several homes, or none left with metas on
-- both sides, wait: Task 5 solves equations that wait, and until then
-- they reach this placeholder, never a guess.
settle
  ∷ Failed → Row → Row → Exam → Residue → Either Failure (Step Exam Subst)
settle failed left right exam found
  | lone found.mine && lone found.theirs = Done <$> bareMetas failed exam.subst
      found
  | lone found.mine = Done <$> alone failed exam.subst found.mine found.theirs
  | lone found.theirs = Done <$> alone failed exam.subst found.theirs
      found.mine
  | single found.mine && single found.theirs = Done <$> shared failed exam.subst
      found
  | otherwise = placing failed left right exam found

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
