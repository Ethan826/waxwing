-- Types that T-R0a names but whose representation another task or
-- document owns. Each is declared without constructors, so it is
-- uninhabited: no code can build one, nor invent a representation, before
-- its owner defines it here or moves it to its home. Task 4.1 moved
-- `Budget`, `CheckRefusal` and `SearchHint` to Domain.Verdict.Search and
-- `NoWitnessReason` to Domain.Verdict; Task 4.4 moved `Witness` to
-- Domain.Verdict.Witness; Task 5.2 defined `CXSubst`, `CheckedCX` and
-- `RefuteRefusal` in Domain.Verdict.Counter, re-exported here, so
-- their importers (the token module Domain.Verdict.Internal among them)
-- are unchanged.
module Domain.Verdict.Open
  ( Alternative
  , module Exports
  , Construct
  , ForcednessClaim
  , ForcednessRefusal
  , NonForcednessEvidence
  , Question
  , RigidAssignment
  , SplitJudgement
  ) where

import Prelude (class Eq)
import Domain.Verdict.Counter (CXSubst, CheckedCX, RefuteRefusal) as Exports

-- Which Q3 sub-question a class-f construct falls under (T-R0a §3.5).
-- Equality lets `decide` list each `Unsupport` once (Task 4.1).
data Question

-- W §1.7, adopted as defined there (Task 6.1).
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
