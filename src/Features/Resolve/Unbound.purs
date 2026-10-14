module Features.Resolve.Unbound (unboundName) where

import Prelude
import Data.Array as Array
import Domain.Problem (Hint(..), Problem(..), UnboundKind)
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
  declaring = map _.name (Array.filter builtinHas builtinEffects)
    <> map _.name (Array.filter userHas scope.effectInfos)
  builtinHas effect = Array.any (called name) effect.operations
  userHas effect = Array.any (called name) effect.operations

called ∷ ∀ r. String → { name ∷ String | r } → Boolean
called wanted entry = entry.name == wanted
