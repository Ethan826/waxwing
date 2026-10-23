-- The recorded problem's constructor (T-R0a §3.1, §2 property 2). Only
-- generation (Features.Check.Generate*) builds a recorded problem, and
-- Domain.Recorded re-exports the type alone; scripts/structure.mjs enforces
-- both. Task 3.1 gives it T-R0b §10's fields.
module Domain.Recorded.Internal (RecordedProblem(..)) where

newtype RecordedProblem = RecordedProblem {}
