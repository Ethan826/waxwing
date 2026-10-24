-- trusted surface: every diff needs token review; see docs/engineering.md
-- W §1.6's compilation witness (research/division-campaign/witness/
-- statements.md; Task 4.4), adopted with three labelled amendments:
-- - `Inline` holds a recorded type, `RTExpr` over the problem's
--   variables, not W's `Ty Open`: a G0 substitution is written in the
--   problem's vocabulary, and Domain cannot name the checked IR's `Open`.
--   A hole inside it is ReadBack.Type's `holeVar n`, defaulted as
--   lowering defaults hole `n` (§1.5).
-- - No `Named` binding: `NameId` and §1.2's entries are Task 6.1's, so
--   `NameEntry` is uninhabited and every witness has empty `names`.
-- - `Free n` keeps W's meaning, the hole `n` lowering defaults (the
--   representative for a type, `{}` for a row); the hole contract (§1.5,
--   Features.Check.Strategy.HoleContract) judges whether it may.
module Domain.Verdict.Witness
  ( Binding(..)
  , NameEntry
  , Witness
  ) where

import Data.Map (Map)
import Domain.Recorded.Atom (RTExpr, Var)

-- `bindings`: every flexible variable (Cov's domain while `Recon` is
-- empty, §18.69 Q6).
type Witness = { bindings ∷ Map Var Binding, names ∷ Array NameEntry }

data Binding = Inline RTExpr | Free Int

-- W §1.2's per-name entry (Task 6.1).
data NameEntry
