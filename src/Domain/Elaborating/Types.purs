-- trusted surface: every diff needs token review; see docs/engineering.md
-- D1's plain data (docs/plans/r0-generation-continuation.md §3.2, §3.4,
-- §8.1; R0 Task 7.1): a tracked read, its sort, and the two kinds of
-- failure, a seal check's and `build`'s. No hidden constructor, so any
-- module may import it; it imports neither Internal module (no cycle).
module Domain.Elaborating.Types
  ( Bindings
  , ElabFault(..)
  , SealFault(..)
  , Use
  , UseSort(..)
  ) where

import Prelude
import Data.Map (Map)
import Domain.Recorded.Atom (CheckedName, Var)
import Domain.Verdict.Witness (Binding)

-- One read of the witness: the variable, the sort its position fixes
-- (N7) and the checked-IR site it lands at.
type Use = { var ∷ Var, sort ∷ UseSort, site ∷ CheckedName }

-- `EffectRowSort` is a handle in an effect-row tail. No variable has it
-- under §12.1's fallback (Task 7.1 ruling, 2026-10-23: E-a's witness
-- representation is open), so such a use always fails the seal check.
data UseSort = TypeSort | RecordSort | EffectRowSort

-- W §1.6's `Witness.bindings`.
type Bindings = Map Var Binding

-- §8.1's four, each excluded by a named premise, and a fifth by a
-- labelled amendment (Task 7.1a): Task 4.4's witness holds recorded
-- types (`Inline RTExpr`, Domain.Verdict.Witness), which may mention a
-- problem variable, where W's `Ty Open` could not. `ImageVariable v w`:
-- `v`'s image mentions `w`, neither rigid nor a hole. The online adapter
-- never makes one (its images are read back from checked types); no Cov
-- clause excludes it for other strategies (docs/plans/
-- r0-ea-representation.md).
data ElabFault
  = Unbound Var
  | SortMismatch Var
  | NamedUnread Var
  | DuplicateLabel Var String
  | ImageVariable Var Var

-- §3.4's seal faults, each found from `uses` and the generation logs
-- before any witness is read (§5 layer 2).
data SealFault
  = UntrackedRead Var
  | SortClash Var
  | AuxiliarySite
  | RigidSiteRead Var
  | DuplicateFresh Var
  | DuplicateSite CheckedName

derive instance eqUseSort ∷ Eq UseSort
derive instance ordUseSort ∷ Ord UseSort
derive instance eqElabFault ∷ Eq ElabFault
derive instance eqSealFault ∷ Eq SealFault
