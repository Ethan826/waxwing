module Features.Check.Disjoint (Emptied, requireApart, seedApart) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Type (Ty)
import Features.Check.Lacks (addLackTable, lacksOf)
import Features.Check.RowStore (Because, partnersOf, withApart)
import Features.Check.Subst (Flex(..), Subst, onStore, storeOf)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

-- Binds a meta to the empty row (Features.Check.RecordTail `bindTail`).
type Emptied = Subst → Int → Either Failure Subst

-- Design §3.1, rules §10: once `meta` is bound to `fields` and `rest`, its
-- pair with `partner` (an unbound meta or a rigid) is required of that
-- image, keeping its reason. Labels first, in sorted order (location rule
-- 5): a meta partner lacks each label, remembering `meta` as where it
-- arrived; a rigid partner must already lack it (D3''). Then the tail: a
-- meta apart from itself holds nothing, so it is bound to `{}`; a rigid
-- apart from itself is D3'; two rigids need the body's hypothesis (D3);
-- otherwise the pair is stored. Each is the meaning of the pair on the
-- image, so solutions are kept; each refusal has no solution.
requireApart
  ∷ Emptied
  → Int
  → Array (Tuple String (Ty Flex))
  → Maybe Flex
  → Subst
  → Tuple Flex Because
  → Either Failure Subst
requireApart emptied meta fields rest subst (Tuple partner because) =
  foldM labelApart subst (Array.sort (map fst fields)) >>= tailApart
  where
  labelApart reached label = case partner of
    Meta _ → Right
      ( addLackTable partner
          (Map.singleton label { because, from: Just meta })
          reached
      )
    Rigid _ →
      if Set.member label (lacksOf reached partner) then Right reached
      else Left (Refused (MayHold partner label because))
  tailApart reached = maybe (Right reached)
    ( apart emptied because partner
        reached
    )
    rest

apart ∷ Emptied → Because → Flex → Subst → Flex → Either Failure Subst
apart emptied because partner subst tail = case tail, partner of
  Meta meta, Meta other | meta == other → emptied subst meta
  Rigid one, Rigid other
    | one == other → Left (Refused (Twice tail because))
    | Map.member tail (partnersOf (storeOf subst) partner) → Right subst
    | otherwise → Left
        (Refused (Unproven (min tail partner) (max tail partner) because))
  _, _ → Right (onStore (withApart tail partner because) subst)

-- A pair a signature or a clause states, between two different fresh
-- metas at a use or two rigids in the body: stored as it is.
seedApart ∷ Flex → Flex → Because → Subst → Subst
seedApart one other because = onStore (withApart one other because)
