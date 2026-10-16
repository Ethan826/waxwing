module Features.Check.Seed (seeded, required) where

import Prelude
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Set as Set
import Domain.Checked.Internal (Open)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty, VarId)
import Features.Check.Lacks (addLacks, addWritten, lacksOf, seedLacks)
import Features.Check.Scheme (State, flexible)
import Features.Check.Unify (Flex, Subst)

-- The state with what these types say their record tails lack: a
-- signature's or a constructor's types at one use, or a function's own
-- signature for its body (R001 design §2, rule 4).
seeded
  ∷ ∀ r
  . { types ∷ Array Resolved.TypeInfo, ctors ∷ Array Resolved.CtorInfo | r }
  → Array Syntax.Sort
  → Array (Ty Open)
  → State
  → State
seeded env sorts types state = state
  { subst = seedLacks { types: env.types, ctors: env.ctors } sorts
      (map flexible types)
      state.subst
  }

-- The state with what a signature's `where` clauses say its record tails
-- lack (R005 design §2), each variable's tail given by `tailOf`: a meta
-- at a use, the rigid in the body. Seeded after the implied lacks: a
-- label the types already imply keeps no clause, so its violation keeps
-- the implied one's text (ADR 013), as writing it again has no effect.
required
  ∷ (VarId → Flex) → Array Resolved.Requirement → State → State
required tailOf constraints state = state
  { subst = foldl clause state.subst constraints }
  where
  clause subst (Resolved.Lacks found) = foldl
    (lacked (tailOf found.variable) found.written.name)
    subst
    found.labels

lacked ∷ Flex → String → Subst → Syntax.Label → Subst
lacked tail variable subst label
  | Set.member label.name (lacksOf subst tail) = subst
  | otherwise = addLacks tail (Set.singleton label.name)
      ( addWritten tail
          (Map.singleton label.name { variable, span: label.span })
          subst
      )
