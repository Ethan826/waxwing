-- Types that T-R0a names but whose representation another task or
-- document owns. Each is declared without constructors, so it is
-- uninhabited: no code can build one, nor invent a representation, before
-- its owner defines it here or moves it to its home. Task 4.1 moved
-- `Budget`, `CheckRefusal` and `SearchHint` to Domain.Verdict.Search and
-- `NoWitnessReason` to Domain.Verdict.
module Domain.Verdict.Open
  ( Alternative
  , CXSubst
  , CheckedCX
  , Construct
  , ForcednessClaim
  , ForcednessRefusal
  , NonForcednessEvidence
  , Question
  , RefuteRefusal
  , RigidAssignment
  , SplitJudgement
  , Witness
  ) where

import Prelude (class Eq)

-- Which Q3 sub-question a class-f construct falls under (T-R0a §3.5).
-- Equality lets `decide` list each `Unsupport` once (Task 4.1).
data Question

-- CX's `Subst (B ⊕ Nat)`, its checked certificate and its refusal
-- (refute/statements.md §4; Task 5.2).
data CXSubst

data CheckedCX

data RefuteRefusal

-- W §1.6 and §1.7, adopted as defined there (Tasks 4.4, 6.1).
data Witness

data SplitJudgement

-- T-R0e §3.1's constructs that lowering does not support (Task 6.2).
data Construct

-- Gate G-forced (plan Task 0.6; T-R0a §6, open there).
data RigidAssignment

data Alternative

data NonForcednessEvidence

data ForcednessClaim

data ForcednessRefusal

derive instance eqQuestion ∷ Eq Question
