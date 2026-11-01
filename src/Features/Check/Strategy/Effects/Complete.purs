-- trusted surface: every diff needs token review; see docs/engineering.md
-- A2's completion (spec §2.4, the author's ruling in dossier §18.141):
-- `complete` gives P_cu, an input package plus (i) a fresh hole for each
-- absent flexible type and row variable and (ii) for each forced ResultC
-- tail (Effects.Forced) an exact copy of its source's input image; it is
-- the one builder of `Completed`. `settledOf` is P_c = settle P_cu, the
-- package every obligation reads. Completion runs before settling, so
-- its fresh holes settle too (case C6 separates the two orders).
-- `witnessOf` reads the same completed package, so the witness's `Free n`
-- is completion's hole n (§18.141: one numbering).
module Features.Check.Strategy.Effects.Complete
  ( complete
  , settledOf
  , witnessOf
  ) where

import Prelude
import Data.Array (concatMap, foldl, fromFoldable, mapMaybe, mapWithIndex)
import Data.Foldable (maximum)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..), snd)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (Var, VarInfo, VarSort(..))
import Domain.Recorded.Hole (holeIndex, holeVar)
import Domain.Verdict.Witness (Witness)
import Domain.Verdict.EffectPackage
  ( EffectPackage
  , PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , completedPackage
  )
import Domain.Verdict.EffectPackage.Internal (Completed(..))
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.Effects.Package (erase, settle, underRow)
import Features.Check.Strategy.Witness (bindingsOf, flexDomain)

-- Fresh holes are numbered from h + 1, h the largest hole number in the
-- input's `types`, `rows` and `effects` (marks hold none), so completion
-- keeps every input hole's number and adds distinct new ones.
complete ∷ RecordedProblem → EffectPackage → Completed
complete problem package =
  Completed (forceAll problem package (freshHoles problem package))

settledOf ∷ Completed → EffectPackage
settledOf = settle <<< completedPackage

-- Spec §2.4: `Free n` when a variable's erased image is the bare hole n
-- of its sort, else `Inline`, by `bindingsOf`'s own `binding` rule.
-- `bindingsOf` numbers fresh holes only for flexible variables its
-- substitution leaves out; `complete` bound every flexible type and row
-- variable and `erase` keeps both maps, so that numbering never runs.
witnessOf ∷ RecordedProblem → Completed → Witness
witnessOf problem completed =
  { bindings: bindingsOf problem (erase (completedPackage completed))
  , names: []
  }

-- (i): the absent variables of each sort, together in `Ord Var` order,
-- as today's `bindingsOf` numbers them.
freshHoles ∷ RecordedProblem → EffectPackage → EffectPackage
freshHoles problem package =
  foldl bindFresh package (mapWithIndex numbered absent)
  where
  domain = flexDomain problem
  flexible = Map.filterKeys (flip Set.member domain) (fields problem).vars
  absent = mapMaybe unbound (Map.toUnfoldable flexible)
  unbound (Tuple variable info)
    | bound package variable info = Nothing
    | otherwise = Just (Tuple variable info)
  numbered index (Tuple variable info) =
    { variable, info, hole: nextHole package + index }

bound ∷ EffectPackage → Var → VarInfo → Boolean
bound package variable info = case info.sort of
  SortType → Map.member variable package.types
  SortRow → Map.member variable package.rows

bindFresh
  ∷ EffectPackage
  → { variable ∷ Var, info ∷ VarInfo, hole ∷ Int }
  → EffectPackage
bindFresh package fresh = case fresh.info.sort of
  SortType → package
    { types = Map.insert fresh.variable (PVar made) package.types }
  SortRow → package
    { rows = Map.insert fresh.variable { fields: [], tails: [ made ] }
        package.rows
    }
  where
  made = holeVar fresh.hole

nextHole ∷ EffectPackage → Int
nextHole package = maybe 0 (_ + 1) (maximum found)
  where
  found = concatMap tyHoles (fromFoldable package.types)
    <> concatMap recordHoles (fromFoldable package.rows)
    <> concatMap rowHoles (fromFoldable package.effects)

-- (ii): each forced tail's binding is its source's image in the input,
-- read as `underRow` reads a recorded tail (a rigid source is itself),
-- holes keeping their numbers. A source absent from the input leaves its
-- forced tail unbound: the validator runs I3 before completion (spec §4,
-- steps 2 and 4), and I3's domain check refuses such an input, so no
-- judged package reaches here with it.
forceAll ∷ RecordedProblem → EffectPackage → EffectPackage → EffectPackage
forceAll problem input package =
  package { effects = foldl force package.effects (forcedTails problem) }
  where
  force effects found = maybe effects (forcedTo effects found)
    (underRow input { labels: [], tail: Just found.source })
  forcedTo effects found image = Map.insert found.forced image effects

tyHoles ∷ PTy → Array Int
tyHoles = case _ of
  PBase _ → []
  PVar variable → varHoles variable
  PArrow parameter row result →
    tyHoles parameter <> rowHoles row <> tyHoles result
  PRecord row → recordHoles row
  PData _ arguments rows →
    concatMap tyHoles arguments <> concatMap rowHoles rows
  PHandler label rows → labelHoles label <> rowHoles rows.inference
    <> maybe [] rowHoles rows.clauses

recordHoles ∷ PRecordRow → Array Int
recordHoles row =
  concatMap (tyHoles <<< snd) row.fields <> concatMap varHoles row.tails

rowHoles ∷ PRow → Array Int
rowHoles row = concatMap labelHoles row.labels <> maybe [] tailHoles row.tail
  where
  tailHoles = case _ of
    PTailHole hole → [ hole ]
    PTailRigid _ → []

labelHoles ∷ PLabel → Array Int
labelHoles label = concatMap tyHoles label.args

varHoles ∷ Var → Array Int
varHoles = maybe [] pure <<< holeIndex
