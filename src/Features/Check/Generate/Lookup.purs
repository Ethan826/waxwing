-- trusted surface: every diff needs token review; see docs/engineering.md
-- The tables as the rules read them. Ids come from the resolved program
-- the tables and signatures were built from (Generate.Inputs); an id
-- they lack is a generation fault (Generate.Fault), never an empty
-- entry, so no obligation is dropped without trace.
module Features.Check.Generate.Lookup
  ( CtorShape
  , OperationShape
  , calleeOf
  , ctorShape
  , declarationsOf
  , effectSorts
  , operationShape
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Tuple (Tuple(..))
import Domain.Ids (EffectId(..), TypeId(..))
import Domain.Recorded.Arity (Declarations)
import Domain.Resolved (CtorId(..), FunctionId, Joined, Ty, VarId)
import Domain.Row (EffectRef(..))
import Domain.Syntax (Sort(..))
import Features.Check.Generate.Fault (Gen, GenerationFault(..))
import Features.Check.Generate.Inputs
  ( Signature
  , Signatures
  , Tables
  , signatureOf
  )
import Features.Check.Tables (ownerType)
import Features.Resolve.Builtin (builtinEffects)

-- A constructor as E4, E6 and P4 read it: its owner's variable sorts, its
-- fields, the owner applied to its own variables (Check/Tables.purs
-- `ownerType`, as construction and patterns both use) and its joined
-- pairs.
type CtorShape =
  { sorts ∷ Array Sort
  , fields ∷ Array (Ty VarId)
  , owner ∷ Ty VarId
  , joined ∷ Array Joined
  }

-- An operation of a declared effect, for E17. `written` is its own `with`
-- row when it writes one (FX032: the validator does not support it).
type OperationShape =
  { sorts ∷ Array Sort
  , parameters ∷ Array (Ty VarId)
  , result ∷ Ty VarId
  , written ∷ Boolean -- a `with` row was written, resolved or not
  }

calleeOf ∷ Signatures → FunctionId → Gen Signature
calleeOf signatures function = note (UnknownFunction function)
  (signatureOf signatures function)

ctorShape ∷ Tables → CtorId → Gen CtorShape
ctorShape tables ctor@(CtorId index) = do
  found ← note (UnknownCtor ctor) (Array.index tables.ctors index)
  shaped found <$> ownerInfo found.owner
  where
  shaped found info =
    { sorts: info.sorts
    , fields: found.fields
    , owner: ownerType found.owner info
    , joined: found.joined
    }
  ownerInfo owner@(TypeId at) = note (UnknownType owner)
    (Array.index tables.types at)

-- An effect's parameters are types (resolved `EffectInfo` has no sorts;
-- BACKLOG R009: effects take type parameters only; docs/findings.md
-- "RT1's translator", reading 15). A builtin's come from Resolve's table.
effectSorts ∷ Tables → EffectRef → Gen (Array Sort)
effectSorts tables = case _ of
  UserEffect effect@(EffectId index) → typeSorts <<< _.parameters
    <$> note (UnknownEffect effect) (Array.index tables.effects index)
  ConsoleEffect → builtin ConsoleEffect
  FailEffect → builtin FailEffect
  where
  builtin ref = typeSorts <<< _.parameters
    <$> note UnknownBuiltinEffect (Array.find (isRef ref) builtinEffects)
  typeSorts = map (const TypeSort)
  isRef wanted found = found.ref == wanted

-- The program's declared arities (A2 arity metadata, dossier §18.148
-- (1)): each declared effect's parameter count, as `effectSorts` reads
-- it, and the built-ins' from Resolve's table; each data type's type
-- parameters (record-row ones among them) and effect-row parameters, the
-- two argument lists of Resolve's `TData`.
declarationsOf ∷ Tables → Declarations
declarationsOf tables =
  { effects: Map.fromFoldable
      (Array.mapWithIndex declared tables.effects <> map builtin builtinEffects)
  , types: Map.fromFoldable (Array.mapWithIndex typed tables.types)
  }
  where
  declared index info =
    Tuple (UserEffect (EffectId index)) (Array.length info.parameters)
  builtin found = Tuple found.ref (Array.length found.parameters)
  typed index info = Tuple (TypeId index)
    { types: Array.length info.parameters
    , rows: Array.length info.rowParameters
    }

operationShape ∷ Tables → EffectId → Int → Gen OperationShape
operationShape tables effect@(EffectId index) operation = do
  info ← note (UnknownEffect effect) (Array.index tables.effects index)
  found ← note (UnknownOperation effect operation)
    (Array.index info.operations operation)
  pure
    { sorts: map (const TypeSort) info.parameters
    , parameters: map typeOf found.parameters
    , result: found.result
    , written: found.written
    }
  where
  typeOf parameter = parameter.ty

note ∷ ∀ a. GenerationFault → Maybe a → Gen a
note fault = maybe (Left fault) Right
