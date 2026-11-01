-- trusted surface: every diff needs token review; see docs/engineering.md
-- The result types A2's obligation checks share (plan Task 1): a check
-- fails at its index j within the obligation (spec §9's last column),
-- `limit` when the failure is a limitation rather than a refutation; the
-- context every check reads is the settled package and the declared
-- rigid marks.
module Features.Check.Strategy.Effects.Judged
  ( Context
  , Failure
  , Judged
  ) where

import Prelude (Unit)
import Data.Either (Either)
import Domain.Verdict.EffectPackage (EffectPackage)

type Failure = { check ∷ Int, limit ∷ Boolean }

type Judged = Either Failure Unit

type Context = { package ∷ EffectPackage, rigidMarks ∷ Array String }
