-- W §1.5's hole contract, by its syntactic sufficient check (Task 4.4):
-- a hole the witness leaves may stay, to be defaulted as lowering
-- defaults it (`Int` for a type, `{}` for a row; ReadBack.Type
-- `settled`), only if, with the bindings applied, every `B` atom that
-- mentions it is an equation with syntactically equal canonical sides
-- and every `BQ` atom that mentions it holds by the ground rule at the
-- defaults. A `lacks` or `disjoint` atom that mentions a hole fails the
-- check, as W words it: the check is sufficient, not complete, and may
-- refuse a default that would do.
--
-- The holes judged are a `Free` binding's and those inside an `Inline`
-- one, which W §1.3 and Adapt-N default alike. The variable named is the
-- first flexible one, in `Ord Var` order, whose binding mentions a
-- broken hole; a hole no binding mentions is never broken, since atoms
-- reach holes only through bindings. A remaining variable reads as
-- `Unjudged` under `BQ`, so a requirement holds only when the ground
-- rule settles it without one (no stricter than G0 at the settled σ:
-- argued, no fixture with a rigid holder; docs/findings.md reading 4).
module Features.Check.Strategy.HoleContract (holeContract) where

import Prelude
import Data.Array (any, concatMap, find, mapMaybe)
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom
  ( Atom(..)
  , Holders
  , Quant(..)
  , RTExpr(..)
  , ReqAtom
  , Var
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin (Entry)
import Domain.Verdict (NoWitnessReason(..))
import Domain.Verdict.Witness (Binding(..), Witness)
import Features.Check.GroundRule (Judgement(..), atomType, judge)
import Features.Check.Strategy.Candidate (under)
import Features.Check.Strategy.ReadBack.Type (holeVar, holesIn, settled)

holeContract ∷ RecordedProblem → Witness → Either NoWitnessReason Unit
holeContract problem witness =
  maybe (Right unit) (Left <<< HoleContract <<< fst)
    (find breaks (Map.toUnfoldable images))
  where
  view = fields problem
  images = imagesOf view.vars witness
  broken = Set.fromFoldable
    (concatMap (equational images) view.b <> concatMap atDefault view.bq)
  breaks (Tuple _ bound) = any (flip Set.member broken) (holesIn bound)
  atDefault = requirement view.holders images

-- Each flexible variable's binding as the type it stands for: a `Free`
-- one is its hole, in its sort's position.
imagesOf ∷ Map Var VarInfo → Witness → Map Var RTExpr
imagesOf vars witness =
  Map.fromFoldable (mapMaybe imaged (Map.toUnfoldable vars))
  where
  imaged (Tuple variable info) = case info.quant of
    Forall _ → Nothing
    Exists → Tuple variable <<< image info.sort
      <$> Map.lookup variable witness.bindings

image ∷ VarSort → Binding → RTExpr
image sort = case _ of
  Inline value → value
  Free hole → case sort of
    SortType → TVar (holeVar hole)
    SortRow → Record [] [ holeVar hole ]

-- The holes a `B` atom breaks: none unless it mentions one and is not an
-- equation with equal sides.
equational ∷ Map Var RTExpr → Entry Atom → Array Int
equational images entry = case entry.value of
  Equal one other
    | under images one == under images other → []
    | otherwise → holesIn (under images one) <> holesIn (under images other)
  Lacks row _ → rowHoles row
  Disjoint one other → rowHoles one <> rowHoles other
  Ff → []
  where
  rowHoles row = holesIn (under images (Record [] [ row ]))

-- The holes a `BQ` atom breaks: those it mentions, unless it holds with
-- every hole at its default.
requirement
  ∷ Holders
  → Map Var RTExpr
  → Entry ReqAtom
  → Array Int
requirement holders images entry = case atDefaults of
  Holds → []
  Unjudged → holesIn applied
  Open → holesIn applied
  Fails → holesIn applied
  where
  applied = under images (atomType entry.value)
  atDefaults = judge holders unjudged (settled applied)

unjudged ∷ Var → Judgement
unjudged _ = Unjudged
