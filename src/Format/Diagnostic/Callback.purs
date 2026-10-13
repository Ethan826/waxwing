module Format.Diagnostic.Callback (headline, hint) where

import Prelude
import Data.Maybe (Maybe, maybe)

-- FX017, the user's wording (approved 2026-10-12): a callback's row lacks a
-- label of its caller's. `callee` is the callback's name, when it is a
-- parameter; the labels arrive printed, joined by ` + `.
headline ∷ Maybe String → String → String → Maybe String → String
headline callee function caller own = subject callee
  <> " must allow every effect of "
  <> function
  <> " ("
  <> caller
  <> "), but its row "
  <> maybe "has no labels" rowIs own
  where
  rowIs labels = "is " <> labels

-- What to write instead: the caller's row, for a callback that has a name.
hint ∷ Maybe String → String → String
hint callee caller = maybe anonymous written callee
  where
  anonymous = "a function value's row must equal its caller's (FX017)"
  written name = "write " <> name <> "'s row as `with " <> caller
    <> "`; a callback's row must equal its caller's (FX017)"

subject ∷ Maybe String → String
subject = maybe "this function value" identity
