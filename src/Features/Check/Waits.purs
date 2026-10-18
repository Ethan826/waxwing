module Features.Check.Waits
  ( waitFor
  , withdraw
  , unwake
  , entryOf
  , pendingIds
  , pendingOf
  , waitingOf
  , nestingOf
  , nested
  , versionOf
  , readsOf
  ) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Set (Set)
import Data.Set as Set
import Features.Check.Pending
  ( Pending
  , Residue
  , Waiting
  , quietResidue
  , unwoken
  , waitOn
  , withdrawn
  )
import Features.Check.RowStore (Equation, RowStore(..), partnersOf)
import Features.Check.Subst (Flex(..), Subst, onStore, storeOf)

-- The pending equations of a substitution's row store (R005 Tranche B
-- design §2.6, Features.Check.Pending), kept there so that a postponed
-- effect pair that reverts the substitution reverts them, their index and
-- their wake-ups with every fact (rules §12, ledger L19).

-- `equation` waits on `found`, its residue now: stored under its identity
-- (replacing its entry, or dropped as the duplicate of an older one), and
-- watched through every variable its rules read.
waitFor ∷ Equation → Residue → Subst → Subst
waitFor equation found subst = onStore (onWaiting (waitOn pending)) subst
  where
  pending =
    { equation
    , residue: found
    , quiet: quietResidue found
    , reads: readsOf subst found
    }

-- The entry taken out, to be examined again or dropped.
withdraw ∷ Int → Subst → Subst
withdraw id = onStore (onWaiting (withdrawn id))

-- Its wake-up spent: about to be examined, or passed over.
unwake ∷ Int → Subst → Subst
unwake id = onStore (onWaiting (unwoken id))

entryOf ∷ Subst → Int → Maybe Pending
entryOf subst id = Map.lookup id (waitingOf (storeOf subst)).entries

-- The identities waiting, oldest first.
pendingIds ∷ Subst → Array Int
pendingIds subst = Array.fromFoldable
  (Map.keys (waitingOf (storeOf subst)).entries)

-- Every pending equation, by identity.
pendingOf ∷ Subst → Array Pending
pendingOf subst = Array.fromFoldable (Map.values (waitingOf (storeOf subst))
  .entries)

-- What a residue's rules read (ledger L32; rules §9a): the binding and
-- the facts of each of its tails, metas and rigids, and the facts of each
-- partner of its metas, which the sum rule's apart derivation reads
-- (`sharedPartners`, `disjointFrom`) and homes read for rigid partners. A
-- tail bound or given a fact, or a partner given one, changes what the
-- rules can derive; nothing else they read changes inside a body (a
-- rigid's lacks and rigid pairs are the signature's hypotheses).
readsOf ∷ Subst → Residue → Set Flex
readsOf subst found = Set.fromFoldable (tails <> partners)
  where
  metas = map Meta (found.mine.metas <> found.theirs.metas)
  tails = metas <> found.mine.rigids <> found.theirs.rigids
  partners = Array.concatMap partnersOfTail metas
  partnersOfTail tail = Array.fromFoldable
    (Map.keys (partnersOf (storeOf subst) tail))

waitingOf ∷ RowStore → Waiting
waitingOf (RowStore store) = store.waiting

nestingOf ∷ RowStore → Maybe Equation
nestingOf (RowStore store) = store.nesting

-- The store while `equation` is re-examined: an equation met inside it
-- takes its site (design §2.6, nested equations).
nested ∷ Maybe Equation → RowStore → RowStore
nested nesting (RowStore store) = RowStore store { nesting = nesting }

-- How many times a variable's facts or binding changed.
versionOf ∷ RowStore → Int
versionOf (RowStore store) = store.version

onWaiting ∷ (Waiting → Waiting) → RowStore → RowStore
onWaiting change (RowStore store) = RowStore store
  { waiting = change store.waiting }
