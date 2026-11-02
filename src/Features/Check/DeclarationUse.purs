module Features.Check.DeclarationUse
  ( Use
  , Callee
  , Allocated
  , declarationUse
  , traced
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Row (Mark(..), Row(..), closedRow, openRow)
import Domain.Type (TyRow)
import Domain.Syntax as Syntax
import Features.Check.Stages (openedRow, stages)
import Domain.Checked.Internal (Open(..))
import Domain.Resolved (Ty(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Span)
import Domain.Type.Marks (mapMarks)
import Features.Check.MarkUse (instantiateMarks)
import Features.Check.Provenance (Consumed(..))
import Features.Check.Scheme (Scheme, State, Threaded, at, instantiate)
import Features.Check.Trace (Slot(..), recordUse)

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
  , allocated ∷ Allocated
  }

-- What `declarationUse` allocated, for the trace (tranche 2 design
-- §C.1): every variable's slot (rows included, which `scheme.arguments`
-- drops), each mark name's meta, the tail `openedRow` minted if the
-- callee's row was closed, and the stages before the last.
type Allocated =
  { slots ∷ Array Slot
  , marks ∷ Array (Tuple String Mark)
  , opened ∷ Maybe (TyRow Open)
  , stages ∷ Array (TyRow Open)
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
      , allocated:
          { slots: Array.zipWith slotOf sorts scheme.value.arguments
          , marks: map markOf markNames
          , opened: minted
          , stages: Array.dropEnd 1 staged.value
          }
      }
  , state: staged.state
  }
  where
  scheme = instantiate variables state
  markOf name = Tuple name (marked.value (MarkVariable name))
  minted =
    if opened.state.next == marked.state.next then Nothing
    else Just (tailOf opened.value)
  marked = instantiateMarks markNames scheme.state
  withMarks ty =
    if Array.null markNames then ty else mapMarks marked.value ty
  instantiated = arrowRow (withMarks (at scheme.value (TFun TUnit row TUnit)))
  opened = openedRow marked.state instantiated
  staged = stages opened.state (Array.length fields) opened.value
  arguments = Array.catMaybes
    (Array.zipWith typeArgument sorts scheme.value.arguments)

-- A use's allocated values appended to its state's trace at `span`,
-- with its final fields and result (design §C.6).
traced ∷ Span → Threaded Use → Threaded Use
traced span use = use
  { state = use.state
      { trace = recordUse span entry use.state.trace }
  }
  where
  entry =
    { slots: use.value.allocated.slots
    , marks: use.value.allocated.marks
    , opened: use.value.allocated.opened
    , stages: use.value.allocated.stages
    , fields: use.value.fields
    , result: use.value.result
    }

-- The row of a one-arrow type.
arrowRow ∷ ∀ v. Ty v → TyRow v
arrowRow (TFun _ found _) = found
arrowRow _ = closedRow

-- A row variable's meta is a row's tail; any other variable's a type.
-- `instantiate` makes every slot a meta, so the second case only takes
-- non-row variables.
slotOf ∷ Syntax.Sort → Ty Open → Slot
slotOf Syntax.RowSort (TVar (Hole meta)) = RowSlot (openRow (Hole meta))
slotOf _ ty = TypeSlot ty

-- A row's tail alone.
tailOf ∷ ∀ v. TyRow v → TyRow v
tailOf (Row _ tail) = Row [] tail

typeArgument ∷ Syntax.Sort → Ty Open → Maybe (Ty Open)
typeArgument Syntax.TypeSort ty = Just ty
typeArgument Syntax.RecordSort ty = Just ty
typeArgument Syntax.RowSort _ = Nothing
