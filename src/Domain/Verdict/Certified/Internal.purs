-- trusted surface: every diff needs token review; see docs/engineering.md
-- A strategy's acceptance (BACKLOG R026): the check's `Valid` with the
-- compilation witness the same check built from what it judged. A
-- strategy offers nothing else to `decide`, so no strategy can pair a
-- `Valid` with a witness built from fields the check did not see. Only
-- Domain.Verdict.Certified (the type and its accessors) and
-- Features.Check.Strategy.Substitution (G0's check, the one minter)
-- import this module (scripts/structure-modules.mjs).
module Domain.Verdict.Certified.Internal (Certified(..)) where

import Domain.Verdict (Compilation, Valid)

data Certified = Certified Valid Compilation
