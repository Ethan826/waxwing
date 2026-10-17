module Features.Check.Removal (checkRemoval) where

import Prelude
import Data.Either (Either(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, FieldName, Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (withoutLabels)
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.Record (select)
import Features.Check.SeveralTails (withinOneTail)
import Features.Check.Scheme (State, Threaded, resolved, threadAll)

type Checked a = Either Diagnostic (Threaded a)

-- R005 design §3: `e without { l, … }`. The receiver is checked, then
-- each label in written order is a field of it by `.l`'s rule (Check/
-- Record `select`): a hole receiver, or a hole tail, grows by the label
-- over a fresh tail lacking it. The result is the receiver's type
-- without the labels: the remaining fields and the tail, `{}` when no
-- field and no tail remain.
checkRemoval
  ∷ ∀ r
  . Infer r
  → CheckEnv r
  → State
  → Span
  → Resolved.Expr
  → Array FieldName
  → Checked Checked.Expr
checkRemoval infer env state span record labels = do
  found ← infer env state record
  withinOneTail (Checked.spanOf found.value) found.state.subst
    (Checked.typeOf found.value)
  selected ← threadAll (selectedIn found.value) found.state labels
  ty ← remainder span
    (resolved selected.state.subst (Checked.typeOf found.value))
    names
  pure
    { value: Checked.Expr
        { ty, span, node: Checked.RecordRemoval found.value names }
    , state: selected.state
    }
  where
  names = map labelName labels
  labelName label = label.name
  selectedIn receiver reached label = select env reached receiver label

-- Every label was selected, so the receiver's type is a record.
remainder ∷ Span → Ty Open → Array String → Either Diagnostic (Ty Open)
remainder span ty names = case ty of
  TRecord row → Right (TRecord (withoutLabels names row))
  _ → Left (problemAt (Internal "Removal from a non-record") span)
