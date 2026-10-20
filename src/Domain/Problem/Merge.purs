module Domain.Problem.Merge where

import Data.Maybe (Maybe)
import Domain.Problem.Names (TypeName)

-- R005 Tranche B's two outcomes of row merging as data (the diagnostics
-- file's §2; implementation plan §2.10, §10 decision 20). Names arrive
-- resolved (R1, R2) and rows printed (R5); Format writes the text.

-- D4: neither a solution nor a contradiction established. `owner`: R1's
-- owner, if any; `parts`: R3's parts in R3's order; `subject`: what
-- cannot be told; `path`: R6's field path, outermost first; `hint`: R9's.
type Undetermined =
  { owner ∷ Maybe String
  , parts ∷ Array String
  , subject ∷ Subject
  , path ∷ Array String
  , hint ∷ Maybe MergeHint
  }

-- Which part has a field or holds a rigid tail (R4); what the parts hold,
-- for a predicate with no constant; how they split the other side, when
-- no constant has two candidate parts (both approved 2026-10-19), with
-- the enclosing function's name before it when names collide (decision
-- 23).
data Subject
  = HasField String
  | HoldsTail String
  | Holds
  | Splits (Maybe String) TypeName

-- R9's hints as decision 20 chose them: a lambda in place of a function
-- value or of a partial application of the owner, this lambda's
-- parameters annotated, the constructor's row arguments written, or no
-- annotation, for a direct call's own rows (amended R9).
data MergeHint
  = LambdaInPlaceOf String
  | LambdaInPlaceOfPartial String
  | AnnotateLambda
  | RowArgumentsOf String
  | OwnCall String

-- D6: a contradiction a predicate established. `row`: the owner's row as
-- written (R5); `other`: the other side through the substitution;
-- `otherOwner`: the enclosing function, written before `other` when names
-- collide (decision 23); `fault`: one part at fault (`parts` holds it) or
-- none that can hold the atom (`parts` holds those that were
-- candidates); `atom`: a field or a rigid tail.
type MustBe =
  { owner ∷ Maybe String
  , row ∷ TypeName
  , path ∷ Array String
  , other ∷ TypeName
  , otherOwner ∷ Maybe String
  , fault ∷ Fault
  , parts ∷ Array String
  , atom ∷ MergeAtom
  }

data Fault = OnePart | NoPart

data MergeAtom = FieldAtom String | TailAtom String
