-- trusted surface: every diff needs token review; see docs/engineering.md
-- The completed package (A2 spec §2.4): an input package plus a fresh
-- hole for each absent type and row variable and each forced ResultC
-- tail's copy. Only Domain.Verdict.EffectPackage (the type and its
-- accessor) and Features.Check.Strategy.Effects.Complete (`complete`,
-- the one builder) import this module (scripts/structure-modules.mjs).
module Domain.Verdict.EffectPackage.Internal (Completed(..)) where

import Domain.Verdict.EffectPackage.Types (EffectPackage)

newtype Completed = Completed EffectPackage
