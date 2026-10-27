-- trusted surface: every diff needs token review; see docs/engineering.md
-- What every expression rule reads (T-R0b §2.4, G-local): the
-- declaration's id, the tables, the signatures and the local
-- environment `Γ`, each local at its generator type (D1 spec §3.2; R0
-- Task 7.1b) and its marked type (amin tranche 1, Task 3). Nothing
-- else: no checker state, substitution, meta counter or solved type is
-- in scope, so no rule can branch on one (§4's applicative invariant;
-- T10). `Recur` is the expression rule itself,
-- passed in so that rule modules need not import one another.
module Features.Check.Generate.Context
  ( Context
  , Local
  , Recur
  , at
  , bindLocal
  , localType
  ) where

import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe)
import Domain.Recorded.Effect (MTy)
import Domain.Recorded.Origin (Path, RuleId)
import Domain.Resolved (Expr, FunctionId, LocalId)
import Features.Check.Generate.Elab (GenTy)
import Features.Check.Generate.Gen (Gen)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Node (Generated)
import Features.Check.Generate.Out (At)

type Context s =
  { decl ∷ FunctionId
  , tables ∷ Tables
  , signatures ∷ Signatures
  , locals ∷ Map LocalId (Local s)
  }

-- A local's generator type and its marked type, bound together.
type Local s = { ty ∷ GenTy s, marked ∷ MTy }

type Recur s = Context s → Path → Expr → Gen s (Generated s)

at ∷ ∀ s. Context s → Path → RuleId → At
at context path rule = { decl: context.decl, path, rule }

bindLocal ∷ ∀ s. LocalId → Local s → Context s → Context s
bindLocal local typed context =
  context { locals = Map.insert local typed context.locals }

localType ∷ ∀ s. Context s → LocalId → Maybe (Local s)
localType context local = Map.lookup local context.locals
