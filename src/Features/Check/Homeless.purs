module Features.Check.Homeless (homeless) where

import Prelude
import Data.Array as Array
import Features.Check.RowResidue (Residue, constants)

-- Step 4 (R005 Tranche B design §2.1, rules §4): a constant on one side
-- and no meta on the other. A label is an atom and a rigid denotes
-- itself, so the other side's atoms are fixed and lack it: no solution,
-- the records' mismatch. (Task 4's explanation of a constant that U4's
-- emptied bounds excluded went with the bounds in B2.)
homeless ∷ Residue → Boolean
homeless found = stranded found.mine found.theirs
  || stranded found.theirs found.mine
  where
  stranded own other = not (Array.null (constants own))
    && Array.null other.metas
