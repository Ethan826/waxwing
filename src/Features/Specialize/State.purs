module Features.Specialize.State
  ( Env
  , Key
  , Work
  , WorkKind(..)
  , State
  , Counts
  , PrintSite
  , Specializing
  , specializationLimit
  , enqueue
  ) where

import Prelude
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Tuple (Tuple)
import Domain.Checked.Internal as Checked
import Domain.IR.Internal as IR
import Domain.Resolved (CtorInfo, EffectInfo, TypeInfo)
import Domain.Row (EffectRef)
import Domain.Syntax (Span)
import Domain.Type (Ty)
import Features.Specialize.Copy (Copy)
import Features.Specialize.Intern (Arrows)
import Features.Specialize.Layouts (Layouts)

-- The checked program's tables and what Specialize computed from them
-- once: the output id of each monomorphic type and function, each
-- constructor's position in its owner, and the type that replaces holes.
type Env =
  { types ∷ Array TypeInfo
  , effects ∷ Array EffectInfo
  , ctors ∷ Array CtorInfo
  , functions ∷ Array Checked.FunctionDecl
  , monoTypes ∷ Array (Maybe Int)
  , monoFunctions ∷ Array (Maybe Int)
  , positions ∷ Array (Maybe Int)
  , representative ∷ Ty Void
  }

-- A key is hash-consed (R15): a declaration and its ground arguments, each
-- already numbered as an output type or an interned arrow
-- (Features.Specialize.Intern), so comparing two keys costs their arity,
-- never the size of the types they stand for.
type Key = Tuple Int (Array IR.Ty)

-- One output declaration to fill, in creation order, with the span of the
-- reference that created it (a seed's own declaration). An effect's is its
-- user effect's index (FX001 design §4).
type Work =
  { output ∷ Int
  , declaration ∷ Int
  , arguments ∷ Array IR.Ty
  , kind ∷ WorkKind
  , span ∷ Span
  }

data WorkKind = TypeWork | FunctionWork | EffectWork

derive instance eqWorkKind ∷ Eq WorkKind

type Counts =
  { types ∷ Int
  , ctors ∷ Int
  , functions ∷ Int
  , effects ∷ Int
  , work ∷ Int
  , polymorphic ∷ Int
  , prints ∷ Int
  }

-- A print, show or crash argument's span and ground type, noted for the
-- printable check once every type is filled (Features.Specialize.Printable).
type PrintSite = { span ∷ Span, ty ∷ IR.Ty }

-- Output declarations by output id, the memo tables of polymorphic keys,
-- of effect layouts, of arrows and of record layouts, and the worklist
-- (never emptied: it also records every key in order).
type State =
  { typeKeys ∷ Map Key Int
  , functionKeys ∷ Map Key Int
  , effectKeys ∷ Map (Tuple EffectRef (Array IR.Ty)) Int
  , types ∷ Map Int IR.TypeInfo
  , ctors ∷ Map Int IR.CtorInfo
  , effects ∷ Map Int IR.EffectInfo
  , functions ∷ Map Int IR.FunctionDecl
  , work ∷ Map Int Work
  , prints ∷ Map Int PrintSite
  , arrows ∷ Arrows
  , layouts ∷ Layouts
  , counts ∷ Counts
  }

type Specializing = Copy State

-- Design §6: a resource guard over keys of polymorphic declarations only;
-- an effect's key counts when it has type arguments (FX001 design §4).
specializationLimit ∷ Int
specializationLimit = 10000

enqueue ∷ Work → State → State
enqueue item state = state
  { work = Map.insert state.counts.work item state.work
  , counts = state.counts { work = state.counts.work + 1 }
  }
