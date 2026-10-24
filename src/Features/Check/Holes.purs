-- trusted surface: every diff needs token review; see docs/engineering.md
-- A finished body's holes (R0 Task 7.1, moved from Features.Check.Scheme
-- unchanged, a behaviour-preserving refactor): `holes` renumbers the
-- metas still unsolved, and `foldHoles` visits a type's metas in the
-- order `holes` numbers them. Here, apart from the checker's `State`, so
-- that D1's `build` can renumber its body as `checkFunction` does without
-- reaching checker state (D1 spec §9; T10).
module Features.Check.Holes
  ( holes
  , foldHoles
  ) where

import Prelude
import Prim hiding (Row)
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (maybe)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Row (Row(..), isPure)
import Domain.Type (Ty(..), rename)
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Features.Check.Walk (foldTypes, retype)

-- Renumbers a finished body's unsolved metas as holes 0, 1, …, in the
-- order `foldTypes` first meets them. A body with no hole is kept rather
-- than rebuilt unchanged (T003).
holes ∷ Checked.Expr → Checked.Expr
holes body =
  if Map.isEmpty numbering then body else retype renamed body
  where
  numbering = (foldTypes number { next: 0, seen: Map.empty } body).seen
  number found _ ty = foldHoles numberHole found ty
  renamed ty = rename renumber ty
  renumber = case _ of
    Hole meta → Hole (maybe meta identity (Map.lookup meta numbering))
    rigid → rigid

type Numbering = { next ∷ Int, seen ∷ Map Int Int }

numberHole ∷ Numbering → Int → Numbering
numberHole found meta =
  if Map.member meta found.seen then found
  else { next: found.next + 1, seen: Map.insert meta found.next found.seen }

-- A type's holes: its parts', then a record's tail, then its rows' (each
-- row's tail, then its label arguments). Type, record and row metas share
-- one numbering, so no two of them ever meet under one number.
foldHoles ∷ ∀ b. (b → Int → b) → b → Ty Open → b
foldHoles step found = case _ of
  TVar (Hole meta) → step found meta
  ty → foldl foldRow
    (recordTail (foldl (foldHoles step) found (children ty)) ty)
    (rowsOf ty)
  where
  recordTail reached = case _ of
    TRecord row → foldl tailHole reached row.tails
    _ → reached
  foldRow reached row@(Row _ tail)
    | isPure row = reached
    | otherwise = foldl (foldHoles step)
        (maybe reached (tailHole reached) tail)
        (rowArguments row)
  tailHole reached = case _ of
    Hole meta → step reached meta
    Checked.Rigid _ → reached
