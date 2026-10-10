module Features.Resolve.Marks
  ( MarkVariableRef
  , arrowRows
  , markVariableRefs
  , rowMarkVariableRefs
  , signatureMarkVariables
  , refuseMarkVariables
  , scopedMarkVariables
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (mapAccumL)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Syntax as Syntax

-- One written `nofail(k)`: the name and where the mark is (FX008 design
-- §3.2). Mark variables are a sort of their own, apart from type variables.
type MarkVariableRef = { name ∷ String, span ∷ Syntax.Span }

-- Every `nofail(k)` in a written type, in the order its parts are read:
-- an arrow's parameters, its result, then the rows of its arrows. Spines
-- are walked by a loop; recursion enters only parameters, arguments and
-- label arguments, which the parser's nesting limit bounds.
markVariableRefs ∷ Syntax.TypeRef → Array MarkVariableRef
markVariableRefs = case _ of
  Syntax.NamedRef _ _ arguments → Array.concatMap argumentRefs arguments
  Syntax.THandlerRef _ label row → labelRefs label
    <> maybe [] rowMarkVariableRefs row
  arrow@(Syntax.FunRef _ _ _ _) → spineRefs arrow
  _ → []

rowMarkVariableRefs ∷ Syntax.RowRef → Array MarkVariableRef
rowMarkVariableRefs (Syntax.RowRef _ labels _) =
  Array.concatMap labelRefs labels

-- The distinct mark variables of a function's signature, by first
-- occurrence: its parameters, its result, then its own row.
signatureMarkVariables
  ∷ Array Syntax.TypeRef → Maybe Syntax.RowRef → Array String
signatureMarkVariables types row = Array.nub (map named refs)
  where
  refs = Array.concatMap markVariableRefs types
    <> maybe [] rowMarkVariableRefs row
  named reference = reference.name

-- E_TYPE at the first mark variable where none may be written: type and
-- effect declarations (FX008 L6).
refuseMarkVariables
  ∷ Array MarkVariableRef → Either Syntax.Diagnostic Unit
refuseMarkVariables refs = maybe (Right unit) refused (earliest refs)
  where
  refused found = Left
    ( Syntax.problemAt (MarkVariableOutsideSignature found.name)
        found.span
    )

-- E_UNBOUND at the first mark variable the enclosing signature does not
-- name: a lambda annotation sees only that signature's.
scopedMarkVariables
  ∷ Array String → Array MarkVariableRef → Either Syntax.Diagnostic Unit
scopedMarkVariables names refs = maybe (Right unit) unbound
  (earliest (Array.filter outside refs))
  where
  outside reference = not (Array.elem reference.name names)
  unbound found = Left
    ( Syntax.problemAt (Unbound UnboundMarkVariable found.name) found.span
    )

earliest ∷ Array MarkVariableRef → Maybe MarkVariableRef
earliest refs = Array.head (Array.sortWith offset refs)
  where
  offset reference = reference.span.start.offset

argumentRefs ∷ Syntax.TypeArgument → Array MarkVariableRef
argumentRefs = case _ of
  Syntax.TypeArgument reference → markVariableRefs reference
  Syntax.RowArgument row → rowMarkVariableRefs row

labelRefs ∷ Syntax.LabelRef → Array MarkVariableRef
labelRefs label = ownRefs <> Array.concatMap markVariableRefs label.arguments
  where
  -- Console is N whatever is written (design §3.3), so its mark variable
  -- names nothing.
  ownRefs = if label.name == "Console" then [] else maybe [] ownRef label.mark
  ownRef = case _ of
    Syntax.NofailVariableRef span name → [ { name, span } ]
    Syntax.NofailRef _ → []

-- An arrow chain's parameters, its final result, then each arrow's row.
spineRefs ∷ Syntax.TypeRef → Array MarkVariableRef
spineRefs arrow =
  Array.concatMap markVariableRefs
    (Array.snoc spine.parameters spine.result)
    <> Array.concatMap (maybe [] rowMarkVariableRefs) (arrowRows arrow)
  where
  spine = Syntax.typeRefSpine arrow

-- The row written on each arrow of a chain, in order, by two loops (as
-- `Syntax.typeRefSpine`): one counts the arrows, one takes their rows.
arrowRows ∷ Syntax.TypeRef → Array (Maybe Syntax.RowRef)
arrowRows reference = taken.value
  where
  count = tailRec counted (Tuple 0 reference)
  counted (Tuple found rest) = case rest of
    Syntax.FunRef _ _ _ more → Loop (Tuple (found + 1) more)
    _ → Done found
  taken = mapAccumL take reference (Array.replicate count unit)
  take rest _ = case rest of
    Syntax.FunRef _ _ row more → { accum: more, value: row }
    settled → { accum: settled, value: Nothing }
