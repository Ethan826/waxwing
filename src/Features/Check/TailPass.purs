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
import Features.Check.Entry (resolvedRow)
import Features.Check.Provenance (Consumed(Application), Origin)
import Features.Check.Restricted (ClauseEntry)
import Features.Check.Scheme (State)

-- The clause-tail pass (design §3.5, review T1). A clause row ending in a
-- rigid ϱ needs its handler's R and C to end in ϱ. It repeats while a
-- binding is made, since binding one handler's tail can make another
-- clause rigid; each binding turns a distinct unbound tail into ϱ for
-- good, so it ends. Then every clause row's C closes.
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
  Tuple changed passed ← foldM (rigid env) (Tuple false state)
    (Map.values state.restricted.clauses)
  pure (if changed then Loop passed else Done passed)

rigid
  ∷ ∀ r
  . CheckEnv r
  → Tuple Boolean State
  → ClauseEntry
  → Either Diagnostic (Tuple Boolean State)
rigid env (Tuple changed state) entry = case tail of
  Just (Rigid variable) → do
    Tuple first inference ← ensure env origin variable entry.inference state
    Tuple second clauses ← ensure env origin variable entry.clauses inference
    pure (Tuple (changed || first || second) clauses)
  _ → Right (Tuple changed state)
  where
  Row _ tail = resolvedRow state.subst entry.row
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
ensure env origin variable target state = case tail of
  Just (Hole meta) → bind (Row [] (Just (Hole meta)))
  Just (Rigid same) | same == variable → Right (Tuple false state)
  _ → whole
  where
  Row _ tail = resolvedRow state.subst target
  stage = Row [] (Just (Rigid variable))
  bind row = Tuple true <$> consumeIgnoring env state { origin, stage, target: row }
  whole = Tuple false <$> consumeIgnoring env state
    { origin, stage, target: resolvedRow state.subst target }

closing
  ∷ ∀ r. CheckEnv r → State → ClauseEntry → Either Diagnostic State
closing env state entry = case tail of
  Just (Hole meta) → closeTail env state origin (Row [] (Just (Hole meta)))
  _ → Right state
  where
  Row _ tail = resolvedRow state.subst entry.clauses
  origin = { span: entry.clause, consumed: Application, via: Nothing }
