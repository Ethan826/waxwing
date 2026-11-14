-- trusted surface: every diff needs token review; see docs/engineering.md
-- What generation reads besides the declaration (T-R0b §1, §10): the
-- type, constructor and effect tables and every function's written
-- signature, built from one resolved program. No call graph and no
-- checking result is here (G-local), so a declaration's problem depends
-- only on its own syntax and the signatures it references.
module Features.Check.Generate.Inputs
  ( Inputs
  , Signature
  , Signatures
  , Tables
  , generationInputs
  , signatureOf
  , signatureOfDecl
  ) where

import Prelude
import Data.Map (Map)
import Data.Map as Map
import Data.Set (Set)
import Domain.Type (TypeId)
import Features.Check.Admitted (admitted)
import Features.Check.Functional (functional)
import Data.Maybe (Maybe)
import Data.Tuple (Tuple(..))
import Domain.Resolved
  ( CtorInfo
  , EffectInfo
  , FunctionDecl
  , FunctionId(..)
  , Joined
  , Requirement
  , Ty
  , TyRow
  , TypeInfo
  , VarId
  )
import Domain.Resolved as Resolved
import Domain.Syntax (Sort)

-- T-R0b §10's `Tables = { types, ctors, effects }`, plus Scope A's
-- admitted set (Features.Check.Admitted), settled once per program.
type Tables =
  { types ∷ Array TypeInfo
  , ctors ∷ Array CtorInfo
  , effects ∷ Array EffectInfo
  , admitted ∷ Set TypeId
  }

-- A callee as a reference reads it: its written signature (Resolved.purs
-- FunctionDecl), never its body or its checking.
type Signature =
  { sorts ∷ Array Sort
  , parameters ∷ Array (Ty VarId)
  , result ∷ Ty VarId
  , row ∷ TyRow VarId
  , constraints ∷ Array Requirement
  , joined ∷ Array Joined
  }

-- Every function's signature by its id.
newtype Signatures = Signatures (Map Int Signature)

type Inputs = { tables ∷ Tables, signatures ∷ Signatures }

-- The generator's inputs from a resolved program.
generationInputs ∷ Resolved.Program → Inputs
generationInputs program =
  { tables:
      { types: program.types
      , ctors: program.ctors
      , effects: program.effects
      , admitted: admitted program.types program.ctors
          (functional program.ctors)
      }
  , signatures: Signatures (Map.fromFoldable (map keyed program.functions))
  }
  where
  keyed function = Tuple (idOf function.id) (signatureOfDecl function)
  idOf (FunctionId index) = index

signatureOf ∷ Signatures → FunctionId → Maybe Signature
signatureOf (Signatures byId) (FunctionId index) = Map.lookup index byId

signatureOfDecl ∷ FunctionDecl → Signature
signatureOfDecl function =
  { sorts: function.sorts
  , parameters: map typeOf function.parameters
  , result: function.result
  , row: function.row
  , constraints: function.constraints
  , joined: function.joined
  }
  where
  typeOf parameter = parameter.ty
