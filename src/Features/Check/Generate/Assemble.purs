-- trusted surface: every diff needs token review; see docs/engineering.md
-- A recorded problem from what generation wrote (T-R0b §10; moved from
-- Features.Check.Generate unchanged in R0 Task 7.1a, so that D1's `seal`
-- assembles its problem the same way): the variables by quantifier and
-- sort, the entries as written, `q` empty, and the declaration and the
-- program's holder set (ruling K-a) from the header.
module Features.Check.Generate.Assemble
  ( Header
  , assemble
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Foldable (foldl)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (Holders, Quant(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Effect (EffectProblem, emptyEffects)
import Domain.Recorded.Internal (RecordedProblem(..))
import Domain.Recorded.Origin (Path)
import Domain.Resolved (FunctionId)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Out (EffectItem(..), Out)

type Header = { decl ∷ FunctionId, holders ∷ Holders }

-- A second write of one keyed kind at one path is a generation fault,
-- found on the item list before any map is built (equal values too); so
-- is a declaration with no `SignatureAt` at all, read off the item list,
-- never by comparing the signature with `emptyEffects`' (a legitimate
-- unit signature equals it).
assemble ∷ Header → Out → Either GenerationFault RecordedProblem
assemble header out = map (assembled header out) (checked out.effects)

checked ∷ Array EffectItem → Either GenerationFault (Array EffectItem)
checked items = maybe (signed items) refused (duplicate items)
  where
  refused (Tuple kind path) = Left (DuplicateEffect kind path)

signed ∷ Array EffectItem → Either GenerationFault (Array EffectItem)
signed items
  | Array.any isSignature items = Right items
  | otherwise = Left MissingSignature

isSignature ∷ EffectItem → Boolean
isSignature = case _ of
  SignatureAt _ _ → true
  _ → false

duplicate ∷ Array EffectItem → Maybe (Tuple String Path)
duplicate items = _.found (foldl seen start (Array.mapMaybe keyed items))
  where
  start = { found: Nothing, written: Set.empty }
  seen state key
    | Set.member key state.written = state { found = orFirst state key }
    | otherwise = state { written = Set.insert key state.written }
  orFirst state key = Just (fromMaybe key state.found)

keyed ∷ EffectItem → Maybe (Tuple String Path)
keyed = case _ of
  NodeAt path _ → Just (Tuple "NodeAt" path)
  InstanceAt path _ → Just (Tuple "InstanceAt" path)
  AnnotationAt path _ → Just (Tuple "AnnotationAt" path)
  ArityAt path _ → Just (Tuple "ArityAt" path)
  AmbientAt path _ → Just (Tuple "AmbientAt" path)
  SignatureAt path _ → Just (Tuple "SignatureAt" path)
  _ → Nothing

assembled ∷ Header → Out → Array EffectItem → RecordedProblem
assembled header out items = RecordedProblem
  { decl: header.decl
  , rigidTy: keys rigidType
  , rigidRow: keys rigidRow
  , flexTy: keys flexType
  , flexRow: keys flexRow
  , d: out.d
  , q: []
  , b: out.b
  , bq: out.bq
  , outside: out.outside
  , adm: out.adm
  , split: out.split
  , vars
  , types: Map.fromFoldable out.types
  , holders: header.holders
  , effects: listed items (foldl addItem emptyEffects items)
  }
  where
  vars = Map.fromFoldable out.vars
  keys wanted = Array.mapMaybe (keyOf wanted)
    (Map.toUnfoldable vars ∷ Array (Tuple Var VarInfo))
  keyOf wanted (Tuple var info) =
    if wanted info then Just var else Nothing
  rigidType info = rigid info && info.sort == SortType
  rigidRow info = rigid info && info.sort == SortRow
  flexType info = not (rigid info) && info.sort == SortType
  flexRow info = not (rigid info) && info.sort == SortRow
  rigid info = case info.quant of
    Forall _ → true
    Exists → false

-- One emitted effect item joins its part of the problem: maps key by
-- path (`checked` has ruled out a repeat); the lists are `listed`'s.
addItem ∷ EffectProblem → EffectItem → EffectProblem
addItem problem = case _ of
  Obliged _ → problem
  NodeAt path ty → problem { nodes = Map.insert path ty problem.nodes }
  InstanceAt path ty →
    problem { instances = Map.insert path ty problem.instances }
  AnnotationAt path ty →
    problem { annotations = Map.insert path ty problem.annotations }
  RigidMark _ → problem
  EffectRigid _ → problem
  ArityAt path n → problem { arities = Map.insert path n problem.arities }
  AmbientAt path row → problem { ambient = Map.insert path row problem.ambient }
  SignatureAt _ sig → problem { signature = sig }
  MintedVar _ → problem
  MintedPosition _ → problem

-- The lists, each in emission order, by one pass over the items per
-- list: appending one item at a time in the fold copied the list each
-- time, quadratic in the item count (Task 8's consumptions doubled the
-- time in the scale bounds of test/r0-census.serial.test.mjs).
listed ∷ Array EffectItem → EffectProblem → EffectProblem
listed items problem = problem
  { obligations = Array.mapMaybe obliged items
  , rigidMarks = Array.mapMaybe rigidMark items
  , effectRigids = Array.mapMaybe effectRigid items
  , flexEff = Array.mapMaybe mintedVar items
  , positions = Array.mapMaybe mintedPosition items
  }
  where
  obliged = case _ of
    Obliged entry → Just entry
    _ → Nothing
  rigidMark = case _ of
    RigidMark name → Just name
    _ → Nothing
  effectRigid = case _ of
    EffectRigid var → Just var
    _ → Nothing
  mintedVar = case _ of
    MintedVar var → Just var
    _ → Nothing
  mintedPosition = case _ of
    MintedPosition at → Just at
    _ → Nothing
