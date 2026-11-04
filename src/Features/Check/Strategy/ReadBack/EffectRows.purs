-- Every recorded effect-row variable of a declaration read back as a
-- package row (tranche 2 read-back design §C.1-§C.2, §D, §E; dossier
-- §18.155 (3), (8)): from the trace for the traced roles
-- (ReadBack/EffectSites.purs) and from the checked declaration and the
-- trace's clause, deferral and installation entries for the located ones
-- (ReadBack/EffectPlaces.purs), each live row converted under the
-- injected `Mark → Maybe Term` (ReadBack/Convert.purs; Task 9's least
-- terms). Forced tails (Effects/Forced.purs) are not package-owned and
-- are not read. Untrusted search: it builds plain rows only.
--
-- Fail-closed, never choosing: a variable no source reads is `Unread v`;
-- one whose value holds a user label with no term is `RowUnconverted v e`
-- (R036 (3)); two sources that read v differently are `Apart v`; two
-- trace entries under one key are `Clash`, wherever met.
module Features.Check.Strategy.ReadBack.EffectRows (readRows) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, fromMaybe, maybe)
import Data.Set as Set
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (EVar)
import Domain.Row (Mark)
import Domain.Type (TyRow)
import Domain.Verdict.EffectPackage (PRow, Term)
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.ReadBack.Convert
  ( Unconverted(..)
  , convertRow
  )
import Features.Check.Strategy.ReadBack.EffectPlaces (locatedFacts)
import Features.Check.Strategy.ReadBack.EffectSites (tracedRow)
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))
import Features.Check.Trace (Traced)

readRows
  ∷ (Mark → Maybe Term)
  → RecordedProblem
  → Checked.FunctionDecl
  → Traced
  → Either ReadFault (Map EVar PRow)
readRows terms problem checked traced = do
  located ← locatedFacts effects checked traced
  read ← traverse traceFact wanted
  let facts = Array.catMaybes read <> located
  let found = Map.fromFoldableWith (flip (<>)) (map single facts)
  Map.fromFoldable <$> traverse (readOne terms found) wanted
  where
  effects = (fields problem).effects
  forced = Set.fromFoldable (map _.forced (forcedTails problem))
  wanted = Array.nub (Array.filter owned effects.flexEff)
  owned = not <<< flip Set.member forced
  traceFact variable = map (map (Tuple variable))
    (tracedRow traced checked.body variable)
  single (Tuple variable row) = Tuple variable [ row ]

-- One variable's value: read by at least one source, every reading
-- converted, all the same.
readOne
  ∷ (Mark → Maybe Term)
  → Map EVar (Array (TyRow Open))
  → EVar
  → Either ReadFault (Tuple EVar PRow)
readOne terms found variable =
  either unconverted chosen (traverse (convertRow terms) values)
  where
  unconverted (UnmarkedLabel effect) = Left (RowUnconverted variable effect)
  chosen converted = maybe (Left (Unread variable)) (agreed converted)
    (Array.head converted)
  values = fromMaybe [] (Map.lookup variable found)
  agreed converted first
    | Array.all (eq first) converted = Right (Tuple variable first)
    | otherwise = Left (Apart variable)
