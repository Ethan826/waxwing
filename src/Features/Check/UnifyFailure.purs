module Features.Check.UnifyFailure (Failure(..), Refusal(..), Cause) where

import Prim hiding (Row)
import Domain.Row (Label)
import Domain.Type (Ty, TyRow)
import Features.Check.Occurrence (OccurrenceId)
import Data.Maybe (Maybe)
import Domain.Syntax (Span)
import Features.Check.Atom (Atom)
import Features.Check.Because (Because, Pair, WrittenLack)
import Features.Check.Flex (Flex)
import Features.Check.Subst (Subst)

-- Types and rows are resolved under the substitution reached at the
-- failure: a mismatch names the first pair of subterms that differ, left
-- to right; an occurs failure names the meta and the type that properly
-- contains it. `TooDeep`: the binding, resolved, would be deeper than the
-- limit. Rows (FX001): `RowMissing`, a label the other row, closed or
-- rigid, lacks; `RowExtra`, an entry left over against a closed or rigid
-- tail, with the row it was left over against; `RowSharedTail`, the two
-- rows (Leijen's side condition);
-- `RowMismatch`, two rows that differ in their tails alone; `RowPayload`,
-- a left label and the right entry of its key whose arguments differ,
-- with the right entry's occurrence; the missing and extra labels carry
-- theirs;
-- `RowOccurs`,
-- a row meta and the label argument holding it in a row (an infinite
-- row), apart from `Occurs`, whose meta is a type's. `Refused`: a fact of
-- the row store broken (below).
-- `Placeholder` (R005 Tranche B): the work a later task does, named for
-- the E_INTERNAL it is reported as. `Unexpected`: an invariant the
-- argument for a rule establishes found broken, reported as E_INTERNAL
-- with its text (a checker defect, never a program's). R005 Tranche B B3:
-- `FromMerge`, a failure a `Merge` predicate caused (a binding its case
-- made, R10.1, or found while re-examining it), with the predicate and,
-- when found while re-examining, the location of the user's L2 rule (the
-- latest written of the requirement being checked, the predicate's site
-- and where the metas of its rows were bound;
-- docs/plans/2026-10-19-row-merge-locations.md); `Exhausted`, the
-- re-examination's step bound passed, which rules §5 argues cannot
-- happen (a limit, never a verdict). B4: `Homeless`, H's refusal at the
-- end of a body (rules §7): an atom left on one side of a waiting
-- predicate that no unknown of the other side can hold; it is made only
-- inside its predicate's `FromMerge`.
data Failure
  = Mismatch (Ty Flex) (Ty Flex)
  | Occurs Int (Ty Flex)
  | TooDeep
  | RowMissing (Label (Ty Flex)) (TyRow Flex) OccurrenceId
  | RowExtra (Label (Ty Flex)) (TyRow Flex) OccurrenceId
  | RowPayload (Label (Ty Flex)) (Label (Ty Flex)) OccurrenceId
  | RowSharedTail (TyRow Flex) (TyRow Flex)
  | RowMismatch (TyRow Flex) (TyRow Flex)
  | RowOccurs Int (Ty Flex)
  | Refused Refusal
  | Placeholder String
  | Unexpected String
  | FromMerge Cause Failure
  | Exhausted String
  | Homeless Atom

-- `within`: the substitution the predicate failed in, which the caller's
-- state, taken before the failing step, does not hold (diagnostic data
-- for D6's part at fault; no rule reads it).
type Cause = { predicate ∷ Int, at ∷ Maybe Span, within ∷ Maybe Subst }

-- A fact of the row store broken, with its reason. `Forbidden` (R005):
-- a label bound into a record tail that a written `lacks` forbids it.
-- Tranche B (design §3, §10): `Overlap`, a label bound into a tail that
-- lacks it because of a pair, with the pair's reason and the meta whose
-- binding brought the label (D2); `MayHold`, a signature's rigid tail
-- asked to lack a label a pair needs (D3''); `Unproven`, two rigid tails
-- asked to be disjoint without the hypothesis (D3); `Twice`, one rigid
-- tail asked to be disjoint from itself (D3'). Each keeps its reason.
-- (Task 4's `Outside` and `Derived`, refusals only upper bounds and the
-- sum rule made, went with them in B2.)
data Refusal
  = Forbidden String WrittenLack
  | Overlap String Pair (Maybe Int)
  | MayHold Flex String Because
  | Unproven Flex Flex Because
  | Twice Flex Because
