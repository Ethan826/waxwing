module Features.Check.ResolvedName (resolvedName) where

import Prelude
import Data.Either (Either)
import Domain.Checked.Internal (rigid)
import Domain.Problem (TypeName)
import Domain.Resolved (EffectInfo, TypeInfo)
import Domain.Syntax (Diagnostic, Span, origin)
import Domain.Type (Ty, VarId)
import Features.Check.TypeName (typeName)

-- A type as resolution wrote it, named as checking names its types, for a
-- diagnostic reported before checking (R012: `Expected a record, found
-- Int` at a declared type's record argument). Only an effect's name is
-- read, so the summaries resolution holds are enough.
resolvedName
  ∷ { types ∷ Array TypeInfo
    , effects ∷ Array { name ∷ String, arity ∷ Int }
    , variables ∷ Array String
    }
  → Span
  → Ty VarId
  → Either Diagnostic TypeName
resolvedName names span ty = typeName env span (rigid ty)
  where
  env =
    { types: names.types
    , variables: names.variables
    , effects: map named names.effects
    }

named ∷ { name ∷ String, arity ∷ Int } → EffectInfo
named effect =
  { name: effect.name, parameters: [], operations: [], span: nowhere }
  where
  nowhere = { start: origin, end: origin }
