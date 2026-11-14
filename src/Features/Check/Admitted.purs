-- trusted surface: every diff needs token review; see docs/engineering.md
-- Scope A's boundary (docs/plans/2026-11-13-scope-a-free-constructor-
-- design.md §4 D6 as amended; dossier §18.198): the declared types an
-- applied type may have as its head, or as a head or nullary type inside
-- an argument, without the `DataApplication` marker. A type is admitted
-- when it has no effect-row or record-row parameter, is not in the holder
-- set, and every declaration reachable from it through constructor
-- fields is expressible in the Lean model's `FT`: none has a record-row
-- parameter (the only way a field holds a record tail) or a field with
-- effect-row arguments. Reachability follows every declared type a field
-- mentions (Features.Check.Nested's `referenced`: type arguments, record
-- fields, arrows, handler arguments), nullary types included. Settled
-- once per program.
module Features.Check.Admitted
  ( Admitted
  , admitted
  , recordRowed
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Resolved (CtorInfo, TypeInfo, VarId)
import Domain.Syntax (Sort(..))
import Domain.Type (Ty(..), TypeId(..))
import Features.Check.Nested (referenced)

type Admitted = Set TypeId

-- `holding` is the program's holder set (Features.Check.Functional).
admitted ∷ Array TypeInfo → Array CtorInfo → Set TypeId → Admitted
admitted types ctors holding =
  Set.fromFoldable (Array.filter allowed (Array.mapWithIndex at types))
  where
  at position _ = TypeId position
  unexpressible = reaching ctors (Array.filter (local types owned') ids)
  owned' = fieldsByOwner ctors
  ids = Array.mapWithIndex at types
  allowed id = maybe false (owned id) (Array.index types (index id))
  owned id info = Array.null info.rowParameters
    && not (Array.elem RecordSort info.sorts)
    && not (Set.member id holding)
    && not (Set.member id unexpressible)
  index (TypeId i) = i

-- The declared types with a record-row parameter (`DataOverRecords`).
recordRowed ∷ Array TypeInfo → Set TypeId
recordRowed types = Set.fromFoldable
  (Array.catMaybes (Array.mapWithIndex withRecord types))
  where
  withRecord index info =
    if Array.elem RecordSort info.sorts then Just (TypeId index)
    else Nothing

-- A declaration `FT` cannot express on its own: a record-row parameter,
-- or a constructor field with effect-row arguments somewhere inside.
local
  ∷ Array TypeInfo → Map TypeId (Array (Ty VarId)) → TypeId → Boolean
local types fields id@(TypeId index) =
  maybe false (Array.elem RecordSort <<< _.sorts) (Array.index types index)
    || Array.any rowArguments (maybe [] identity (Map.lookup id fields))

-- Each declared type's constructor fields, gathered once.
fieldsByOwner ∷ Array CtorInfo → Map TypeId (Array (Ty VarId))
fieldsByOwner = foldl add Map.empty
  where
  add found ctor = Map.insertWith (<>) ctor.owner ctor.fields found

rowArguments ∷ ∀ v. Ty v → Boolean
rowArguments = case _ of
  TData _ arguments rows → not (Array.null rows)
    || Array.any rowArguments arguments
  TFun parameter _ result → rowArguments parameter || rowArguments result
  TRecord row → Array.any (rowArguments <<< snd') row.fields
  _ → false
  where
  snd' (Tuple _ ty) = ty

-- Every declared type from which one of `seeds` is reachable through
-- constructor fields: the least fixed point over the reverse reference
-- graph, one loop step per round (as Functional's `spread`).
reaching ∷ Array CtorInfo → Array TypeId → Set TypeId
reaching ctors seeds = tailRec round { found: Set.empty, frontier: seeds }
  where
  users = usersOf ctors
  round state =
    if Array.null fresh then Done state.found
    else Loop
      { found: foldl (flip Set.insert) state.found fresh
      , frontier: Array.concatMap using fresh
      }
    where
    fresh = Array.filter (not <<< flip Set.member state.found)
      (Array.nub state.frontier)
  using id = maybe [] identity (Map.lookup id users)

usersOf ∷ Array CtorInfo → Map TypeId (Array TypeId)
usersOf ctors = foldl add Map.empty (Array.concatMap edges ctors)
  where
  edges ctor = map (edge ctor) (Array.concatMap referenced ctor.fields)
  edge ctor used = Tuple (TypeId used) ctor.owner
  add found (Tuple used owner) =
    Map.insertWith (<>) used [ owner ] found
