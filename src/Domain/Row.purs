module Domain.Row
  ( Row(..)
  , Label(..)
  , Mark(..)
  , HandlerRows
  , EffectRef(..)
  , LabelKey(..)
  , TypeHead(..)
  , closedRow
  , openRow
  , isPure
  , labelKey
  , labelMark
  , withMark
  , normalMark
  , mapHandlerRows
  , uniformRows
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..), isNothing)
import Domain.Ids (EffectId, TypeId)

-- An effect row (FX001 design §2): labels in order, with multiplicity,
-- and a tail variable, or `Nothing` when the row is closed. Rows are a
-- sort of their own, parameterized over the argument type `t` so that
-- Domain.Type can import this module rather than the other way round.
data Row t v = Row (Array (Label t)) (Maybe v)

-- An effect applied to its type arguments, `State(Int)`, `Fail(DbError)`,
-- and its mark (FX008 design §3.3), last so the derived order ranks by
-- effect first. `Plain` is nothing written (M in signatures and data, a
-- fresh meta in lambda annotations); `Unmarked` is Fail's placeholder and
-- every mark once Check has stripped them.
data Label t = Label EffectRef (Array t) Mark

data Mark = NoFail | Plain | MarkVariable String | MarkMeta Int | Unmarked

-- A handler type's two rows: the inference row R and the clause row C.
type HandlerRows t v = { inference ∷ Row t v, clauses ∷ Row t v }

data EffectRef = UserEffect EffectId | FailEffect | ConsoleEffect

-- What scoped labels match by (design §2 "Label keys"): the effect, except
-- that `Fail` is keyed by the declared identity of its payload's head, so
-- `Fail(Error(Int))` and `Fail(Error(Bool))` share a key.
data LabelKey = EffectKey EffectRef | FailKey TypeHead

data TypeHead = HeadInt | HeadBool | HeadUnit | HeadData TypeId

derive instance eqEffectRef ∷ Eq EffectRef
derive instance ordEffectRef ∷ Ord EffectRef
derive instance eqTypeHead ∷ Eq TypeHead
derive instance ordTypeHead ∷ Ord TypeHead
derive instance eqMark ∷ Eq Mark
derive instance ordMark ∷ Ord Mark
derive instance eqLabelKey ∷ Eq LabelKey
derive instance ordLabelKey ∷ Ord LabelKey
derive instance eqLabel ∷ Eq t ⇒ Eq (Label t)
derive instance ordLabel ∷ Ord t ⇒ Ord (Label t)
derive instance eqRow ∷ (Eq t, Eq v) ⇒ Eq (Row t v)
derive instance ordRow ∷ (Ord t, Ord v) ⇒ Ord (Row t v)

-- `pure`: no label and no tail.
closedRow ∷ ∀ t v. Row t v
closedRow = Row [] Nothing

-- Just the tail `v`, which substitution replaces by a whole row.
openRow ∷ ∀ t v. v → Row t v
openRow tail = Row [] (Just tail)

-- No label and no tail: every row until row syntax (FX001 Task 4), so the
-- passes over types test it first and skip the rest.
isPure ∷ ∀ t v. Row t v → Boolean
isPure (Row labels tail) = Array.null labels && isNothing tail

-- `Nothing` while a Fail payload's head is not a declared type (a
-- variable): the key is deferred until the head is known.
labelKey ∷ ∀ t. (t → Maybe TypeHead) → Label t → Maybe LabelKey
labelKey headOf (Label effect arguments _) = case effect of
  FailEffect → FailKey <$> (headOf =<< Array.head arguments)
  other → Just (EffectKey other)

labelMark ∷ ∀ t. Label t → Mark
labelMark (Label _ _ mark) = mark

withMark ∷ ∀ t. Mark → Label t → Label t
withMark mark (Label effect arguments _) = Label effect arguments mark

-- Console is always N and Fail never compared (design §3.3).
normalMark ∷ EffectRef → Mark → Mark
normalMark effect mark = case effect of
  ConsoleEffect → NoFail
  FailEffect → Unmarked
  UserEffect _ → mark

-- Both rows the same: a handler literal or written type, until clauses
-- have rows of their own (FX008 Task 7).
uniformRows ∷ ∀ t v. Row t v → HandlerRows t v
uniformRows row = { inference: row, clauses: row }

mapHandlerRows
  ∷ ∀ t v u w. (Row t v → Row u w) → HandlerRows t v → HandlerRows u w
mapHandlerRows change rows =
  { inference: change rows.inference, clauses: change rows.clauses }
