module Features.Check.RowPlacing (equationOf, placing) where

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
import Features.Check.Refused (Failed)
import Features.Check.RowResidue (Constant, Exam, Residue, atomOf, constants)
import Features.Check.RowStore (Equation(..), equationId, siteOf)
import Features.Check.Subst (Flex, Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..))

type Row = RecordRow (Ty Flex) Flex

-- A constant and the metas of the other side that may hold it.
type Placing = { constant ∷ Constant, homes ∷ Array Int, metas ∷ Array Int }

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
