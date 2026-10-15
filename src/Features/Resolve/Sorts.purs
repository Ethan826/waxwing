module Features.Resolve.Sorts (settleDeclarations) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Map as Map
import Data.Set (Set)
import Data.Tuple (Tuple(..))
import Data.Maybe (Maybe(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences
  ( Declared
  , Occurrence
  , typeOccurrences
  )
import Features.Resolve.RecordArguments (subtypes)
import Features.Resolve.RowSettle (Known, Place, settledPlaces)
import Features.Resolve.SortCheck
  ( Use
  , declarationUses
  , givenArgument
  , settledUses
  )
import Features.Resolve.SortConflict (conflict, settledOccurrences)
import Features.Resolve.TypeIndices (TypeIndices)

-- Without a record type written in a declaration, no use has record sort:
-- every row parameter stays an effect row, and no two uses can disagree,
-- so the declarations are settled as written, without the walks (a
-- program of n types without records paid them for nothing, T007).
settleDeclarations
  ∷ TypeIndices
  → Array Syntax.TypeDecl
  → Either Syntax.Diagnostic (Array Syntax.TypeDecl)
settleDeclarations indices declarations =
  rowsAsTypes indices declarations *> settling
  where
  settling =
    if Array.any recordWritten declarations then
      settledAll indices declarations
    else Right declarations

-- Whether a record type is written anywhere in a declaration's fields.
recordWritten ∷ Syntax.TypeDecl → Boolean
recordWritten declaration = Array.any isRecord
  (Array.concatMap subtypes (Array.concatMap ctorFields declaration.ctors))
  where
  ctorFields ctor = ctor.fields
  isRecord = case _ of
    Syntax.RecordRef _ _ _ → true
    _ → false

-- A row parameter written as a type, `type T(...e) = T(e)`, is the sort
-- error at that use, as the same mistake in a signature (R015). Only
-- declarations with a row parameter are walked.
rowsAsTypes
  ∷ TypeIndices → Array Syntax.TypeDecl → Either Syntax.Diagnostic Unit
rowsAsTypes indices declarations = traverse_ (misusedIn declared)
  (Array.filter hasRowParameter declarations)
  where
  declared = declaredTypes indices declarations
  hasRowParameter declaration = Array.any rowParameter
    declaration.parameters

rowParameter ∷ Syntax.TypeParameter → Boolean
rowParameter parameter = parameter.sort /= Syntax.TypeSort

misusedIn ∷ Declared → Syntax.TypeDecl → Either Syntax.Diagnostic Unit
misusedIn declared declaration = traverse_ misused
  (Array.sortWith offset (Array.filter typeUse (ownUses declared declaration)))
  where
  typeUse occurrence = occurrence.sort == Syntax.TypeSort
  offset occurrence = occurrence.span.start.offset
  misused occurrence = traverse_ (clash occurrence)
    (Array.find (named occurrence) declaration.parameters)
  named occurrence parameter = parameter.name == occurrence.name
    && rowParameter parameter
  clash occurrence parameter = Left
    ( conflict occurrence
        (occurrence { sort = parameter.sort, span = parameter.span })
    )

-- Row parameters of the declarations take the sort their uses give them
-- (R001 design §1); RowSettle.settledPlaces solves them. Then every use of
-- a row variable is checked against its settled sort, in one place: a
-- declaration's own uses must agree, the first fixing the sort, with the
-- error at the later use noted at the first; arguments to a parameter its
-- callers gave a sort must agree with that sort (SortCheck.settledUses).
settledAll
  ∷ TypeIndices
  → Array Syntax.TypeDecl
  → Either Syntax.Diagnostic (Array Syntax.TypeDecl)
settledAll indices declarations =
  traverse_ (checked settled.given everything)
    (Array.zip (Array.zip final uses) perDeclaration) $> final
  where
  settled = settledPlaces declarations
    (map (ownUses (declaredTypes indices declarations)) declarations)
  final = Array.mapWithIndex (record settled.known) declarations
  uses = map (ownUses (declaredTypes indices final)) final
  perDeclaration = Array.mapWithIndex usesAt (Array.zip final uses)
  usesAt index (Tuple declaration found) =
    declarationUses index declaration found
  everything = Array.concat perDeclaration
  record known index declaration = declaration
    { parameters = Array.mapWithIndex (sorted known index)
        declaration.parameters
    }

sorted
  ∷ Known
  → Int
  → Int
  → Syntax.TypeParameter
  → Syntax.TypeParameter
sorted known index position parameter =
  if parameter.sort == Syntax.RowSort && isRecord then
    parameter { sort = Syntax.RecordSort }
  else parameter
  where
  isRecord = Map.lookup (Tuple index position) known == Just true

-- `indices` are the declarations' (TypeIndices), built once.
declaredTypes ∷ TypeIndices → Array Syntax.TypeDecl → Declared
declaredTypes indices declarations =
  { indices, sorts: map sorts declarations }
  where
  sorts declaration = map sortOf declaration.parameters
  sortOf parameter = parameter.sort

-- The uses of a declaration's own parameters in its constructor fields.
ownUses ∷ Declared → Syntax.TypeDecl → Array Occurrence
ownUses declared declaration = Array.filter own
  (Array.concatMap (typeOccurrences declared) fields)
  where
  fields = Array.concatMap ctorFields declaration.ctors
  ctorFields ctor = ctor.fields
  own occurrence = Array.any (called occurrence) declaration.parameters
  called occurrence parameter = parameter.name == occurrence.name

checked
  ∷ Set Place
  → Array Use
  → Tuple (Tuple Syntax.TypeDecl (Array Occurrence)) (Array Use)
  → Either Syntax.Diagnostic Unit
checked given everything (Tuple (Tuple declaration found) mine) =
  consistent given declaration found *> settledUses given everything mine

-- A declaration's uses of its row parameters must agree: the first use
-- fixes the sort. An argument to a parameter its callers gave a sort is
-- left to SortCheck. A record tail may not name a type parameter.
consistent
  ∷ Set Place
  → Syntax.TypeDecl
  → Array Occurrence
  → Either Syntax.Diagnostic Unit
consistent given declaration uses = traverse_ misused records
  *> void (settledOccurrences rowUses)
  where
  records = Array.filter (isSort Syntax.RecordSort) uses
  isSort sort occurrence = occurrence.sort == sort
  rowUses = Array.sortWith offset (Array.filter rowUse uses)
  rowUse occurrence = occurrence.sort /= Syntax.TypeSort
    && not (givenArgument given occurrence)
  offset occurrence = occurrence.span.start.offset
  misused occurrence = traverse_ (clash occurrence)
    (Array.find (called occurrence) declaration.parameters)
  called occurrence parameter = parameter.name == occurrence.name
    && parameter.sort == Syntax.TypeSort
  clash occurrence parameter = Left
    ( conflict occurrence
        (occurrence { sort = Syntax.TypeSort, span = parameter.span })
    )
