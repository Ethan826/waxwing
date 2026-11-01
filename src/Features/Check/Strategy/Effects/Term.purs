-- trusted surface: every diff needs token review; see docs/engineering.md
-- Mark terms (statements §2, §5; spec §9 "Marks"): N, M, or the join of
-- named rigid marks, read over every valuation of those marks in the
-- two-point order N ⊑ M. `norm` sends the empty join to N, so every
-- comparison is on normal forms; `holds x y` is x ⊑ y at every valuation
-- (statements §5's universal argument: N on the left always holds, M on
-- the right always holds, a join below a join exactly when its marks are
-- a subset, and nothing else); `sameTerm` is equality at every
-- valuation, which on normal forms is equality. Bounded agreement with
-- brute force over valuations is test/r0-a2-terms.test.mjs.
module Features.Check.Strategy.Effects.Term
  ( holds
  , norm
  , sameTerm
  ) where

import Prelude
import Data.Set as Set
import Domain.Verdict.EffectPackage (Term(..))

norm ∷ Term → Term
norm = case _ of
  TermJ marks
    | Set.isEmpty marks → TermN
  other → other

holds ∷ Term → Term → Boolean
holds lower upper = case norm lower, norm upper of
  TermN, _ → true
  _, TermM → true
  TermJ held, TermJ bound → Set.subset held bound
  _, _ → false

sameTerm ∷ Term → Term → Boolean
sameTerm left right = norm left == norm right
