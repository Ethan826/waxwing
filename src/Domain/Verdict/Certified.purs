-- The type `Certified` without its constructor, and its two read-only
-- accessors (BACKLOG R026), as Domain.Verdict.Judged does for `Judged`.
module Domain.Verdict.Certified
  ( module Exports
  , certifiedCompilation
  , certifiedValidity
  ) where

import Domain.Verdict (Compilation, Valid)
import Domain.Verdict.Certified.Internal (Certified) as Exports
import Domain.Verdict.Certified.Internal (Certified(..))

certifiedValidity ∷ Certified → Valid
certifiedValidity (Certified validity _) = validity

certifiedCompilation ∷ Certified → Compilation
certifiedCompilation (Certified _ compilation) = compilation
