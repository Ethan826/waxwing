module Format.Diagnostic.Mark
  ( deferFails
  , deferVariable
  , expected
  , handlerFails
  , clausesReach
  , clausesMayPerform
  , clauseNote
  , signatureMayFail
  , markVariableHere
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

-- The notes along the path (FX008 design §3.6, plan Task 10).
clausesReach ∷ String → String
clausesReach label = "this handler's clauses perform " <> label
  <> ", whose handler may fail"

clausesMayPerform ∷ String → String
clausesMayPerform tail = "this handler's clauses may perform any effect of "
  <> tail

clauseNote ∷ (TypeName → String) → AbortCause → String
clauseNote typeName cause = "its clause for " <> case cause of
  ClauseFails operation payload → operation <> " fails with "
    <> typeName payload
  ClauseMayPerform operation tail → operation
    <> " may perform any effect of "
    <> tail

signatureMayFail ∷ String → String → String
signatureMayFail function label = "the signature of " <> function
  <> " allows a failing "
  <> label
  <> " handler; write with nofail "
  <> label

markVariableHere ∷ String → String → String
markVariableHere variable label = "nofail(" <> variable <> ") " <> label
  <> " is fail-free only when the caller's handler is"
