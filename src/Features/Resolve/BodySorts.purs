module Features.Resolve.BodySorts
  ( SignatureSorts
  , signatureSorts
  , bodySorts
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax as Syntax
import Features.Resolve.Lacking (signatureOccurrences)
import Features.Resolve.Occurrences (Declared, Occurrence, typeOccurrences)
import Features.Resolve.SortConflict (misread)

-- A signature's row variables with the sorts it settled, as the types its
-- body writes see them (R016). The signature's own uses are found only
-- for a note, when a body use disagrees.
type SignatureSorts =
  { declared ∷ Declared
  , function ∷ Syntax.FunctionDecl
  , variables ∷ Array String
  , sorts ∷ Array Syntax.Sort
  }

signatureSorts
  ∷ Declared
  → Syntax.FunctionDecl
  → Array String
  → Array Syntax.Sort
  → SignatureSorts
signatureSorts declared function variables sorts =
  { declared, function, variables, sorts }

-- A type written in a body reads each of its signature's row variables
-- with the sort the signature gave it: reading an effect row as a record
-- row, or the reverse, is the signature's own sort error at the body's
-- use, noted at the signature's first use of the variable (the later use
-- is the error, Resolve.SortConflict). The first in source order is
-- reported. A type against a row is left to resolution and checking.
bodySorts ∷ SignatureSorts → Syntax.TypeRef → Either Syntax.Diagnostic Unit
bodySorts signature reference = traverse_ misreadAt
  ( Array.head
      ( Array.sortWith offset
          ( Array.filter (crossed signature)
              (typeOccurrences signature.declared reference)
          )
      )
  )
  where
  offset occurrence = occurrence.span.start.offset
  misreadAt occurrence = Left
    (misread (opposite occurrence.sort) occurrence (firstUse occurrence))
  firstUse occurrence = Array.head
    ( Array.sortWith offset
        (Array.filter (named occurrence) (writtenUses signature))
    )
  named occurrence found = found.name == occurrence.name

-- A use of one row sort naming a signature variable of the other.
crossed ∷ SignatureSorts → Occurrence → Boolean
crossed signature occurrence = rowSort occurrence.sort
  && maybe false crosses
    (Array.elemIndex occurrence.name signature.variables)
  where
  crosses index = Array.index signature.sorts index
    == Just (opposite occurrence.sort)

rowSort ∷ Syntax.Sort → Boolean
rowSort sort = sort == Syntax.RowSort || sort == Syntax.RecordSort

opposite ∷ Syntax.Sort → Syntax.Sort
opposite sort =
  if sort == Syntax.RecordSort then Syntax.RowSort else Syntax.RecordSort

writtenUses ∷ SignatureSorts → Array Occurrence
writtenUses signature = signatureOccurrences signature.declared
  signature.function
