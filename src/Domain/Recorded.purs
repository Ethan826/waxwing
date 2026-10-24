-- The recorded problem of one declaration, as an opaque type: its
-- constructor stays in Domain.Recorded.Internal (T-R0a §3.1), so only
-- generation builds one. Every other module reads it through `fields`,
-- a copy of the record that cannot be wrapped back (ruling R4).
--
-- The Internal module's types have an alias of their own (D1 spec §3.1,
-- rule E6's allowed form; Task 7.1a); the vocabulary is re-exported
-- under another.
module Domain.Recorded
  ( module Exports
  , module Vocabulary
  , fields
  ) where

import Domain.Recorded.Atom (CallSite, OutsideKind) as Vocabulary
import Domain.Recorded.Internal (Fields, RecordedProblem) as Exports
import Domain.Recorded.Internal (Fields, RecordedProblem(..))
import Domain.Recorded.Origin (AtomId, Path) as Vocabulary

-- T-R0b §10's fields, read-only.
fields ∷ RecordedProblem → Fields
fields (RecordedProblem record) = record
