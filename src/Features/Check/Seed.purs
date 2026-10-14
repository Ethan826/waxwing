module Features.Check.Seed (seeded) where

import Prelude
import Domain.Checked.Internal (Open)
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty)
import Features.Check.Lacks (seedLacks)
import Features.Check.Scheme (State, flexible)

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
