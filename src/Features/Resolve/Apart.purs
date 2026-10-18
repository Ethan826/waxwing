module Features.Resolve.Apart
  ( Held
  , Names
  , apartFrom
  , clashingArguments
  , heldTails
  , repeatedTails
  , signatureTypes
  , disjointIn
  , joinedPairs
  , withJoined
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Problem (DuplicateKind(..), Hint(..), Problem(..))
import Domain.Resolved (TypeId(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (VarId(..))
import Features.Resolve.ArgumentGraph (ArgumentGraph, heldTogether)
import Features.Resolve.ArgumentPairs (pairsOf)
import Features.Resolve.RecordArguments
  ( RecordArgument
  , namedArguments
  , subtypes
  )
import Features.Resolve.TypeIndices (Indexed)

-- R005 Tranche B: which tails of a written type sit in one record, and so
-- must be disjoint. The tails of a record written `{ ...r, ...s }`, and
-- the tails given to two record parameters a declaration writes into one
-- record, `Both(...r, ...s)` (Features.Resolve.ArgumentPairs).
type Names r =
  Indexed (ctors ∷ Array Resolved.CtorInfo, argumentGraph ∷ ArgumentGraph | r)

-- Two tails written into one record, the earlier first.
type Held = { first ∷ Syntax.RecordTail, second ∷ Syntax.RecordTail }

-- Every pair of tails a type writes into one record, in source order.
heldTails ∷ ∀ r. Names r → Syntax.TypeRef → Array Held
heldTails tables reference = Array.sortWith start
  (Array.concatMap (heldIn tables) (subtypes reference))
  where
  start held = held.second.span.start.offset

heldIn ∷ ∀ r. Names r → Syntax.TypeRef → Array Held
heldIn tables = case _ of
  Syntax.RecordRef _ _ tails → map held (pairsOf tails)
  reference → Array.concatMap tailsOf (heldArguments tables reference)
  where
  held (Tuple first second) = { first, second }
  tailsOf (Tuple one other) = map held
    (Array.concatMap (against other) one.tails)
  against other tail = map (Tuple tail) other.tails

-- Record arguments of one `Name(…)` that the declaration writes into one
-- record, the earlier argument first.
heldArguments
  ∷ ∀ r
  . Names r
  → Syntax.TypeRef
  → Array (Tuple RecordArgument RecordArgument)
heldArguments tables reference = Array.filter together
  (pairsOf (namedArguments tables reference))
  where
  together (Tuple one other) =
    one.position /= other.position && heldTogether tables.argumentGraph
      (Tuple one.callee one.position)
      (Tuple other.callee other.position)

-- A tail written twice into one record (D8, approved 2026-10-17), through
-- a declared type as in `Pair(...a, ...a)`; the same tail twice in one
-- written record is refused where the record is resolved. At the second,
-- noted `first written here`.
repeatedTails ∷ ∀ r. Names r → Syntax.TypeRef → Either Syntax.Diagnostic Unit
repeatedTails tables reference = traverse_ refused
  (Array.find same (heldTails tables reference))
  where
  same held = held.first.name == held.second.name
  refused held = Left
    { problem: RepeatedTail held.second.name
    , span: held.second.span
    , related: [ { span: held.first.span, reason: Syntax.FirstWrittenHere } ]
    }

-- A label two record arguments of one declared type both write, where the
-- declaration writes the two parameters into one record: `Duplicate field
-- x` at the later, as for a label the declaration writes (R012).
clashingArguments
  ∷ ∀ r. Names r → Syntax.TypeRef → Either Syntax.Diagnostic Unit
clashingArguments tables reference = traverse_ refused
  (Array.findMap clash (heldArguments tables reference))
  where
  clash (Tuple one other) = Array.findMap (earlier one)
    (Array.sortWith start other.fields)
  earlier one field = map (Tuple field)
    (Array.find (sameLabel field) one.fields)
  sameLabel field found = found.name == field.name
  start field = field.span.start.offset
  refused (Tuple field first) = Left
    { problem: Duplicate DuplicateField field.name
    , span: field.span
    , related: [ { span: first.span, reason: Syntax.FirstWrittenHere } ]
    }

-- The pairs of variable names a signature's facts say are disjoint, the
-- smaller name first: its `where r disjoint s` clauses and the tails its
-- own types write into one record (option A, implied disjointness).
apartFrom
  ∷ ∀ r
  . Names r
  → Array Syntax.TypeRef
  → Array Resolved.Requirement
  → Set (Tuple String String)
apartFrom tables references constraints = Set.fromFoldable
  (map ordered (stated <> implied))
  where
  stated = Array.mapMaybe clause constraints
  clause = case _ of
    Resolved.Disjoint found → Just (named found.written)
    Resolved.Lacks _ → Nothing
  named (Tuple one other) = Tuple one.name other.name
  implied = map names (Array.concatMap (heldTails tables) references)
  names held = Tuple held.first.name held.second.name

ordered ∷ Tuple String String → Tuple String String
ordered (Tuple one other) =
  if one <= other then Tuple one other else Tuple other one

-- Two tails written into one record in a body type must be known disjoint
-- by the signature (D3, approved 2026-10-17, with its hint): at the later
-- `...s`. The first in source order is reported, after the labels (a
-- decomposition reports labels before tails).
disjointIn
  ∷ ∀ r
  . Names r
  → Set (Tuple String String)
  → Syntax.TypeRef
  → Either Syntax.Diagnostic Unit
disjointIn tables known reference = traverse_ refused
  (Array.find unknown (heldTails tables reference))
  where
  unknown held = held.first.name /= held.second.name
    && not (Set.member (ordered (names held)) known)
  names held = Tuple held.first.name held.second.name
  refused held = Left
    { problem: Hinted (NotKnownDisjoint held.first.name held.second.name)
        (RequireDisjoint held.first.name held.second.name)
    , span: held.second.span
    , related: []
    }

-- The types a signature writes: its parameters, its result and the
-- arguments of its row's labels.
signatureTypes ∷ Syntax.FunctionDecl → Array Syntax.TypeRef
signatureTypes function =
  Array.snoc (map parameterType function.parameters)
    function.result
    <> maybe [] rowTypes function.row
  where
  parameterType parameter = parameter.ty
  rowTypes (Syntax.RowRef _ labels _) = Array.concatMap labelTypes labels
  labelTypes label = label.arguments

-- The pairs of variables a signature's or a declaration's types write into
-- one record (option A), each at the later tail, in source order, as
-- Check seeds them (Features.Check.Seed `joined`). `variables` names the
-- VarIds in order. A tail written twice is D8 before this is read.
joinedPairs
  ∷ ∀ r
  . Names r
  → Array String
  → Array Syntax.TypeRef
  → Array Resolved.Joined
joinedPairs tables variables references = Array.mapMaybe joined
  (Array.concatMap (heldTails tables) references)
  where
  joined held = pair held <$> indexOf held.first <*> indexOf held.second
  indexOf tail = VarId <$> Array.elemIndex tail.name variables
  pair held one other = { variables: Tuple one other, span: held.second.span }

-- A constructor with the pairs its fields write into one record, over its
-- owner's parameters.
withJoined
  ∷ ∀ r. Names r → Resolved.CtorInfo → Resolved.CtorInfo
withJoined tables ctor = ctor
  { joined = joinedPairs tables variables ctor.fieldSyntax }
  where
  variables = maybe [] variablesOf (Array.index tables.types (index ctor.owner))
  variablesOf info = info.variables
  index (TypeId found) = found
