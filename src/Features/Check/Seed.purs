module Features.Check.Seed (seeded, required, joined) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty, VarId(..))
import Features.Check.Disjoint (seedApart)
import Features.Check.Lacks (addLackTable, seedLacks)
import Features.Check.RowStore (Because(..))
import Features.Check.Scheme (State, flexible)
import Features.Check.Unify (Flex)

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

-- The state with what a signature's `where` clauses say (R005 design §2;
-- Tranche B design §3), each variable's tail given by `tailOf`: a meta at
-- a use, the rigid in the body. A written lack keeps its clause even
-- where the types already imply it, and a written disjointness its
-- clause where a type joins the two tails: the precedence of design §1.3
-- (user decision 5) keeps the written reason, whichever is seeded first.
required
  ∷ (VarId → Flex) → Array Resolved.Requirement → State → State
required tailOf constraints state = state
  { subst = foldl clause state.subst constraints }
  where
  clause subst = case _ of
    Resolved.Lacks found → addLackTable (tailOf found.variable)
      (Map.fromFoldable (map (written found.written.name) found.labels))
      subst
    Resolved.Disjoint found → seedApart (tailOf (first found.variables))
      (tailOf (second found.variables))
      (Disjoint { variables: names found.written, span: found.span })
      subst
  written variable label = Tuple label.name
    { because: Lacks { variable, span: label.span }, from: Nothing }
  names (Tuple one other) = Tuple one.name other.name

-- The state with the pairs of tails a signature's or a constructor's
-- types write into one record (option A, user decision 2), named by
-- `variables`, each noted at its later tail.
joined
  ∷ (VarId → Flex) → Array String → Array Resolved.Joined → State → State
joined tailOf variables pairs state = state
  { subst = foldl pair state.subst pairs }
  where
  pair subst found = seedApart (tailOf (first found.variables))
    (tailOf (second found.variables))
    ( Joined
        { variables: Tuple (named (first found.variables))
            (named (second found.variables))
        , span: found.span
        }
    )
    subst
  named (VarId index) = maybe "" identity (Array.index variables index)

first ∷ ∀ a. Tuple a a → a
first (Tuple one _) = one

second ∷ ∀ a. Tuple a a → a
second (Tuple _ other) = other

