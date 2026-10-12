module Format.Diagnostic.Mark
  ( deferFails
  , deferVariable
  , expected
  , handlerFails
  ) where

import Prelude
import Domain.Problem (AbortCause(..), TypeName)

-- The texts of the mark check (FX008 design §3.6). Labels arrive printed.
deferFails ∷ String → String
deferFails label = "defer must not fail, but it performs " <> label
  <> ", whose handler may fail"

deferVariable ∷ String → String → String
deferVariable variable label = "defer must not fail, but it performs nofail("
  <> variable
  <> ") "
  <> label
  <> ", whose handler is fail-free only when the caller's is"

expected ∷ String → String → String
expected wanted found = "Expected " <> wanted <> ", found " <> found

-- `typeName` renders the payload of a failing clause.
handlerFails ∷ (TypeName → String) → AbortCause → String
handlerFails typeName cause = "This handler may fail here: its clause for "
  <> case cause of
    ClauseFails operation payload → operation <> " fails with "
      <> typeName payload
    ClauseMayPerform operation tail → operation
      <> " may perform any effect of "
      <> tail
