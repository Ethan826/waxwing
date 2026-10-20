module Features.Check.Removal (checkRemoval) where

import Prelude
import Data.Either (Either)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, FieldName, Span)
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.Record (select)
import Features.Check.Remainder (remainder)
import Features.Check.Scheme (State, Threaded, threadAll)

type Checked a = Either Diagnostic (Threaded a)

-- R005 design §3: `e without { l, … }`. The receiver is checked, then
-- each label in written order is a field of it by `.l`'s rule (Check/
-- Record `select`, whose texts are Tranche A's): a hole receiver, or a
-- hole tail, grows by the label over a fresh tail lacking it. The result
-- is what is left (Tranche B design §5.2, Task 7: ρ of one requirement
-- against `{ l1: α1, …, ...ρ }`, Features.Check.Remainder), `{}` when no
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
  selected ← threadAll (selectedIn found.value) found.state labels
  left ← remainder env selected.state (Checked.typeOf found.value) names
    span
  pure
    { value: Checked.Expr
        { ty: left.value, span, node: Checked.RecordRemoval found.value names }
    , state: left.state
    }
  where
  names = map labelName labels
  labelName label = label.name
  selectedIn receiver reached label = select env reached receiver label
