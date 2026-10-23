-- The tables as the rules read them. Ids come from the resolved program
-- the tables and signatures were built from (Generate.Inputs), so every
-- lookup finds its entry; generation is nonetheless total (T-R0b §2.4
-- G-total), so a missing entry reads as an empty one (no variables, no
-- parameters, `Unit`) rather than stopping. That fallback is argued
-- unreachable, not checked: a missing id would be an earlier phase's
-- fault (Domain.Problem `InputShape`), which generation cannot report.
module Features.Check.Generate.Lookup
  ( CtorShape
  , OperationShape
  , calleeOf
  , ctorShape
  , effectSorts
  , operationShape
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe, maybe')
import Domain.Ids (EffectId(..), TypeId(..))
import Domain.Resolved (CtorId(..), FunctionId, Joined, Ty(..), VarId)
import Domain.Row (EffectRef(..), Row(..))
import Domain.Syntax (Sort(..))
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

-- An operation of a declared effect, for E17.
type OperationShape =
  { sorts ∷ Array Sort, parameters ∷ Array (Ty VarId), result ∷ Ty VarId }

calleeOf ∷ Signatures → FunctionId → Signature
calleeOf signatures function = maybe' none identity
  (signatureOf signatures function)
  where
  none _ =
    { sorts: []
    , parameters: []
    , result: TUnit
    , row: Row [] Nothing
    , constraints: []
    , joined: []
    }

ctorShape ∷ Tables → CtorId → CtorShape
ctorShape tables (CtorId index) = maybe none shaped
  (Array.index tables.ctors index)
  where
  none = { sorts: [], fields: [], owner: TUnit, joined: [] }
  shaped ctor = maybe none (withOwner ctor) (ownerInfo ctor.owner)
  withOwner ctor info =
    { sorts: info.sorts
    , fields: ctor.fields
    , owner: ownerType ctor.owner info
    , joined: ctor.joined
    }
  ownerInfo (TypeId owner) = Array.index tables.types owner

-- An effect's parameters are types (resolved `EffectInfo` has no sorts;
-- BACKLOG R009: effects take type parameters only; docs/findings.md
-- "RT1's translator", reading 15). A builtin's come from Resolve's table.
effectSorts ∷ Tables → EffectRef → Array Sort
effectSorts tables = case _ of
  UserEffect (EffectId index) → maybe [] (typeSorts <<< _.parameters)
    (Array.index tables.effects index)
  ConsoleEffect → builtin ConsoleEffect
  FailEffect → builtin FailEffect
  where
  builtin ref = maybe [] (typeSorts <<< _.parameters)
    (Array.find (isRef ref) builtinEffects)
  typeSorts = map (const TypeSort)
  isRef wanted found = found.ref == wanted

operationShape ∷ Tables → EffectId → Int → OperationShape
operationShape tables effect@(EffectId index) operation = maybe none shaped
  (Array.index tables.effects index >>= operationAt)
  where
  operationAt info = Array.index info.operations operation
  none = { sorts: [], parameters: [], result: TUnit }
  shaped found =
    { sorts: effectSorts tables (UserEffect effect)
    , parameters: map typeOf found.parameters
    , result: found.result
    }
  typeOf parameter = parameter.ty
