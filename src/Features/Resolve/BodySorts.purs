module Features.Resolve.BodySorts
  ( SignatureSorts
  , signatureSorts
  , bodySorts
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe, fromMaybe, maybe)
import Domain.Syntax as Syntax
import Features.Resolve.Lacking (signatureOccurrences)
import Features.Resolve.Occurrences (Declared, Occurrence, typeOccurrences)
import Features.Resolve.SortConflict (conflict)

-- A signature's variables with the sorts it settled, as the types its
-- body writes see them (R016, R017). The signature's own uses are found
-- only when a body use disagrees.
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

-- A type written in a body reads each of its signature's variables with
-- the sort the signature gave it (R016, R017). A use of another sort is
-- the signature's own sort error at the body's use, the later use being
-- the error (Resolve.SortConflict `conflict`): one row sort read as the
-- other is noted at the signature's first use of the variable; a row read
-- as a type, or a type as a row, has no note. The first in source order
-- is reported.
bodySorts ∷ SignatureSorts → Syntax.TypeRef → Either Syntax.Diagnostic Unit
bodySorts signature reference = traverse_ conflictAt
  ( Array.head
      ( Array.sortWith offset
          ( Array.filter (crossed signature)
              (typeOccurrences signature.declared reference)
          )
      )
  )
  where
  offset occurrence = occurrence.span.start.offset
  conflictAt occurrence = Left
    (conflict occurrence (firstUse occurrence))
  -- Every signature variable is written in the signature, so the
  -- fallback, the use read with the settled sort, is never taken.
  firstUse occurrence = fromMaybe (settledAs occurrence)
    ( Array.head
        ( Array.sortWith offset
            (Array.filter (named occurrence) (writtenUses signature))
        )
    )
  settledAs occurrence = occurrence
    { sort = fromMaybe occurrence.sort (settled signature occurrence) }
  named occurrence found = found.name == occurrence.name

-- A use naming a signature variable of another sort.
crossed ∷ SignatureSorts → Occurrence → Boolean
crossed signature occurrence = maybe false differs
  (settled signature occurrence)
  where
  differs sort = sort /= occurrence.sort

-- The sort the signature settled for the variable a use names.
settled ∷ SignatureSorts → Occurrence → Maybe Syntax.Sort
settled signature occurrence =
  Array.elemIndex occurrence.name signature.variables
    >>= Array.index signature.sorts

writtenUses ∷ SignatureSorts → Array Occurrence
writtenUses signature = signatureOccurrences signature.declared
  signature.function
