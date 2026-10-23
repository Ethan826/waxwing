-- A proved theorem's reference (T-R0a §3.3, §5.1, §5.2) and its
-- constructor. Only Domain.Verdict, which re-exports the type alone, and
-- Features.Check.Refute.Theorems, the hidden registry, import this
-- module; only Features.Check.Refute.Rules imports Theorems, naming the
-- type without its constructor (scripts/structure.mjs). So nothing in
-- src outside Theorems can make a `TheoremRef`, and Theorems makes none
-- until P-C1 or P-CX.
module Domain.Verdict.Theorem.Internal (TheoremRef(..)) where

-- The proved theorem's Lean name. Data rather than a newtype, so that
-- no `coerce` reaches it and its compiled form keeps a constructor, the
-- one tests mint through (test/r0-stubs.mjs).
data TheoremRef = TheoremRef String
