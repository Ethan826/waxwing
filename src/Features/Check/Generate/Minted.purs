-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a marked type names (amin tranche 1, Task 4): its effect-row
-- tails and its positions, read by a loop over a work list, so neither
-- a long arrow spine nor a wide row recurses. `mintedAt p` turns those
-- named at path p into `MintedVar` and `MintedPosition` items, each
-- once (a variable or position named at several places in one owner's
-- types is minted by that owner alone): an owner mints what carries its
-- own path, never another node's. `mentions` is the syntactic occurrence
-- fold H′ reads (Generate.Owned).
module Features.Check.Generate.Minted
  ( Part(..)
  , mentions
  , mintedAt
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (elem)
import Data.List (List(..), (:))
import Data.List as List
import Data.Maybe (maybe)
import Data.Tuple (snd)
import Domain.Recorded.Effect
  ( EVar(..)
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  )
import Domain.Recorded.Origin (Path)
import Features.Check.Generate.Out (EffectItem(..))

-- A piece of a marked type still to read.
data Part = PartTy MTy | PartRow MRow | PartLabel MLabel

type Named = { tails ∷ List EVar, positions ∷ List Position }

-- The `MintedVar` items, then the `MintedPosition` items, for the owner's
-- own variables (those it mints whether or not a type names them) and
-- what these parts name at path p, each once, in first-named order.
mintedAt ∷ Path → Array EVar → Array Part → Array EffectItem
mintedAt path own parts =
  map MintedVar (Array.nub (Array.filter ownVar (own <> named.tails)))
    <> map MintedPosition (Array.nub (Array.filter ownPosition named.positions))
  where
  found = namedIn parts
  named =
    { tails: Array.reverse (List.toUnfoldable found.tails)
    , positions: Array.reverse (List.toUnfoldable found.positions)
    }
  ownVar = case _ of
    EffFresh at _ → at == path
    EffRigid _ → false
  ownPosition = eq path <<< positionPath

-- Whether the variable is a tail anywhere in these parts.
mentions ∷ EVar → Array Part → Boolean
mentions variable parts = elem variable (namedIn parts).tails

positionPath ∷ Position → Path
positionPath = case _ of
  Frame at → at
  Literal at → at
  Opened at → at
  Annotation at _ _ → at
  Instantiated at _ → at

-- Each step reads one part, pushing its children.
namedIn ∷ Array Part → Named
namedIn parts = tailRec step
  { pending: List.fromFoldable parts, named: { tails: Nil, positions: Nil } }
  where
  step state = case state.pending of
    Nil → Done state.named
    PartTy ty : rest → Loop (ofTy ty rest state.named)
    PartRow row : rest → Loop (ofRow row rest state.named)
    PartLabel label : rest → Loop (ofLabel label rest state.named)

type Walk = { pending ∷ List Part, named ∷ Named }

ofTy ∷ MTy → List Part → Named → Walk
ofTy ty rest named = case ty of
  MBase _ → { pending: rest, named }
  MVar _ → { pending: rest, named }
  MRecord fields _ →
    { pending: pushed (map (PartTy <<< snd) fields) rest, named }
  MData _ arguments rows →
    { pending: pushed (map PartTy arguments <> map PartRow rows) rest
    , named
    }
  MHandler label rows → ofLabel label
    (pushed ([ PartRow rows.inference ] <> clausesOf rows.clauses) rest)
    named
  MArrow parameter row result →
    { pending: PartTy parameter : PartRow row : PartTy result : rest, named }
  where
  clausesOf = maybe [] (Array.singleton <<< PartRow)

ofRow ∷ MRow → List Part → Named → Walk
ofRow row rest named =
  { pending: pushed (map PartLabel row.labels) rest
  , named: named { tails = maybe named.tails (_ : named.tails) row.tail }
  }

-- A label's mark, then its arguments to read.
ofLabel ∷ MLabel → List Part → Named → Walk
ofLabel label rest named =
  { pending: pushed (map PartTy label.args) rest
  , named: case label.mark of
      At position → named { positions = position : named.positions }
      Written _ → named
  }

pushed ∷ Array Part → List Part → List Part
pushed parts rest = Array.foldr Cons rest parts
