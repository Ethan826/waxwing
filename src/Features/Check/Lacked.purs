module Features.Check.Lacked (lackedAt) where

import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, NoteReason(..), Span)
import Features.Check.Subst (WrittenLack)

-- R005 design §5: a label bound into a record tail that a written `where
-- r lacks { … }` forbids. Reported where the binding was required, which
-- for a call is its argument, with the note at the label in the clause.
-- Only the violated label is named, though the clause may list more.
lackedAt ∷ Span → String → WrittenLack → Diagnostic
lackedAt span label lack =
  { problem: LackedField label lack.variable
  , span
  , related: [ { span: lack.span, reason: RequiredHere } ]
  }
