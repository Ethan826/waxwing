module Features.Check.Install (install) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..))
import Data.Map as Map
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Row
  ( HandlerRows
  , Label(..)
  , Mark(..)
  , Row(..)
  , clauseRow
  , normalMark
  , withMark
  )
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty, TyRow)
import Features.Check.ClauseBody (HandlerEnv)
import Features.Check.Consume (consumeIgnoring)
import Features.Check.Context (Infer, Locals)
import Features.Check.Provenance (Boundary(Installation), Consumed(Application))
import Features.Check.Restricted (registerInstallation)
import Features.Check.RowName (labelName)
import Features.Check.Scheme (State, Threaded, flexible)
import Features.Check.Unify (Flex, Subst(..))

-- `with h { body }` (design §3.4), `h : Handler(m L with R | C)`, under the
-- current row ρ. R is unified with ρ, ignoring marks. The body is checked
-- against `f L + ρ`, f a fresh frame mark (N for Console), and the
-- installation is registered: from then on settling pairs C with ρ's labels
-- (each takes its arguments from R, `Lend.lend`, and pairs by key without
-- unifying them, so a bare `Fail(Job)` never meets `Fail(Job(Int))`), and
-- the tail pass sees C's rigid tail. The frame's constraints are Task 9's.
--
-- Nothing here allocates from `state.next`: the installation is numbered by
-- the registry's size and the frame comes from the mark store's own counter,
-- so no later meta is renumbered. C is not consumed here: a consumption
-- would draw a throwaway tail from `state.next` and rename the row's tail,
-- which the checked IR shows for an unsolved tail. R already holds every
-- label C does, so settling only has marks to record (`Lend.assume`).
install
  ∷ ∀ r
  . Infer (locals ∷ Locals | r)
  → HandlerEnv r
  → State
  → Span
  → Checked.Expr
  → Label (Ty Open)
  → HandlerRows (Ty Open) Open
  → Resolved.Expr
  → Either Diagnostic (Threaded Checked.Expr)
install infer env state span handlerValue label rows body = do
  installed ← labelName env span (flexLabel label)
  reached ← consumeIgnoring env state
    { origin:
        { span, consumed: Application, via: Just (Installation installed) }
    , stage: rows.inference
    , target: env.current
    }
  let Tuple frame framed = frameOf label reached
  bodyValue ← infer (installing frame) (registered frame framed) body
  pure
    { value: Checked.Expr
        { ty: Checked.typeOf bodyValue.value
        , span
        , node: Checked.With handlerValue bodyValue.value
        }
    , state: bodyValue.state
    }
  where
  Label _ _ own = label
  installing frame = env
    { current = prepend (withMark frame label) env.current
    , sites = Array.cons { span, count: 1 } env.sites
    }
  registered frame framed = framed
    { restricted = registerInstallation
        (Map.size framed.restricted.installations)
        { span
        , label
        , own
        , frame
        , inference: rows.inference
        , clauses: clauseRow rows
        , current: env.current
        , sites: env.sites
        , matched: 0
        }
        framed.restricted
    }

-- The frame's mark: N for Console, unmarked for Fail, else a fresh meta from
-- the mark store's counter, which counts down apart from every other meta.
frameOf ∷ Label (Ty Open) → State → Tuple Mark State
frameOf (Label effect _ _) state = case state.subst of
  Subst bindings → Tuple (normalMark effect (MarkMeta bindings.marks.fresh))
    state
      { subst = Subst bindings
          { marks = bindings.marks { fresh = bindings.marks.fresh - 1 } }
      }

flexLabel ∷ Label (Ty Open) → Label (Ty Flex)
flexLabel (Label effect arguments mark) = Label effect
  (map flexible arguments)
  mark

prepend ∷ Label (Ty Open) → TyRow Open → TyRow Open
prepend label (Row labels tail) = Row (Array.cons label labels) tail
