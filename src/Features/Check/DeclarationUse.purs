module Features.Check.DeclarationUse
  ( Use
  , Callee
  , declarationUse
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Domain.Row (closedRow)
import Domain.Type (TyRow)
import Domain.Syntax as Syntax
import Features.Check.Stages (openedRow, stages)
import Domain.Checked.Internal (Open)
import Domain.Resolved (Ty(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Span)
import Domain.Type.Marks (mapMarks)
import Features.Check.MarkUse (instantiateMarks)
import Features.Check.Provenance (Consumed(..))
import Features.Check.Scheme (Scheme, State, Threaded, at, instantiate)

-- One use of a function's or constructor's scheme, its variables
-- instantiated afresh: the parameters (fields) and the result, kept apart
-- so a direct call never builds the curried arrow (plan, linear cost).
-- `consumed` names what a saturated use consumes (design §6); `callee`
-- is the named function it instantiates, for the notes of an argument's
-- rejection: its parameters' spans, and its declaration. `written`: its
-- written parameter types (R005 Tranche B diagnostics R8), if any.
type Use =
  { fields ∷ Array (Ty Open)
  , result ∷ Ty Open
  , scheme ∷ Scheme
  , row ∷ TyRow Open
  , rows ∷ Array (TyRow Open)
  , consumed ∷ Consumed
  , callee ∷ Maybe Callee
  , written ∷ Array Syntax.TypeRef
  }

type Callee =
  { name ∷ String
  , span ∷ Span
  , parameters ∷ Array { name ∷ String, span ∷ Span, rowSpan ∷ Maybe Span }
  , variables ∷ Array String
  , sorts ∷ Array Syntax.Sort
  }

-- Type slots retain their ids; row slots never become type arguments. The
-- mark variables (the second names) each become one meta shared across the
-- signature (FX008 design §3.3).
declarationUse
  ∷ State
  → Array String
  → Array String
  → Array Syntax.Sort
  → Array (Ty Resolved.VarId)
  → Ty Resolved.VarId
  → TyRow Resolved.VarId
  → Threaded Use
declarationUse state variables markNames sorts fields result row =
  { value:
      { fields: map (withMarks <<< at scheme.value) fields
      , result: withMarks (at scheme.value result)
      , scheme: scheme.value { arguments = arguments }
      , row: opened.value
      , rows: staged.value
      , consumed: Application Nothing
      , callee: Nothing
      , written: []
      }
  , state: staged.state
  }
  where
  scheme = instantiate variables state
  marked = instantiateMarks markNames scheme.state
  withMarks ty =
    if Array.null markNames then ty else mapMarks marked.value ty
  instantiated = arrowRow (withMarks (at scheme.value (TFun TUnit row TUnit)))
  opened = openedRow marked.state instantiated
  staged = stages opened.state (Array.length fields) opened.value
  arguments = Array.catMaybes
    (Array.zipWith typeArgument sorts scheme.value.arguments)

-- The row of a one-arrow type.
arrowRow ∷ ∀ v. Ty v → TyRow v
arrowRow (TFun _ found _) = found
arrowRow _ = closedRow

typeArgument ∷ Syntax.Sort → Ty Open → Maybe (Ty Open)
typeArgument Syntax.TypeSort ty = Just ty
typeArgument Syntax.RecordSort ty = Just ty
typeArgument Syntax.RowSort _ = Nothing
