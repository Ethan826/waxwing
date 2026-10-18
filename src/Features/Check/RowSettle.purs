module Features.Check.RowSettle (settle, equationOf) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..))
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow)
import Features.Check.Commit (commit, commitAnyway)
import Features.Check.Homes (homesOf)
import Features.Check.RecordTail (bindTail, shareTails)
import Features.Check.Refused (Failed)
import Features.Check.RowResidue
  ( Constant
  , Exam
  , Residue
  , Side
  , atomOf
  , constants
  )
import Features.Check.RowStore (Equation(..), equationId, siteOf)
import Features.Check.Subst (Flex(..), Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..))

type Row = RecordRow (Ty Flex) Flex

-- A constant and the metas of the other side that may hold it.
type Placing = { constant ∷ Constant, homes ∷ Array Int, metas ∷ Array Int }

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

-- The equation's identity, taken when it first derives a fact.
equationOf ∷ Row → Row → Exam → { equation ∷ Equation, subst ∷ Subst }
equationOf left right exam = maybe' taken kept exam.equation
  where
  kept equation = { equation, subst: exam.subst }
  taken _ =
    { equation: Equation
        { id: next.id, site: siteOf (storeOf exam.subst), left, right }
    , subst: onStore (const next.store) exam.subst
    }
  next = equationId (storeOf exam.subst)

placing
  ∷ Failed → Row → Row → Exam → Residue → Either Failure (Step Exam Subst)
placing failed left right exam found =
  maybe' committing stranded (Array.find homeless plan)
  where
  plan = map (placed found.theirs.metas) (constants found.mine)
    <> map (placed found.mine.metas) (constants found.theirs)
  placed metas constant =
    { constant, homes: homesOf exam.subst metas (atomOf constant), metas }
  homeless entry = Array.null entry.homes
  stranded entry = Done <$> commitAnyway failed exam.subst entry.metas
    entry.constant
  committing _ = maybe' waiting
    (forced failed exam (equationOf left right exam))
    (Array.find onlyHome plan)
  onlyHome entry = Array.length entry.homes == 1
  waiting _ = Left (Placeholder waits)

-- A constant with one home, committed there; the equation is examined
-- again.
forced
  ∷ Failed
  → Exam
  → { equation ∷ Equation, subst ∷ Subst }
  → Placing
  → Either Failure (Step Exam Subst)
forced failed exam taken entry = maybe' waiting committed
  (Array.head entry.homes)
  where
  waiting _ = Left (Placeholder waits)
  committed meta = again
    <$> commit failed taken.equation taken.subst meta entry.constant
  again subst = Loop exam { subst = subst, equation = Just taken.equation }

waits ∷ String
waits = "equations that wait are solved in Task 5"

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
