-- A checked declaration's row, as the checker left it: resolved, its metas
-- as allocated. A body's holes are renumbered and this row is not, so raw
-- meta 0 here and hole 0 in the body can be different variables
-- (docs/plans/2026-11-04-holes-numbering-findings.md; dossier §18.163 (2)).
-- The constructor is not exported, so nothing compares or matches this
-- row against a numbered one by accident. Each operation has its callers
-- pinned (test/r0-t2-unnumbered.test.mjs): a map that keeps it unnumbered,
-- a question that ignores numbers, and `rawForRenumbering`, by which
-- `Features.Check.Trace.finish` brings the row onto the trace's numbering
-- through its substitution and renumbering.
module Domain.Checked.Unnumbered
  ( UnnumberedRow
  , mappedUnnumbered
  , rawForRenumbering
  , unnumbered
  , unnumberedMentionsTypeVariable
  ) where

import Data.Array as Array
import Domain.Type (TyRow)
import Domain.Type.Parts (mentionsTypeVariable, rowArguments)

newtype UnnumberedRow v = UnnumberedRow (TyRow v)

unnumbered ∷ ∀ v. TyRow v → UnnumberedRow v
unnumbered = UnnumberedRow

mappedUnnumbered
  ∷ ∀ v w. (TyRow v → TyRow w) → UnnumberedRow v → UnnumberedRow w
mappedUnnumbered change (UnnumberedRow row) = UnnumberedRow (change row)

-- Specialization's question: whether an argument mentions a type variable.
-- The answer does not depend on any variable's number.
unnumberedMentionsTypeVariable ∷ ∀ v. UnnumberedRow v → Boolean
unnumberedMentionsTypeVariable (UnnumberedRow row) =
  Array.any mentionsTypeVariable (rowArguments row)

-- The row for the trace's substitution and numbering to rewrite.
rawForRenumbering ∷ ∀ v. UnnumberedRow v → TyRow v
rawForRenumbering (UnnumberedRow row) = row
