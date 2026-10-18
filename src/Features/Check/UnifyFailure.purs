module Features.Check.UnifyFailure (Failure(..), Refusal(..)) where

import Prim hiding (Row)
import Domain.Row (Label)
import Domain.Type (Ty, TyRow)
import Features.Check.Occurrence (OccurrenceId)
import Data.Maybe (Maybe)
import Features.Check.Because (Because, Pair, WrittenLack)
import Features.Check.Flex (Flex)

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
-- the E_INTERNAL it is reported as.
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

-- A fact of the row store broken, with its reason. `Forbidden` (R005):
-- a label bound into a record tail that a written `lacks` forbids it.
-- Tranche B (design §3, §10): `Overlap`, a label bound into a tail that
-- lacks it because of a pair, with the pair's reason and the meta whose
-- binding brought the label (D2); `MayHold`, a signature's rigid tail
-- asked to lack a label a pair needs (D3''); `Unproven`, two rigid tails
-- asked to be disjoint without the hypothesis (D3); `Twice`, one rigid
-- tail asked to be disjoint from itself (D3'). Each keeps its reason.
data Refusal
  = Forbidden String WrittenLack
  | Overlap String Pair (Maybe Int)
  | MayHold Flex String Because
  | Unproven Flex Flex Because
  | Twice Flex Because
