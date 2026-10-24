-- D1's read-only view of an `Elaborating` (docs/plans/
-- r0-generation-continuation.md §3.4-§3.5, §5; R0 Task 7.1): the
-- problem, the variables `build` may read, where it reads them, and the
-- seal check. The type is re-exported without its constructor (§3.1's
-- allowed form); `build` is in Domain.Elaborating.Build (rule E1).
module Domain.Elaborating
  ( module Exports
  , positionsOf
  , problem
  , requests
  , untracked
  ) where

import Prelude
import Data.Array (concatMap, filter, mapMaybe)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Elaborating.Internal (Elaborating) as Exports
import Domain.Elaborating.Internal (Elaborating(..))
import Domain.Elaborating.Types (SealFault(..), Use, UseSort(..))
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom
  ( CheckedName(..)
  , Quant(..)
  , RTExpr
  , Var(..)
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Vars (variablesIn)

problem ∷ ∀ a. Elaborating a → RecordedProblem
problem (Elaborating elaborating) = elaborating.problem

-- `map _.var uses`: computed from the value alone, no witness (St).
requests ∷ ∀ a. Elaborating a → Set Var
requests (Elaborating elaborating) = Set.map _.var elaborating.uses

-- N4: where `build` reads each variable.
positionsOf ∷ ∀ a. Elaborating a → Map Var (Set CheckedName)
positionsOf (Elaborating elaborating) =
  Map.fromFoldableWith Set.union (map placed uses)
  where
  uses = Set.toUnfoldable elaborating.uses ∷ Array Use
  placed use = Tuple use.var (Set.singleton use.site)

-- Sc (§4): empty iff every use reads a flexible variable of the problem
-- at its own sort and at neither an `Auxiliary` nor a `RigidName` site,
-- the site log holds no `Auxiliary` and no handle at a `RigidName`
-- site, and each variable was minted and each site written at most once.
untracked ∷ ∀ a. Elaborating a → Array SealFault
untracked (Elaborating elaborating) =
  concatMap (useFaults vars) uses
    <> concatMap logFaults (Map.toUnfoldable elaborating.sites)
    <> map (DuplicateFresh <<< fst) (repeated elaborating.fresh)
    <> map (DuplicateSite <<< fst) (repeated elaborating.siteCounts)
  where
  vars = (fields elaborating.problem).vars
  uses = Set.toUnfoldable elaborating.uses ∷ Array Use

useFaults ∷ Map Var VarInfo → Use → Array SealFault
useFaults vars use = variableFaults <> siteFaults use
  where
  variableFaults = maybe [ UntrackedRead use.var ] judged
    (Map.lookup use.var vars)
  judged info = case info.quant of
    Forall _ → [ UntrackedRead use.var ]
    Exists
      | sameSort use.sort info.sort → []
      | otherwise → [ SortClash use.var ]

siteFaults ∷ Use → Array SealFault
siteFaults use = case use.site of
  Auxiliary → [ AuxiliarySite ]
  RigidName _ → [ RigidSiteRead use.var ]
  Slot _ _ → []
  NodeType _ → []
  ParamType _ _ → []
  LambdaBody _ → []
  PatternType _ → []
  RestType _ → []
  ClauseParamType _ _ _ → []

-- The site log: an `Auxiliary` entry, and every handle (a fresh
-- variable) in a `RigidName` site's type.
logFaults ∷ Tuple CheckedName RTExpr → Array SealFault
logFaults (Tuple site ty) = case site of
  Auxiliary → [ AuxiliarySite ]
  RigidName _ → map RigidSiteRead (filter isFresh (variablesIn ty))
  Slot _ _ → []
  NodeType _ → []
  ParamType _ _ → []
  LambdaBody _ → []
  PatternType _ → []
  RestType _ → []
  ClauseParamType _ _ _ → []
  where
  isFresh = case _ of
    FreshVar _ _ → true
    RigidVar _ → false

-- No variable has `EffectRowSort` (§12.1's fallback).
sameSort ∷ UseSort → VarSort → Boolean
sameSort use var = case use, var of
  TypeSort, SortType → true
  RecordSort, SortRow → true
  _, _ → false

repeated ∷ ∀ k. Map k Int → Array (Tuple k Int)
repeated counts = mapMaybe twice (Map.toUnfoldable counts)
  where
  twice (Tuple key count) =
    if count > 1 then Just (Tuple key count) else Nothing
