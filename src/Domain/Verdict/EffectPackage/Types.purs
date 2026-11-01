-- trusted surface: every diff needs token review; see docs/engineering.md
-- The effect package's types (A2 spec §2.2, approved by the author,
-- dossier §18.145): one map per sort, marks inside bindings as `Term`s.
-- Split from Domain.Verdict.EffectPackage only because `Completed`'s
-- constructor, in .Internal, wraps an `EffectPackage` while the facade
-- imports .Internal; PureScript has no cyclic imports. Importers read
-- these through the facade.
module Domain.Verdict.EffectPackage.Types
  ( EffectPackage
  , PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  ) where

import Prelude
import Data.Map (Map)
import Data.Maybe (Maybe)
import Data.Set (Set)
import Data.Tuple (Tuple)
import Domain.Recorded.Atom (Base, Var)
import Domain.Recorded.Effect (EVar, Position)
import Domain.Row (EffectRef)
import Domain.Type (TypeId, VarId)

-- N, M, or the join of named rigid marks; compared on normal forms
-- (`TermJ ∅` normalizes to `TermN`).
data Term = TermN | TermM | TermJ (Set String)

data PTy
  = PBase Base -- never `DataBase` (I3, canonical)
  | PVar Var -- a declared rigid at SortType, or a hole
  | PArrow PTy PRow PTy
  | PRecord PRecordRow
  | PData TypeId (Array PTy) (Array PRow)
  | PHandler PLabel { inference ∷ PRow, clauses ∷ Maybe PRow }

-- Fields, and tails that are declared SortRow rigids or holes.
type PRecordRow = { fields ∷ Array (Tuple String PTy), tails ∷ Array Var }

type PLabel = { effect ∷ EffectRef, args ∷ Array PTy, mark ∷ Term }

data PTail = PTailRigid VarId | PTailHole Int

type PRow = { labels ∷ Array PLabel, tail ∷ Maybe PTail }

type EffectPackage =
  { types ∷ Map Var PTy -- flexible SortType variables
  , rows ∷ Map Var PRecordRow -- flexible SortRow variables
  , effects ∷ Map EVar PRow -- package-owned effect-row variables
  , marks ∷ Map Position Term -- recorded positions
  }

derive instance eqTerm ∷ Eq Term
derive instance eqPTail ∷ Eq PTail
derive instance eqPTy ∷ Eq PTy
