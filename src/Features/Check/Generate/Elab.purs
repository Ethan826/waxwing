-- trusted surface: every diff needs token review; see docs/engineering.md
-- D1's request constructors and `seal` (docs/plans/
-- r0-generation-continuation.md §3.2, §3.4; R0 Task 7.1a). `readType`
-- and `readRow` are the only public primitives that read the witness;
-- each records its use. `seal` runs a generator once and makes the
-- `Elaborating`: the recorded problem assembled from the parts as Task
-- 3.2's `generate` assembles it, the reads, the per-variable `fresh`
-- counts and the site table with its write counts. Its argument is
-- `∀ s.`, so a handle cannot leave the generation that minted it
-- (`a = Handle s` is a skolem escape), and the nominal roles stop
-- `coerce` from changing `s`.
--
-- Labelled amendments: `seal` takes the declaration and the program's
-- holder set, which the recorded problem carries (§6.2, ruling K-a) and
-- the parts do not, and returns Task 3.2's generation fault (ruling on
-- Q3, 2026-10-23).
module Features.Check.Generate.Elab
  ( module Exports
  , readRow
  , readType
  , seal
  ) where

import Prelude
import Data.Array (concatMap, mapMaybe)
import Data.Either (Either)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open)
import Domain.Elaborating.Internal (Elaborating(..))
import Domain.Elaborating.Types (UseSort(..))
import Domain.Recorded.Atom (CheckedName(..), RTExpr)
import Domain.Recorded.Origin (Path)
import Domain.Type (Ty)
import Domain.Verdict.Witness (Witness)
import Features.Check.Generate.Assemble (Header, assemble)
import Features.Check.Generate.Elab.Internal
  ( Elab
  , GenTy
  , Handle
  , Ref(..)
  ) as Exports
import Features.Check.Generate.Elab.Internal
  ( Elab(..)
  , Gen(..)
  , Handle
  , Piece(..)
  , readAs
  )
import Features.Check.Generate.Elab.Log (Log, entries)
import Features.Check.Generate.Fault (GenerationFault)
import Features.Check.Generate.Out (Out, concatOut)

readType ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
readType = readAs TypeSort

readRow ∷ ∀ s. CheckedName → Handle s → Elab s (Ty Open)
readRow = readAs RecordSort

seal
  ∷ ∀ a
  . Header
  → (∀ s. Gen s (Elab s a))
  → Either GenerationFault (Elaborating a)
seal header (Gen result) = map (sealed header) result

sealed
  ∷ ∀ s a
  . Header
  → { value ∷ Elab s a, parts ∷ Log Piece }
  → Elaborating a
sealed header { value: Elab elab, parts } = Elaborating
  { problem: assemble header (concatOut (outs <> [ typed ]))
  , uses: elab.uses
  , fresh: counted (map fst (concatMap _.vars outs))
  , sites: Map.fromFoldable sites
  , siteCounts: counted (map fst sites)
  , build
  }
  where
  pieces = entries parts
  outs = mapMaybe wroteOut pieces
  sites = mapMaybe sitedPair pieces
  typed =
    { d: []
    , b: []
    , bq: []
    , outside: []
    , adm: []
    , split: []
    , vars: []
    , types: mapMaybe nodeType sites
    }
  build witness = elab.run (witness ∷ Witness).bindings

wroteOut ∷ Piece → Maybe Out
wroteOut = case _ of
  Wrote out → Just out
  Sited _ _ → Nothing

sitedPair ∷ Piece → Maybe (Tuple CheckedName RTExpr)
sitedPair = case _ of
  Wrote _ → Nothing
  Sited site ty → Just (Tuple site ty)

-- A node's or pattern's site is T-R0b's `types(p)`; the others form the
-- site table only (§3.3). `DuplicateSite` counts by site, not by path:
-- a `NodeType p` and a `PatternType p` at one path would both land at
-- `types(p)`, the last kept. Argued not to arise: T-R0b §6 gives
-- pattern nodes their own steps (`…/pattern`), so a pattern's path is
-- never an expression's; nothing checks it (review of 7.1a).
nodeType ∷ Tuple CheckedName RTExpr → Maybe (Tuple Path RTExpr)
nodeType (Tuple site ty) = case site of
  NodeType path → Just (Tuple path ty)
  PatternType path → Just (Tuple path ty)
  RigidName _ → Nothing
  Slot _ _ → Nothing
  ParamType _ _ → Nothing
  LambdaBody _ → Nothing
  RestType _ → Nothing
  ClauseParamType _ _ _ → Nothing
  Auxiliary → Nothing

counted ∷ ∀ k. Ord k ⇒ Array k → Map k Int
counted = Map.fromFoldableWith add <<< map once
  where
  once key = Tuple key 1
