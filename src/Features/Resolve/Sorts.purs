module Features.Resolve.Sorts (settledOccurrences, settleDeclarations) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, traverse_)
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences
  ( Declared
  , Occurrence
  , typeOccurrences
  )

-- The variables of a scope with their sorts, in first-occurrence order. A
-- variable has one sort, fixed by its first use; a later use of another
-- sort is diagnosed at that use. Two row sorts name the first use in a
-- note; a type against a row is the plain sort error (R001 design §1).
settledOccurrences
  ∷ Array Occurrence
  → Either Syntax.Diagnostic (Array { name ∷ String, sort ∷ Syntax.Sort })
settledOccurrences occurrences = map (map named) found
  where
  found = foldM insert [] (Array.sortWith offset occurrences)
  offset occurrence = occurrence.span.start.offset
  named occurrence = { name: occurrence.name, sort: occurrence.sort }
  insert before occurrence = maybe (Right (Array.snoc before occurrence))
    (same before occurrence)
    (Array.find (matching occurrence.name) before)
  matching name entry = entry.name == name
  same before occurrence previous
    | occurrence.sort == previous.sort = Right before
    | otherwise = Left (conflict occurrence previous)

conflict ∷ Occurrence → Occurrence → Syntax.Diagnostic
conflict occurrence previous = case occurrence.sort, previous.sort of
  Syntax.RowSort, Syntax.RecordSort → noted (RecordRowAsEffect name)
  Syntax.RecordSort, Syntax.RowSort → noted (EffectRowAsRecord name)
  _, _ → Syntax.problemAt (RowSort (occurrence.sort /= Syntax.TypeSort))
    occurrence.span
  where
  name = occurrence.name
  noted problem =
    { problem
    , span: occurrence.span
    , related: [ { span: previous.span, reason: Syntax.FirstWrittenHere } ]
    }

-- Row parameters of the declarations take the sort their uses give them,
-- to a fixed point (R001 design §1): a record tail makes the parameter
-- record sort, and a parameter passed to a record parameter, or receiving
-- one, shares its sort. A parameter no use constrains stays effect sort.
-- Then each declaration's own uses must agree with the settled sorts.
settleDeclarations
  ∷ Array Syntax.TypeDecl
  → Either Syntax.Diagnostic (Array Syntax.TypeDecl)
settleDeclarations declarations = agreeing *> Right settled
  where
  hasRow declaration = Array.any isRow declaration.parameters
  settled =
    if Array.any hasRow declarations then tailRec round declarations
    else declarations
  agreeing = traverse_ (consistent (declaredTypes settled)) settled

isRow ∷ Syntax.TypeParameter → Boolean
isRow parameter = parameter.sort /= Syntax.TypeSort

declaredTypes ∷ Array Syntax.TypeDecl → Declared
declaredTypes = map declared
  where
  declared declaration =
    { name: declaration.name, sorts: map sortOf declaration.parameters }
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

round
  ∷ Array Syntax.TypeDecl
  → Step (Array Syntax.TypeDecl) (Array Syntax.TypeDecl)
round declarations =
  if recordCount next == recordCount declarations then Done declarations
  else Loop next
  where
  uses = map (ownUses (declaredTypes declarations)) declarations
  records = map recordNames uses
  passed = Set.fromFoldable (Array.concat (Array.zipWith passedOn records uses))
  next = Array.mapWithIndex (promoted records passed) declarations

recordNames ∷ Array Occurrence → Array String
recordNames uses = map name (Array.filter isRecord uses)
  where
  isRecord occurrence = occurrence.sort == Syntax.RecordSort
  name occurrence = occurrence.name

-- The callee parameters that receive a record-sort variable.
passedOn
  ∷ Array String → Array Occurrence → Array (Tuple Int Int)
passedOn records uses = Array.mapMaybe place uses
  where
  place occurrence = occurrence.applied >>= receiving occurrence
  receiving occurrence found =
    if Array.elem occurrence.name records then
      Just (Tuple found.callee found.position)
    else Nothing

promoted
  ∷ Array (Array String)
  → Set.Set (Tuple Int Int)
  → Int
  → Syntax.TypeDecl
  → Syntax.TypeDecl
promoted records passed index declaration = declaration
  { parameters = Array.mapWithIndex promote declaration.parameters }
  where
  names = fromMaybe [] (Array.index records index)
  promote position parameter =
    if parameter.sort == Syntax.RowSort && recordUse position parameter then
      parameter { sort = Syntax.RecordSort }
    else parameter
  recordUse position parameter = Array.elem parameter.name names
    || Set.member (Tuple index position) passed

recordCount ∷ Array Syntax.TypeDecl → Int
recordCount declarations = Array.length
  (Array.filter isRecord (Array.concatMap parametersOf declarations))
  where
  parametersOf declaration = declaration.parameters
  isRecord parameter = parameter.sort == Syntax.RecordSort

-- A declaration's uses of its row parameters must agree: the first use
-- fixes the sort. A record tail may not name a type parameter.
consistent ∷ Declared → Syntax.TypeDecl → Either Syntax.Diagnostic Unit
consistent declared declaration = traverse_ misused records
  *> void (settledOccurrences (Array.filter rowUse uses))
  where
  uses = ownUses declared declaration
  records = Array.filter (isSort Syntax.RecordSort) uses
  isSort sort occurrence = occurrence.sort == sort
  rowUse occurrence = occurrence.sort /= Syntax.TypeSort
  misused occurrence = traverse_ (clash occurrence)
    (Array.find (called occurrence) declaration.parameters)
  called occurrence parameter = parameter.name == occurrence.name
    && parameter.sort == Syntax.TypeSort
  clash occurrence parameter = Left
    ( conflict occurrence
        (occurrence { sort = Syntax.TypeSort, span = parameter.span })
    )
