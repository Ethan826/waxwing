module Features.Resolve.Sorts (settledOccurrences, settleDeclarations) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, traverse_)
import Data.Maybe (Maybe(..), maybe, maybe')
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
-- to a fixed point (R001 design §1). A record tail is record evidence for
-- its parameter and a `with` row effect evidence; a parameter passed to
-- another's parameter shares evidence with it, both ways. A parameter with
-- record evidence only is record sort; with none, or with effect evidence,
-- it is effect sort. Then each declaration's own uses must agree with the
-- settled sorts, so a direct effect use that propagation contradicts is
-- diagnosed at the later of the two uses.
settleDeclarations
  ∷ Array Syntax.TypeDecl
  → Either Syntax.Diagnostic (Array Syntax.TypeDecl)
settleDeclarations declarations = agreeing *> Right settled
  where
  hasRow declaration = Array.any isRow declaration.parameters
  settled =
    if Array.any hasRow declarations then withEvidence declarations
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

-- A parameter by declaration and position, with whether the evidence is
-- record (else effect).
type Place = Tuple Int Int

type Evidence = Set.Set (Tuple Place Boolean)

withEvidence ∷ Array Syntax.TypeDecl → Array Syntax.TypeDecl
withEvidence declarations = Array.mapWithIndex settle declarations
  where
  uses = map (ownUses (declaredTypes declarations)) declarations
  indexed = Array.mapWithIndex Tuple declarations
  direct = Set.fromFoldable
    (Array.concat (Array.zipWith written indexed uses))
  edges = Array.concat (Array.zipWith edgesOf indexed uses)
  found = tailRec (spread edges) direct
  written (Tuple index declaration) = Array.mapMaybe
    (evidenceOf index declaration)
  settle index declaration = declaration
    { parameters = Array.mapWithIndex (sorted found index)
        declaration.parameters
    }

position ∷ Syntax.TypeDecl → Occurrence → Maybe Int
position declaration occurrence = Array.findIndex called
  declaration.parameters
  where
  called parameter = parameter.name == occurrence.name

-- What a use written directly (not as another type's argument) shows of
-- its parameter's sort.
evidenceOf
  ∷ Int → Syntax.TypeDecl → Occurrence → Maybe (Tuple Place Boolean)
evidenceOf index declaration occurrence =
  maybe' direct (const Nothing) occurrence.applied
  where
  direct _ = kind occurrence.sort >>= placed
  kind = case _ of
    Syntax.RecordSort → Just true
    Syntax.RowSort → Just false
    Syntax.TypeSort → Nothing
  placed isRecord = map (found isRecord) (position declaration occurrence)
  found isRecord place = Tuple (Tuple index place) isRecord

-- A parameter passed as another type's argument is that parameter's peer.
edgesOf
  ∷ Tuple Int Syntax.TypeDecl → Array Occurrence → Array (Tuple Place Place)
edgesOf (Tuple index declaration) = Array.mapMaybe edge
  where
  edge occurrence = do
    applied ← occurrence.applied
    place ← position declaration occurrence
    pure (Tuple (Tuple index place) (Tuple applied.callee applied.position))

-- Evidence crosses each edge both ways until nothing is new.
spread ∷ Array (Tuple Place Place) → Evidence → Step Evidence Evidence
spread edges evidence =
  if Set.size next == Set.size evidence then Done evidence else Loop next
  where
  next = Set.union evidence
    (Set.fromFoldable (Array.concatMap (carried evidence) edges))

carried ∷ Evidence → Tuple Place Place → Array (Tuple Place Boolean)
carried evidence (Tuple one other) = across one other <> across other one
  where
  across from to = Array.mapMaybe (carry from to) [ true, false ]
  carry from to isRecord =
    if Set.member (Tuple from isRecord) evidence then
      Just (Tuple to isRecord)
    else Nothing

-- Record evidence alone makes a record row; any effect evidence, or
-- none, leaves the written effect row.
sorted
  ∷ Evidence → Int → Int → Syntax.TypeParameter → Syntax.TypeParameter
sorted evidence index at parameter =
  if parameter.sort == Syntax.RowSort && has true && not (has false) then
    parameter { sort = Syntax.RecordSort }
  else parameter
  where
  has isRecord = Set.member (Tuple (Tuple index at) isRecord) evidence

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
