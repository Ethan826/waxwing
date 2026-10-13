module Format.Parse.Steps
  ( applyAt
  , mapAt
  , pureAt
  , takeAt
  , refineAt
  , spannedAt
  ) where

import Prelude
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Domain.Syntax (Diagnostic, Span)
import Format.Lex (Token)
import Format.Parse.Cursor (Run, advance, current, failAt, nextSpan)

-- The runs beneath the Grammar combinators: each steps a state without
-- looking at the Parser newtype that hides them behind Apply.

applyAt ∷ ∀ a b. Run (a → b) → Run a → Run b
applyAt function argument state = do
  applied ← function state
  given ← argument applied.rest
  pure { value: applied.value given.value, rest: given.rest }

mapAt ∷ ∀ a b. (a → b) → Run a → Run b
mapAt transform parser state = map mapped (parser state)
  where
  mapped parsed = parsed { value = transform parsed.value }

pureAt ∷ ∀ a. a → Run a
pureAt value state = Right { value, rest: state }

takeAt ∷ Run Token
takeAt state = maybe' missing taken (current state)
  where
  missing _ = failAt state "Expected a token"
  taken found = Right { value: found, rest: advance state found }

refineAt ∷ ∀ a b. (a → Either Diagnostic b) → Run a → Run b
refineAt check parser state = do
  parsed ← parser state
  value ← check parsed.value
  pure { value, rest: parsed.rest }

spannedAt ∷ ∀ a b. (Span → a → b) → Run a → Run b
spannedAt build parser state = map withSpan (parser state)
  where
  start = (nextSpan state).start
  withSpan parsed =
    { value: build { start, end: endOf parsed.rest } parsed.value
    , rest: parsed.rest
    }
  endOf rest = if rest.index == state.index then start else rest.lastEnd
