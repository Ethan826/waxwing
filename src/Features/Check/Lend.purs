module Features.Check.Lend (lend, assume) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (either)
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open)
import Domain.Row (Label(..), LabelKey, Row(..), labelKey, labelMark, withMark)
import Domain.Syntax (Span)
import Domain.Type (Ty, TyRow)
import Domain.Type.Parts (typeHead)
import Features.Check.MarkStore (RowMode(..))
import Features.Check.Occurrence (OccurrenceId(Written))
import Features.Check.Scheme (flexible)
import Features.Check.Subst (Flex, Subst, walk)
import Features.Check.UnifyMark (pairMarks)
import Features.Check.Walked (walkedRow)

-- A label of the first row and the label of the second row it is paired
-- with, with whatever the first travels with.
type Pair a = Tuple (Label (Ty Open)) (Tuple (Label (Ty Open)) a)

type Progress a = { pairs ∷ Array (Pair a), seen ∷ Map LabelKey Int }

type Donors = Map LabelKey (Array (Label (Ty Open)))

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
lend subst donor found = map given (paired subst donor found)
  where
  given (Tuple label (Tuple lender payload)) =
    Tuple (withMark (labelMark label) lender) payload

-- Every label of `found` meeting the label of `target` it pairs with, by
-- key and position (as row unification pairs them), recorded as the edge
-- the target's mark ⊑ the label's, Assumed at `span`. Nothing is unified and
-- no tail changes: a consumption that adds nothing but marks must not
-- rename the row's tail (the checked IR names an unsolved tail by its
-- number). `Nothing` when some label has no partner yet; the caller
-- consumes then.
assume
  ∷ ∀ a
  . Span
  → Subst
  → TyRow Open
  → Array (Tuple (Label (Ty Open)) a)
  → Maybe Subst
assume span subst target found =
  if Array.length pairs == Array.length found then Just
    (foldl meeting subst (Array.mapWithIndex Tuple pairs))
  else Nothing
  where
  pairs = paired subst target found
  meeting reached (Tuple index (Tuple stage (Tuple partner _))) = either
    (const reached)
    identity
    ( pairMarks (Directional { span, throwaway: Nothing }) reached
        (Written span index)
        (flexLabel stage)
        (flexLabel partner)
    )

paired
  ∷ ∀ a
  . Subst
  → TyRow Open
  → Array (Tuple (Label (Ty Open)) a)
  → Array (Pair a)
paired subst donor found = (foldl give start found).pairs
  where
  Row donated _ = walkedRow subst donor
  donors = foldl (collect subst) Map.empty donated
  start = { pairs: [], seen: Map.empty }
  give progress entry = maybe progress (keyed progress entry)
    (keyOf subst (fst entry))
  keyed progress entry key = maybe progress (borrowed progress entry key)
    (Array.index (fromMaybe [] (Map.lookup key donors)) (nth progress key))
  borrowed progress (Tuple label payload) key lender =
    { pairs: Array.snoc progress.pairs
        (Tuple label (Tuple lender payload))
    , seen: Map.insert key (nth progress key + 1) progress.seen
    }
  nth progress key = fromMaybe 0 (Map.lookup key progress.seen)

collect ∷ Subst → Donors → Label (Ty Open) → Donors
collect subst found label = maybe found (appended found label)
  (keyOf subst label)

appended ∷ Donors → Label (Ty Open) → LabelKey → Donors
appended found label key = Map.alter (Just <<< added) key found
  where
  added held = Array.snoc (fromMaybe [] held) label

keyOf ∷ Subst → Label (Ty Open) → Maybe LabelKey
keyOf subst = labelKey (typeHead <<< walk subst <<< flexible)

flexLabel ∷ Label (Ty Open) → Label (Ty Flex)
flexLabel (Label effect arguments mark) = Label effect
  (map flexible arguments)
  mark
