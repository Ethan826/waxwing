-- A checked declaration's row, as the checker left it: resolved, its metas
-- as allocated. A body's holes are renumbered and this row is not, so raw
-- meta 0 here and hole 0 in the body can be different variables
-- (docs/plans/2026-11-04-holes-numbering-findings.md; dossier §18.163 (2)).
-- The constructor is not exported, so nothing compares or matches this
-- row against a numbered one by accident. There are three ways out: a map
-- that keeps it unnumbered, a reading of its arguments that must ignore
-- numbers, and `rawForRenumbering`, which `Features.Check.Trace.finish`
-- alone calls (test/r0-t2-unnumbered.test.mjs) to bring the row onto the
-- trace's numbering through its substitution and renumbering.
module Domain.Checked.Unnumbered
  ( UnnumberedRow
  , mappedUnnumbered
  , rawForRenumbering
  , unnumbered
  , unnumberedArguments
  ) where

import Domain.Type (Ty, TyRow)
import Domain.Type.Parts (rowArguments)

newtype UnnumberedRow v = UnnumberedRow (TyRow v)

unnumbered ∷ ∀ v. TyRow v → UnnumberedRow v
unnumbered = UnnumberedRow

mappedUnnumbered
  ∷ ∀ v w. (TyRow v → TyRow w) → UnnumberedRow v → UnnumberedRow w
mappedUnnumbered change (UnnumberedRow row) = UnnumberedRow (change row)

-- For readers that ignore variables' numbers: specialization asks only
-- whether an argument mentions a type variable.
unnumberedArguments ∷ ∀ v. UnnumberedRow v → Array (Ty v)
unnumberedArguments (UnnumberedRow row) = rowArguments row

-- The row for the trace's substitution and numbering to rewrite.
rawForRenumbering ∷ ∀ v. UnnumberedRow v → TyRow v
rawForRenumbering (UnnumberedRow row) = row
