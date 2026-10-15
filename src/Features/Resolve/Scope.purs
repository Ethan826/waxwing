module Features.Resolve.Scope (Bindings, Import, Scope) where

import Data.Map (Map)
import Data.Maybe (Maybe)
import Domain.Resolved (Global)
import Domain.Resolved as Resolved
import Domain.Type (Ty, VarId)
import Features.Resolve.Builtin (Declared)
import Features.Resolve.BodySorts (SignatureSorts)
import Features.Resolve.Lacking (Lacking)

-- An imported operation (FX020 §1): the local name it is bound to, what it
-- names, and, for a `Fail(E)` import, the family `E` that `fail` is fixed to.
type Import =
  { local ∷ String
  , declared ∷ Declared
  , family ∷ Maybe (Ty VarId)
  }

-- A function's signature bindings: `Database as D` leaves `D` naming
-- `Database`, and `Log { log }` the imports.
type Bindings =
  { aliases ∷ Array { name ∷ String, effect ∷ String }
  , imports ∷ Array Import
  }

type Scope =
  { globals ∷ Array Global
  , ctors ∷ Array Resolved.CtorInfo
  , locals ∷ Map String Resolved.LocalId
  , bindings ∷ Bindings
  , types ∷ Array Resolved.TypeInfo
  , effects ∷ Array { name ∷ String, arity ∷ Int }
  , effectInfos ∷ Array Resolved.EffectInfo
  , variables ∷ Array String
  , markVariables ∷ Array String
  , lacking ∷ Maybe Lacking
  , signatureSorts ∷ SignatureSorts
  }
