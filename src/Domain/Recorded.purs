-- The recorded problem of one declaration, as an opaque type: its
-- constructor stays in Domain.Recorded.Internal (T-R0a §3.1), so only
-- generation builds one. Every other module reads it through `fields`,
-- a copy of the record that cannot be wrapped back (ruling R4).
module Domain.Recorded
  ( module Exports
  , fields
  ) where

import Domain.Recorded.Atom (CallSite, OutsideKind) as Exports
import Domain.Recorded.Internal (Fields, RecordedProblem) as Exports
import Domain.Recorded.Internal (Fields, RecordedProblem(..))
import Domain.Recorded.Origin (AtomId, Path) as Exports

-- T-R0b §10's fields, read-only.
fields ∷ RecordedProblem → Fields
fields (RecordedProblem record) = record
