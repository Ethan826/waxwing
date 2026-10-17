module Features.Check.UseFacts (seededUse, requiredUse) where

import Prelude
import Domain.Checked.Internal (Open)
import Domain.Resolved (Ty(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (TyRow, VarId(..))
import Features.Check.Context (CheckEnv)
import Features.Check.Scheme (Scheme, Threaded)
import Features.Check.Seed (required, seeded)
import Features.Check.Unify (Flex(Meta))

-- What one use of a scheme types: its parameters (fields), result and row.
type Typed r =
  { fields ∷ Array (Ty Open), result ∷ Ty Open, row ∷ TyRow Open | r }

-- The use's state with what its types say their record tails lack.
seededUse
  ∷ ∀ r e
  . CheckEnv e
  → Array Syntax.Sort
  → Threaded (Typed r)
  → Threaded (Typed r)
seededUse env sorts use = use { state = seeded env sorts types use.state }
  where
  types = use.value.fields
    <> [ use.value.result, TFun TUnit use.value.row TUnit ]

-- R005 design §2: the use's metas lack what the callee's `where` clauses
-- say, after what its types imply (Features.Check.Seed `required`).
requiredUse
  ∷ ∀ r
  . Array Resolved.Requirement
  → Threaded { scheme ∷ Scheme | r }
  → Threaded { scheme ∷ Scheme | r }
requiredUse constraints use = use
  { state = required metaOf constraints use.state }
  where
  metaOf (VarId index) = Meta (use.value.scheme.base + index)
