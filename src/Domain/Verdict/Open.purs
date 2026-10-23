-- Types that T-R0a names but whose representation another task or
-- document owns. Each is declared without constructors, so it is
-- uninhabited: no code can build one, nor invent a representation, before
-- its owner defines it here or moves it to its home.
module Domain.Verdict.Open
  ( Alternative
  , Budget
  , CXSubst
  , CheckRefusal
  , CheckedCX
  , Construct
  , ForcednessClaim
  , ForcednessRefusal
  , NoWitnessReason
  , NonForcednessEvidence
  , Question
  , RefuteRefusal
  , RigidAssignment
  , SearchHint
  , SplitJudgement
  , Witness
  ) where

-- A strategy check's refusal of a candidate (T-R0a §4.1; Tasks 4.1, 4.2).
data CheckRefusal

-- Advisory text a search leaves, never a reason (T-R0a §4.2; Task 4.3).
data SearchHint

-- Which Q3 sub-question a class-f construct falls under (T-R0a §3.5).
data Question

-- CX's `Subst (B ⊕ Nat)`, its checked certificate and its refusal
-- (refute/statements.md §4; Task 5.2).
data CXSubst

data CheckedCX

data RefuteRefusal

-- The injected budget (T-R0a §4.3): fuel per strategy and per refuter,
-- a depth bound, a key bound. A refuter's search takes one (§5.1); Task
-- 4.1 gives it its representation.
data Budget

-- W §1.6 and §1.7, adopted as defined there (Tasks 4.4, 6.1).
data Witness

data NoWitnessReason

data SplitJudgement

-- T-R0e §3.1's constructs that lowering does not support (Task 6.2).
data Construct

-- Gate G-forced (plan Task 0.6; T-R0a §6, open there).
data RigidAssignment

data Alternative

data NonForcednessEvidence

data ForcednessClaim

data ForcednessRefusal
