-- `elabTy`'s label check (D1 spec §3.2, §8.1; R0 Task 7.1a): splicing a
-- record's tail images must not repeat a label, whether one the record
-- writes or one an earlier tail's image brought. The first repeat, with
-- the tail variable whose image brought it, in tail order; `Nothing`
-- when every label is new. A `TVar` image (a renaming) brings none.
module Features.Check.Generate.Elab.Labels (repeatedLabel) where

import Prelude
import Data.Array (foldl)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open)
import Domain.Recorded.Atom (Var)
import Domain.Type (Ty(..))

type Seen = { labels ∷ Set String, repeat ∷ Maybe (Tuple Var String) }

repeatedLabel
  ∷ Array String → Array (Tuple Var (Ty Open)) → Maybe (Tuple Var String)
repeatedLabel written images = (foldl image start images).repeat
  where
  start = { labels: Set.fromFoldable written, repeat: Nothing }

image ∷ Seen → Tuple Var (Ty Open) → Seen
image seen (Tuple variable ty) = maybe (fresh ty) (const seen) seen.repeat
  where
  fresh = case _ of
    TRecord row → foldl (label variable) seen (map fst row.fields)
    _ → seen

label ∷ Var → Seen → String → Seen
label variable seen name = maybe' (const unseen) (const seen) seen.repeat
  where
  unseen
    | Set.member name seen.labels = seen
        { repeat = Just (Tuple variable name) }
    | otherwise = seen { labels = Set.insert name seen.labels }
