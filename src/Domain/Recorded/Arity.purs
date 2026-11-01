-- The program's declared arities, recorded beside each declaration's
-- effect problem (dossier §18.148 (1); docs/plans/
-- 2026-11-01-a2-arity-metadata.md §1): each effect's type-argument
-- count, the built-ins `Fail` and `Console` included, and each declared
-- data type's type-argument count (record-row parameters among them, as
-- Resolve passes them) and effect-row-argument count. Plain data;
-- generation fills it (Generate.Lookup `declarationsOf`) and the A2
-- validator reads it (I3's check (k), record check 5).
module Domain.Recorded.Arity
  ( DataArity
  , Declarations
  , noDeclarations
  ) where

import Data.Map (Map)
import Data.Map as Map
import Domain.Row (EffectRef)
import Domain.Type (TypeId)

type DataArity = { types ∷ Int, rows ∷ Int }

type Declarations =
  { effects ∷ Map EffectRef Int
  , types ∷ Map TypeId DataArity
  }

-- `emptyEffects`' value; assembly replaces it with the program's.
noDeclarations ∷ Declarations
noDeclarations = { effects: Map.empty, types: Map.empty }
