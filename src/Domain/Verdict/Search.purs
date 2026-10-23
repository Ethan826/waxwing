-- What a strategy's or refuter's run reads and leaves besides the
-- verdict (T-R0a §4.1-§4.3; Task 4.1): the injected budget, a search's
-- hints and a check's refusal. They were uninhabited in
-- Domain.Verdict.Open until Task 4.1 gave them representations here.
module Domain.Verdict.Search
  ( Budget
  , CheckRefusal(..)
  , SearchHint(..)
  ) where

import Prelude
import Domain.Recorded (AtomId)

-- §4.3: fuel, a depth bound and a key bound. Each strategy and each
-- refuter search receives the whole value, and nothing it spends is
-- passed on, so no bound is shared between attempts (an
-- order-independence condition of §5.3).
type Budget = { fuel ∷ Int, depth ∷ Int, keys ∷ Int }

-- Advisory text a search leaves (§4.2): never a reason, never evidence.
-- Ordered, so `decide` hands refuters the hints sorted canonically.
data SearchHint = SearchHint String

-- A strategy check's refusal of a candidate (§4.1).
data CheckRefusal
  -- A `BQ` atom whose meaning `ValidR` leaves open under the candidate
  -- (§3.2(a), G-A-i(f)): read as a decline, never a `SearchFault`.
  = RequirementOpen AtomId
  -- An atom the candidate does not satisfy. Task 4.2 adds G0's others.
  | Unsatisfied AtomId

derive instance eqSearchHint ∷ Eq SearchHint
derive instance ordSearchHint ∷ Ord SearchHint
