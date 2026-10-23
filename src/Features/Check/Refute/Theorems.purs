-- The hidden registry of proved theorems (T-R0a §5.1, §5.2; plan Task
-- 5.1). It is the one Features module that may import
-- Domain.Verdict.Theorem.Internal, where `TheoremRef`'s constructor is,
-- and only Features.Check.Refute.Rules may import it, naming the type
-- without its constructor (scripts/structure.mjs). Task 5.3 adds the
-- first values, each with its proof; until then it imports the type
-- alone and makes none.
module Features.Check.Refute.Theorems (module Exports, theorems) where

import Domain.Verdict.Theorem.Internal (TheoremRef) as Exports
import Domain.Verdict.Theorem.Internal (TheoremRef)

-- Empty until P-C1 or P-CX.
theorems ∷ Array TheoremRef
theorems = []
