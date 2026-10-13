module Format.Diagnostic.Callback (headline, hint) where

import Prelude
import Data.Maybe (Maybe, maybe)
import Domain.Problem (CallbackKind(..))

-- FX017 and FX018, the user's wording (approved 2026-10-12 and 2026-10-13):
-- a callback's row lacks a label it must allow. `callee` is the callback's
-- name, when it is a parameter; `subject` is the caller, or the function
-- and parameter an argument is passed to (empty when unnamed); the labels
-- arrive printed, joined by ` + `.
headline ∷ CallbackKind → Maybe String → String → String → Maybe String → String
headline kind callee at row own = whoever callee
  <> " must allow every effect "
  <> place kind at
  <> " ("
  <> row
  <> "), but its row "
  <> maybe "has no labels" rowIs own
  where
  rowIs labels = "is " <> labels

place ∷ CallbackKind → String → String
place kind at = case kind of
  OfCaller → "of " <> at
  AtCall → "at this call"
  AsArgument
    | at == "" → "of the parameter it is passed to"
    | otherwise → "of " <> at

-- What to write instead: the row, for a callback that has a name; the
-- rule it breaks, either way.
hint ∷ CallbackKind → Maybe String → String → String
hint kind callee row = maybe anonymous written callee
  where
  anonymous = "a function value" <> rule kind
  written who = "write " <> who <> "'s row as `with " <> row <> "`; a "
    <> noun kind
    <> rule kind
  noun = case _ of
    AsArgument → "function"
    _ → "callback"

rule ∷ CallbackKind → String
rule = case _ of
  OfCaller → "'s row must equal its caller's (FX017)"
  AtCall → "'s row must equal the row where it is called (FX018)"
  AsArgument → " passed as an argument must have its parameter's row (FX018)"

whoever ∷ Maybe String → String
whoever = maybe "this function value" identity
