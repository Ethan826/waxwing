module Features.Check.TailPass (tailPass) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Row (Row(..))
import Domain.Syntax (Diagnostic)
import Domain.Type (TyRow, VarId)
import Features.Check.Consume (closeTail, consumeIgnoring)
import Features.Check.Context (CheckEnv)
import Features.Check.Walked (End(..), endOf, walkedRow)
import Features.Check.Provenance (Consumed(Application), Origin)
import Features.Check.Restricted (ClauseEntry, Installation)
import Features.Check.Scheme (State)

-- The clause-tail pass (design §3.5, review T1). A clause row ending in a
-- rigid ϱ needs its handler's R and C to end in ϱ. It repeats while a
-- binding is made, since binding one handler's tail can make another
-- clause rigid; each binding turns a distinct unbound tail into ϱ for
-- good, so it ends. An installation whose C ends in a rigid ϱ needs the
-- row it is installed in to end in ϱ too. Then every clause row's C closes
-- (an installed literal's C is ended by then). Each round rescans every
-- clause, so a chain of n handlers installed in each other's clauses
-- with rigid tails costs O(n^2); a worklist of the clauses ending in the meta
-- just bound would make it linear (not needed for T003).
tailPass ∷ ∀ r. CheckEnv r → State → Either Diagnostic State
tailPass env state = do
  passed ← tailRecM (round env) state
  foldM (closing env) passed (Map.values passed.restricted.clauses)

round
  ∷ ∀ r
  . CheckEnv r
  → State
  → Either Diagnostic (Step State State)
round env state = do
  Tuple clausesChanged clausesPassed ← foldM (rigid env)
    (Tuple false state)
    (Map.values state.restricted.clauses)
  Tuple changed passed ← foldM (installed env)
    (Tuple clausesChanged clausesPassed)
    (Map.values state.restricted.installations)
  pure (if changed then Loop passed else Done passed)

-- An installed C ending in ϱ needs the row it is installed in to end in ϱ
-- (design §3.5), reported at the `with`.
installed
  ∷ ∀ r
  . CheckEnv r
  → Tuple Boolean State
  → Installation
  → Either Diagnostic (Tuple Boolean State)
installed env (Tuple changed state) found =
  case endOf state.subst found.clauses of
    Fixed variable → merged <$> ensure env origin variable found.current state
    _ → Right (Tuple changed state)
  where
  origin = { span: found.span, consumed: Application, via: Nothing }
  merged (Tuple bound passed) = Tuple (changed || bound) passed

rigid
  ∷ ∀ r
  . CheckEnv r
  → Tuple Boolean State
  → ClauseEntry
  → Either Diagnostic (Tuple Boolean State)
rigid env (Tuple changed state) entry = case endOf state.subst entry.row of
  Fixed variable → both env changed state entry variable
  _ → Right (Tuple changed state)

-- R and C of the clause's handler both end in ϱ.
both
  ∷ ∀ r
  . CheckEnv r
  → Boolean
  → State
  → ClauseEntry
  → VarId
  → Either Diagnostic (Tuple Boolean State)
both env changed state entry variable = do
  Tuple first inference ← ensure env origin variable entry.inference state
  Tuple second clauses ← ensure env origin variable entry.clauses inference
  pure (Tuple (changed || first || second) clauses)
  where
  origin = { span: entry.clause, consumed: Application, via: Nothing }

-- `target` must end in ϱ. An unbound tail is bound to ϱ alone (review A2:
-- consuming into the whole row would refuse its labels); the same ϱ needs
-- nothing; a closed tail or another variable is consumed whole, which
-- gives the missing-capability error.
ensure
  ∷ ∀ r
  . CheckEnv r
  → Origin
  → VarId
  → TyRow Open
  → State
  → Either Diagnostic (Tuple Boolean State)
ensure env origin variable target state = case endOf state.subst target of
  Loose meta → bind (Row [] (Just (Hole meta)))
  Fixed same | same == variable → Right (Tuple false state)
  _ → whole
  where
  stage = Row [] (Just (Rigid variable))
  bind row = Tuple true <$> consumeIgnoring env state
    { origin, stage, target: row }
  whole = Tuple false <$> consumeIgnoring env state
    { origin, stage, target: walkedRow state.subst target }

closing
  ∷ ∀ r. CheckEnv r → State → ClauseEntry → Either Diagnostic State
closing env state entry = case endOf state.subst entry.clauses of
  Loose meta → closeTail env state origin (Row [] (Just (Hole meta)))
  _ → Right state
  where
  origin = { span: entry.clause, consumed: Application, via: Nothing }
