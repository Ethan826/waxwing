module Features.Resolve.Unbound (unboundName) where

import Prelude
import Data.Array as Array
import Domain.Problem (Candidate, Hint(..), Problem(..), UnboundKind)
import Domain.Syntax as Syntax
import Features.Resolve.Builtin (builtinEffects)
import Features.Resolve.Scope (Scope)

-- An unbound bare name keeps its error. If an effect declares an operation
-- of that name, a hint lists `Effect.name` for each, built-ins first (they
-- are declared before any program), then in declaration order. The hint
-- only lists fixes: it never resolves the name (FX020 §2).
unboundName
  ∷ Scope → Syntax.Span → UnboundKind → String → Syntax.Diagnostic
unboundName scope span kind name = Syntax.problemAt problem span
  where
  problem
    | Array.null declaring = Unbound kind name
    | otherwise = Hinted (Unbound kind name) (QualifyOperation name declaring)
  declaring = map candidate (Array.filter (offers name) builtinEffects)
    <> map candidate (Array.filter (offers name) scope.effectInfos)

candidate
  ∷ ∀ r. { name ∷ String, parameters ∷ Array String | r } → Candidate
candidate effect = { name: effect.name, parameters: effect.parameters }

called ∷ ∀ r. String → { name ∷ String | r } → Boolean
called wanted entry = entry.name == wanted

-- Built-in and user effects differ in their other fields, so this takes any
-- record with operations.
offers
  ∷ ∀ r s. String → { operations ∷ Array { name ∷ String | s } | r } → Boolean
offers wanted effect = Array.any (called wanted) effect.operations
