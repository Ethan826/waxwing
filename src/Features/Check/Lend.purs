module Features.Check.Lend (lend, assume, partners) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either)
import Data.Foldable (foldl, foldM)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open)
import Domain.Row (Label, LabelKey, Row(..), labelKey, labelMark, withMark)
import Domain.Syntax (Span)
import Domain.Type (Ty, TyRow)
import Domain.Type.Parts (typeHead)
import Features.Check.MarkStore (RowMode(..))
import Features.Check.Occurrence (OccurrenceId(Written))
import Features.Check.Scheme (flexible)
import Features.Check.Subst (Flex, Subst, walk)
import Features.Check.UnifyFailure (Failure)
import Features.Check.UnifyMark (pairMarks)
import Features.Check.Walked (walkedRow)

-- A label of C and the label it is paired with, with whatever travels.
type Pair d a = Tuple (Label (Ty Open)) (Tuple (Label d) a)

type Progress d a = { pairs ∷ Array (Pair d a), seen ∷ Map LabelKey Int }

type Donors d = Map LabelKey (Array (Label d))

-- The clause row C keeps no label arguments (Task 7 ruling), so an
-- installation takes them from the handler's inference row R, which holds
-- every label C does. The k-th C label of a key is given the k-th R label of
-- that key, keeping C's mark, which is what the edges relate. A label with
-- no key yet (a `Fail` payload still unknown), or none in R yet, is left
-- out: settling reaches it again once R has it.
lend
  ∷ ∀ a
  . Subst
  → TyRow Open
  → Array (Tuple (Label (Ty Open)) a)
  → Array (Tuple (Label (Ty Open)) a)
lend subst donor found = map given
  (paired (keyOf subst) (keyOf subst) donated found)
  where
  Row donated _ = walkedRow subst donor
  given (Tuple label (Tuple lender payload)) =
    Tuple (withMark (labelMark label) lender) payload

-- Every label of `found` meeting the label of `target` (a row's labels,
-- resolved) it pairs with, by key and position (as row unification pairs
-- them), recorded as the edge the target's mark ⊑ the label's, Assumed at
-- `span`. Nothing is unified and no tail changes: a consumption that adds
-- nothing but marks must not rename the row's tail (the checked IR names an
-- unsolved tail by its number). The edge's label is the partner's, C having
-- no arguments. `Nothing` when some label has no partner yet; the caller
-- consumes then. A directional pairing cannot fail, but if it ever did, the
-- failure is returned, never dropped with its edge.
assume
  ∷ ∀ a
  . Span
  → Subst
  → Array (Label (Ty Flex))
  → Array (Tuple (Label (Ty Open)) a)
  → Maybe (Either Failure Subst)
assume span subst target found =
  if Array.length pairs == Array.length found then Just
    (foldM meeting subst (Array.mapWithIndex Tuple pairs))
  else Nothing
  where
  pairs = paired (flexKey subst) (keyOf subst) target found
  meeting reached (Tuple index (Tuple stage (Tuple partner _))) =
    pairMarks (Directional { span, throwaway: Nothing }) reached
      (Written span index)
      (withMark (labelMark stage) partner)
      partner

-- Each label of C (non-`Fail` ones: their keys need no payload) with the
-- label of `target` it meets, by key and position as `assume` pairs them.
partners
  ∷ Subst
  → Array (Label (Ty Flex))
  → Array (Label (Ty Open))
  → Array (Tuple (Label (Ty Open)) (Label (Ty Flex)))
partners subst target found = map met
  (paired (flexKey subst) (keyOf subst) target (map bare found))
  where
  bare label = Tuple label unit
  met (Tuple label (Tuple partner _)) = Tuple label partner

paired
  ∷ ∀ a d
  . (Label d → Maybe LabelKey)
  → (Label (Ty Open) → Maybe LabelKey)
  → Array (Label d)
  → Array (Tuple (Label (Ty Open)) a)
  → Array (Pair d a)
paired donorKey foundKey donated found = (foldl give start found).pairs
  where
  donors = foldl (collect donorKey) Map.empty donated
  start = { pairs: [], seen: Map.empty }
  give progress entry = maybe progress (keyed progress entry)
    (foundKey (fst entry))
  keyed progress entry key = maybe progress (borrowed progress entry key)
    (Array.index (fromMaybe [] (Map.lookup key donors)) (nth progress key))
  borrowed progress (Tuple label payload) key lender =
    { pairs: Array.snoc progress.pairs
        (Tuple label (Tuple lender payload))
    , seen: Map.insert key (nth progress key + 1) progress.seen
    }
  nth progress key = fromMaybe 0 (Map.lookup key progress.seen)

collect
  ∷ ∀ d
  . (Label d → Maybe LabelKey)
  → Donors d
  → Label d
  → Donors d
collect keyOfLabel found label = maybe found (appended found label)
  (keyOfLabel label)

appended ∷ ∀ d. Donors d → Label d → LabelKey → Donors d
appended found label key = Map.alter (Just <<< added) key found
  where
  added held = Array.snoc (fromMaybe [] held) label

keyOf ∷ Subst → Label (Ty Open) → Maybe LabelKey
keyOf subst = labelKey (typeHead <<< walk subst <<< flexible)

flexKey ∷ Subst → Label (Ty Flex) → Maybe LabelKey
flexKey subst = labelKey (typeHead <<< walk subst)
