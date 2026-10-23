-- What every expression rule reads (T-R0b §2.4, G-local): the
-- declaration's id, the tables, the signatures and the local
-- environment `Γ`. Nothing else: no checker state, substitution, meta
-- counter or solved type is in scope, so no rule can branch on one (§4's
-- applicative invariant). `Recur` is the expression rule itself, passed
-- in so that rule modules need not import one another.
module Features.Check.Generate.Context
  ( Context
  , Recur
  , at
  , bindLocal
  , localType
  ) where

import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe)
import Domain.Recorded.Atom (RTExpr)
import Domain.Recorded.Origin (Path, RuleId)
import Domain.Resolved (Expr, FunctionId, LocalId)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Out (At, Generated)

type Context =
  { decl ∷ FunctionId
  , tables ∷ Tables
  , signatures ∷ Signatures
  , locals ∷ Map LocalId RTExpr
  }

type Recur = Context → Path → Expr → Generated

at ∷ Context → Path → RuleId → At
at context path rule = { decl: context.decl, path, rule }

bindLocal ∷ LocalId → RTExpr → Context → Context
bindLocal local ty context =
  context { locals = Map.insert local ty context.locals }

localType ∷ Context → LocalId → Maybe RTExpr
localType context local = Map.lookup local context.locals
