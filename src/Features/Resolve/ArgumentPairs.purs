module Features.Resolve.ArgumentPairs
  ( Key
  , Pair
  , ordered
  , pairsOf
  , together
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Resolved (CtorId(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.RecordArguments
  ( namedArguments
  , slotOf
  , subtypes
  )
import Features.Resolve.TypeIndices (Indexed)

-- A record parameter: the declaration's index and the parameter's place in
-- its written order (as in Features.Resolve.ArgumentGraph).
type Key = Tuple Int Int

-- Two record parameters, the smaller key first.
type Pair = Tuple Key Key

-- A pair that is together, or one that is together when another is.
data Fact = Seed Pair | Rule Pair Pair

ordered ∷ Key → Key → Pair
ordered one other = if one <= other then Tuple one other else Tuple other one

-- The pairs of record parameters a declaration writes into one record,
-- `type Both(...r, ...s) = Both({ ...r, ...s })`, directly or by passing
-- both to a pair some declaration holds together (R005 Tranche B). A use
-- that gives such a pair the same tail repeats it (D8), and two tails of a
-- body type must be known disjoint. A worklist over the pairs found, each
-- entered once, so recursive declarations end.
together
  ∷ ∀ r
  . Indexed (ctors ∷ Array Resolved.CtorInfo | r)
  → Set Pair
together tables = tailRec step
  { done: Set.fromFoldable seeds, queue: seeds }
  where
  facts = Array.concat (Array.mapWithIndex (factsOf tables) tables.types)
  seeds = Array.mapMaybe seeded facts
  seeded = case _ of
    Seed pair → Just pair
    Rule _ _ → Nothing
  triggers = foldl triggered Map.empty facts
  triggered found = case _ of
    Rule premise conclusion → Map.insertWith (flip append) premise
      [ conclusion ]
      found
    Seed _ → found
  step found = maybe (Done found.done) (Loop <<< reached found)
    (Array.uncons found.queue)
  reached found { head, tail } = foldl admit
    found { queue = tail }
    (maybe [] identity (Map.lookup head triggers))
  admit found pair
    | Set.member pair found.done = found
    | otherwise =
        { done: Set.insert pair found.done
        , queue: Array.snoc found.queue pair
        }

-- This declaration's record parameters by name, to their written place.
type Parameters = Map String Int

-- What one declaration says: the record parameters it writes together in
-- a record, and the pairs it passes its parameters on to, by name.
factsOf
  ∷ ∀ r
  . Indexed (ctors ∷ Array Resolved.CtorInfo | r)
  → Int
  → Resolved.TypeInfo
  → Array Fact
factsOf tables owner info = Array.concatMap each inside
  where
  fields = Array.concatMap fieldSyntax info.ctors
  fieldSyntax (CtorId index) = maybe [] syntaxOf
    (Array.index tables.ctors index)
  syntaxOf ctor = ctor.fieldSyntax
  inside = Array.concatMap subtypes fields
  parameters = recordParameters info
  each reference = map Seed (writtenTogether owner parameters reference)
    <> Array.mapMaybe rule (passedOn tables owner parameters reference)

recordParameters ∷ Resolved.TypeInfo → Parameters
recordParameters info = Map.fromFoldable
  (Array.catMaybes (Array.mapWithIndex named info.sourceSorts))
  where
  named position sort
    | sort == Syntax.RecordSort = map (withPosition position)
        (Array.index info.variables (slotOf info position))
    | otherwise = Nothing
  withPosition position name = Tuple name position

-- Tails of one record: each pair of distinct parameters.
writtenTogether ∷ Int → Parameters → Syntax.TypeRef → Array Pair
writtenTogether owner parameters = case _ of
  Syntax.RecordRef _ _ tails → map pairOf
    (Array.filter different (pairsOf (Array.mapMaybe mine tails)))
  _ → []
  where
  mine = parameterKey owner parameters
  pairOf (Tuple one other) = ordered one other
  different (Tuple one other) = one /= other

parameterKey ∷ Int → Parameters → Syntax.RecordTail → Maybe Key
parameterKey owner parameters tail = map (Tuple owner)
  (Map.lookup tail.name parameters)

-- A tail given to a callee's parameter, and the declaration's own it is.
type Given = { callee ∷ Key, key ∷ Key }

-- Tails given to two parameters of one callee: together when the callee
-- holds those parameters together.
passedOn
  ∷ ∀ r
  . Indexed (ctors ∷ Array Resolved.CtorInfo | r)
  → Int
  → Parameters
  → Syntax.TypeRef
  → Array (Tuple Given Given)
passedOn tables owner parameters reference = pairsOf
  (Array.concatMap given (namedArguments tables reference))
  where
  given argument = Array.mapMaybe (givenAt argument) argument.tails
  givenAt argument tail = map (passing argument)
    (parameterKey owner parameters tail)
  passing argument key =
    { callee: Tuple argument.callee argument.position, key }

rule ∷ Tuple Given Given → Maybe Fact
rule (Tuple one other) =
  if one.callee == other.callee || one.key == other.key then Nothing
  else Just
    (Rule (ordered one.callee other.callee) (ordered one.key other.key))

-- Every pair of an array's elements, earlier first.
pairsOf ∷ ∀ a. Array a → Array (Tuple a a)
pairsOf items = Array.concat (Array.mapWithIndex against items)
  where
  against index item = map (Tuple item) (Array.drop (index + 1) items)
