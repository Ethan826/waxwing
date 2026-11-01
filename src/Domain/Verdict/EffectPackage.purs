-- trusted surface: every diff needs token review; see docs/engineering.md
-- The effect package a strategy offers A2's validator (spec §2.2), and
-- `Completed` without its constructor with its read-only accessor, as
-- Domain.Verdict.Certified does for `Certified`.
module Domain.Verdict.EffectPackage
  ( module Exports
  , module Types
  , completedPackage
  ) where

import Domain.Verdict.EffectPackage.Internal (Completed) as Exports
import Domain.Verdict.EffectPackage.Internal (Completed(..))
import Domain.Verdict.EffectPackage.Types
  ( EffectPackage
  , PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  ) as Types
import Domain.Verdict.EffectPackage.Types (EffectPackage)

completedPackage ∷ Completed → EffectPackage
completedPackage (Completed package) = package
