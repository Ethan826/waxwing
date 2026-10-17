module Features.Resolve.Requirements (resolveRequirements) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (fromMaybe, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Resolved (Requirement(..), VarId(..))
import Domain.Syntax as Syntax
import Features.Resolve.RecordFields (repeatedField, repeatedLabel)

-- A signature as the constraints see it: its variables in order, and the
-- sort of each (`sorts !! i` is the sort of `variables !! i`).
type Variables = { variables ∷ Array String, sorts ∷ Array Syntax.Sort }

-- R005 design §2: each `where r lacks { … }` names a variable of the
-- signature, which must be a record row variable. The errors are at the
-- constraint's variable: an unknown name is an unbound type variable, an
-- effect row and a type are each said to be no record row (approved
-- 2026-10-16). A label written twice in one list is Duplicate field, at
-- the second, as in `without`.
resolveRequirements
  ∷ Variables
  → Array Syntax.Requirement
  → Either Syntax.Diagnostic (Array Requirement)
resolveRequirements known = traverse (resolved known)

resolved ∷ Variables → Syntax.Requirement → Either Syntax.Diagnostic Requirement
resolved known = case _ of
  Syntax.Lacks found → lacksOf known found
  Syntax.Disjoint found → disjointOf known found

lacksOf
  ∷ Variables
  → { variable ∷ Syntax.Label, span ∷ Syntax.Span, labels ∷ Array Syntax.Label }
  → Either Syntax.Diagnostic Requirement
lacksOf known found = do
  variable ← recordRow known found.variable
  traverse_ repeatedField (repeatedLabel found.labels)
  pure
    ( Lacks
        { variable
        , written: found.variable
        , span: found.span
        , labels: found.labels
        }
    )

-- `r disjoint s` (R005 Tranche B): both name record row variables of the
-- signature, and two different ones (D9, at the second, approved
-- 2026-10-17): `r disjoint r` would force every caller to `{}`.
disjointOf
  ∷ Variables
  → { variables ∷ Tuple Syntax.Label Syntax.Label, span ∷ Syntax.Span }
  → Either Syntax.Diagnostic Requirement
disjointOf known found = do
  one ← recordRow known first
  other ← recordRow known second
  when (first.name == second.name) (Left (sameVariable second))
  pure
    ( Disjoint
        { variables: Tuple one other
        , written: found.variables
        , span: found.span
        }
    )
  where
  Tuple first second = found.variables
  sameVariable at = Syntax.problemAt SameDisjoint at.span

recordRow ∷ Variables → Syntax.Label → Either Syntax.Diagnostic VarId
recordRow known variable = maybe unbound sorted
  (Array.elemIndex variable.name known.variables)
  where
  unbound = Left
    ( Syntax.problemAt (Unbound UnboundTypeVariable variable.name)
        variable.span
    )
  sorted index = case sortAt known index of
    Syntax.RecordSort → Right (VarId index)
    Syntax.RowSort → refused (EffectRowAsRecord variable.name)
    Syntax.TypeSort → refused (TypeAsRecordRow variable.name)
  refused problem = Left (Syntax.problemAt problem variable.span)

sortAt ∷ Variables → Int → Syntax.Sort
sortAt known index = fromMaybe Syntax.TypeSort (Array.index known.sorts index)
