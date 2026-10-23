-- The recorded problem of one declaration, as an opaque type: its
-- constructor stays in Domain.Recorded.Internal (T-R0a §3.1). Task 3.1
-- adds read-only accessors here (ruling R4).
--
-- T-R0b's identities are declared here without constructors, so that
-- Domain.Verdict can name them before Task 3.1 gives each its
-- representation (T-R0b §3.5, §6, §10) and moves it to Recorded/Atom.purs
-- or Recorded/Origin.purs. Uninhabited until then: no code can build one.
module Domain.Recorded
  ( module Exports
  , AtomId
  , CallSite
  , OutsideKind
  , Path
  ) where

import Domain.Recorded.Internal (RecordedProblem) as Exports

-- `{ decl, path, index }` (T-R0b §6).
data AtomId

-- `{ callee, slots }`, one entry of a declaration's call sites (T-R0b §10).
data CallSite

-- An `outside` marker's kind (T-R0b §3.5).
data OutsideKind

-- A node's path from the declaration's body or signature (T-R0b §6).
data Path
