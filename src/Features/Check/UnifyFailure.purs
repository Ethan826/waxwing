module Features.Check.UnifyFailure (Failure(..)) where

import Prim hiding (Row)
import Domain.Row (Label)
import Domain.Type (Ty, TyRow)
import Features.Check.Occurrence (OccurrenceId)
import Features.Check.Subst (Flex)

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
-- row), apart from `Occurs`, whose meta is a type's.
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
