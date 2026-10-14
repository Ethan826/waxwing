module Format.Parse.Chain (Segment, combined, unexpectedRow) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , Position
  , RowRef(..)
  , Span
  , TypeRef(..)
  , problemAt
  )
import Format.Parse.Row (refuseBindings)

-- What one `->` separates: an operand, or a parenthesized list of types.
type Segment =
  { span ∷ Span
  , types ∷ NonEmptyArray TypeRef
  , row ∷ Maybe RowRef
  }

-- A parameter type and where its segment starts.
type Parameter =
  { start ∷ Position, ty ∷ TypeRef, row ∷ Maybe RowRef }

-- Each arrow spans its parameter's segment through the chain's end; a
-- lone type keeps its own span, parenthesized or not.
folded ∷ { init ∷ Array Segment, last ∷ Segment } → TypeRef
folded chain = Array.foldr arrow (NonEmptyArray.last chain.last.types)
  ( Array.concat
      ( Array.zipWith annotated chain.init
          (Array.drop 1 chain.init <> [ chain.last ])
      ) <> lastParameters
  )
  where
  end = chain.last.span.end
  lastParameters = map (startingAt chain.last.span.start)
    (NonEmptyArray.init chain.last.types)
  arrow parameter result =
    FunRef { start: parameter.start, end } parameter.ty parameter.row result
  annotated before after = setLast after.row (parameters before)
  setLast row found = fromMaybe found
    (Array.modifyAt (Array.length found - 1) (withRow row) found)
  withRow row parameter = parameter { row = row }

parameters ∷ Segment → Array Parameter
parameters found = map (startingAt found.span.start)
  (NonEmptyArray.toArray found.types)

startingAt ∷ Position → TypeRef → Parameter
startingAt start ty = { start, ty, row: Nothing }

-- A row follows the chain's last segment: it is the signature's row for a
-- lone type, or the final arrow's row. Only the first segment of an arrow
-- chain has no arrow before it, so a row there would be dropped; reject it.
combined
  ∷ { init ∷ Array Segment, last ∷ Segment }
  → Either Diagnostic { ty ∷ TypeRef, row ∷ Maybe RowRef }
combined chain = maybe' bound unexpectedRow (leadingRow chain)
  where
  bound _ = traverse_ refuseBindings arrowRows *> merged chain unit
  -- Only a lone type's row is the signature's own (see `merged`).
  arrowRows = Array.mapMaybe segmentRow
    (if Array.null chain.init then [] else Array.snoc chain.init chain.last)

-- The row written on the chain's first segment, if there is an arrow after it.
leadingRow ∷ { init ∷ Array Segment, last ∷ Segment } → Maybe RowRef
leadingRow chain = maybe' (const Nothing) segmentRow (Array.head chain.init)

merged
  ∷ { init ∷ Array Segment, last ∷ Segment }
  → Unit
  → Either Diagnostic { ty ∷ TypeRef, row ∷ Maybe RowRef }
merged chain _ = Right
  { ty: folded chain
  , row: if Array.null chain.init then chain.last.row else Nothing
  }

segmentRow ∷ Segment → Maybe RowRef
segmentRow found = found.row

-- A row with no meaning where it was written is an error, never dropped.
unexpectedRow ∷ ∀ a. RowRef → Either Diagnostic a
unexpectedRow (RowRef span _ _) = Left
  (problemAt (Syntax "Unexpected effect row") span)
