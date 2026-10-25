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
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Foldable (foldl)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (Holders, Quant(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Effect (EffectProblem, emptyEffects)
import Domain.Recorded.Internal (RecordedProblem(..))
import Domain.Resolved (FunctionId)
import Features.Check.Generate.Out (EffectItem(..), Out)

type Header = { decl ∷ FunctionId, holders ∷ Holders }

assemble ∷ Header → Out → RecordedProblem
assemble header out = RecordedProblem
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
  , effects: foldl addItem emptyEffects out.effects
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

-- One emitted effect item joins its part of the problem: lists append in
-- emission order, maps key by path (a later item replaces an earlier one).
addItem ∷ EffectProblem → EffectItem → EffectProblem
addItem problem = case _ of
  Obliged entry → problem { obligations = problem.obligations <> [ entry ] }
  NodeAt path ty → problem { nodes = Map.insert path ty problem.nodes }
  InstanceAt path ty →
    problem { instances = Map.insert path ty problem.instances }
  AnnotationAt path ty →
    problem { annotations = Map.insert path ty problem.annotations }
  RigidMark name → problem { rigidMarks = problem.rigidMarks <> [ name ] }
  EffectRigid var → problem { effectRigids = problem.effectRigids <> [ var ] }
  ArityAt path n → problem { arities = Map.insert path n problem.arities }
  AmbientAt path row → problem { ambient = Map.insert path row problem.ambient }
  MintedVar var → problem { flexEff = problem.flexEff <> [ var ] }
  MintedPosition at → problem { positions = problem.positions <> [ at ] }
