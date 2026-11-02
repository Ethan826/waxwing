-- A live checked type or row, read as the effect package's (A2 spec
-- §2.2; tranche 2 read-back design §C.8): every row kept, each label's
-- mark a `Term` by the injected `Mark → Maybe Term` (least terms, Task
-- 9's `termOf`),
-- except that a `Fail` or Console label is N whatever its live mark
-- (design §E: the payload, effect and place in the row are kept). Holes
-- are already on the trace's numbering (Check/Trace.purs `finish`), so a
-- hole n is `PTailHole n` as a tail and `holeVar n` as a type; a rigid
-- tail is `PTailRigid`. Untrusted search.
--
-- Nothing is invented: a user label with no mark (`Unmarked`, Fail's
-- placeholder), or one whose mark the injected terms do not read
-- (`Nothing`), has no term to read, and is `UnmarkedLabel`; the caller
-- names the variable or image it was reading. Arrow spines are walked by
-- a loop.
module Features.Check.Strategy.ReadBack.Convert
  ( Unconverted(..)
  , convertRow
  , convertTy
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (foldr, snoc)
import Data.Either (Either(..), note)
import Data.Maybe (Maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Recorded.Atom (Base(..), Var(..))
import Domain.Recorded.Hole (holeVar)
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..))
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Record (RecordRow)
import Domain.Verdict.EffectPackage
  ( PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  )

-- A live form with no package reading: a user label without a mark.
data Unconverted = UnmarkedLabel EffectRef

derive instance eqUnconverted ∷ Eq Unconverted

type Stage = { parameter ∷ Ty Open, row ∷ TyRow Open }

convertTy ∷ (Mark → Maybe Term) → Ty Open → Either Unconverted PTy
convertTy terms ty = case ty of
  TInt → Right (PBase IntBase)
  TBool → Right (PBase BoolBase)
  TText → Right (PBase TextBase)
  TUnit → Right (PBase UnitBase)
  TVar variable → Right (PVar (named variable))
  TRecord row → PRecord <$> convertRecord terms row
  TData owner arguments rows → PData owner <$> traverse recur arguments
    <*> traverse (convertRow terms) rows
  THandler label rows → PHandler <$> convertLabel terms label
    <*> handlerRows rows.inference rows.clauses
  TFun _ _ _ → convertArrow terms ty
  where
  recur = convertTy terms
  handlerRows inference clauses = { inference: _, clauses: _ }
    <$> convertRow terms inference
    <*> traverse (convertRow terms) clauses

convertRow ∷ (Mark → Maybe Term) → TyRow Open → Either Unconverted PRow
convertRow terms (Row labels tail) = { labels: _, tail: map tailOf tail }
  <$> traverse (convertLabel terms) labels

convertLabel
  ∷ (Mark → Maybe Term) → Label (Ty Open) → Either Unconverted PLabel
convertLabel terms (Label effect arguments mark) =
  { effect, args: _, mark: _ } <$> traverse (convertTy terms) arguments
    <*> termOf
  where
  termOf = case effect, mark of
    FailEffect, _ → Right TermN
    ConsoleEffect, _ → Right TermN
    UserEffect _, Unmarked → Left (UnmarkedLabel effect)
    UserEffect _, _ → note (UnmarkedLabel effect) (terms mark)

convertRecord
  ∷ (Mark → Maybe Term)
  → RecordRow (Ty Open) Open
  → Either Unconverted PRecordRow
convertRecord terms row = { fields: _, tails: map named row.tails }
  <$> traverse field row.fields
  where
  field (Tuple label value) = Tuple label <$> convertTy terms value

convertArrow ∷ (Mark → Maybe Term) → Ty Open → Either Unconverted PTy
convertArrow terms ty = foldr arrow <$> convertTy terms found.result
  <*> traverse stage found.stages
  where
  found = stagesOf ty
  stage each = { parameter: _, row: _ } <$> convertTy terms each.parameter
    <*> convertRow terms each.row
  arrow each rest = PArrow each.parameter each.row rest

-- The arrows along a spine and its final result, by a loop.
stagesOf ∷ Ty Open → { stages ∷ Array Stage, result ∷ Ty Open }
stagesOf ty = tailRec step { stages: [], at: ty }
  where
  step found = case found.at of
    TFun parameter row result → Loop
      { stages: snoc found.stages { parameter, row }, at: result }
    other → Done { stages: found.stages, result: other }

tailOf ∷ Open → PTail
tailOf = case _ of
  Hole index → PTailHole index
  Rigid variable → PTailRigid variable

named ∷ Open → Var
named = case _ of
  Rigid variable → RigidVar variable
  Hole index → holeVar index
