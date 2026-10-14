module Format.Parse.Cursor
  ( State
  , Parsed
  , Run
  , Continue
  , advance
  , skip
  , current
  , peekText
  , touchesQualifier
  , whileAt
  , nextSpan
  , failAt
  , expected
  , initialState
  , nestedAt
  , rootedAt
  , infixedAt
  , groupedAt
  , rightAt
  , separated
  , trailing
  , shifting
  , foldAt
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, maybe, maybe')
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, Span, origin, problemAt)
import Format.Lex (Token)
import Format.Stack (Stack)
import Format.Stack as Stack

-- The token cursor beneath Format.Parse.Grammar: reading the next token and
-- moving past it. Grammar is the only importer.

-- `lastEnd` is the end of the last consumed token; `spanned` ends there.
-- `depth` is the nesting level being parsed and `peak` the deepest level
-- reached since the enclosing nested position was entered (ADR 006).
-- `upcoming` is the next token's text (`<end>` past the last), read once
-- per token consumed: every dispatch and separator asks for it, and
-- looking it up each time was a measurable share of parsing (T003).
type State =
  { tokens ∷ Array Token
  , index ∷ Int
  , upcoming ∷ String
  , eof ∷ Position
  , lastEnd ∷ Position
  , depth ∷ Int
  , peak ∷ Int
  }

type Parsed a = { value ∷ a, rest ∷ State }

-- One production run from a state; the newtype hides it behind Apply.
type Run a = State → Either Diagnostic (Parsed a)

-- After a list item: resume (Loop) at the next item, end (Done) or fail.
type Continue = State → Either Diagnostic (Step State State)

-- Items so far, and the deepest level they reach as measured in the chain.
type Chaining a = { items ∷ Stack a, peak ∷ Int, rest ∷ State }

-- The parser reads tokens by index: Array.uncons copied the remaining tokens
-- on every take, which made parsing quadratic (BACKLOG E002).
initialState ∷ Array Token → Position → State
initialState tokens eof =
  { tokens
  , index: 0
  , upcoming: textAt tokens 0
  , eof
  , lastEnd: origin
  , depth: 0
  , peak: 0
  }

advance ∷ State → Token → State
advance state consumed = state
  { index = state.index + 1
  , upcoming = textAt state.tokens (state.index + 1)
  , lastEnd = consumed.span.end
  }

skip ∷ State → State
skip state = maybe state (advance state) (current state)

peekText ∷ State → String
peekText state = state.upcoming

-- A `.` directly after the token just consumed and directly before the
-- one after it: the shape of a qualifier `Effect.op` (FX020, R19).
touchesQualifier ∷ State → Boolean
touchesQualifier state = state.upcoming == "." && maybe false dotJoins
  (current state)
  where
  dotJoins dot = dot.span.start.offset == state.lastEnd.offset
    && maybe false (startsAt dot.span.end.offset)
      (Array.index state.tokens (state.index + 1))
  startsAt offset found = found.span.start.offset == offset

textAt ∷ Array Token → Int → String
textAt tokens index = maybe "<end>" tokenText (Array.index tokens index)
  where
  tokenText found = found.text

nextSpan ∷ State → Span
nextSpan state = maybe' endSpan tokenSpan (current state)
  where
  endSpan _ = { start: state.eof, end: state.eof }
  tokenSpan found = found.span

current ∷ State → Maybe Token
current state = Array.index state.tokens state.index

-- The message for a missing fixed token.
expected ∷ String → String
expected text = "Expected '" <> text <> "'"

failAt ∷ ∀ a. State → String → Either Diagnostic a
failAt state message = Left (problemAt (Syntax message) (nextSpan state))

-- Nesting bookkeeping (ADR 006); Grammar passes its `nestingLimit`.
nestedAt ∷ ∀ a. Int → Run a → Run a
nestedAt limit parser state
  | state.depth >= limit = tooDeep limit state
  | otherwise = map left (parser (enter state))
      where
      left parsed = parsed { rest = leave state parsed.rest }

rootedAt ∷ ∀ a. Run a → Run a
rootedAt parser state = parser (state { peak = state.depth })

infixedAt ∷ ∀ a. Int → Run a → Run a
infixedAt limit parser state
  | state.peak >= limit = tooDeep limit state
  | otherwise = parser (deepen state)

-- Parentheses around a type: one level deeper while parsed, so parsing
-- never recurses past the limit, but no level of their own once closed:
-- the type inside counts where the parentheses stand (FN001 design §1).
groupedAt ∷ ∀ a. Int → Run a → Run a
groupedAt limit parser state
  | state.depth >= limit = tooDeep limit state
  | otherwise = map closed (parser (enter state))
      where
      closed parsed = parsed { rest = ungroup state parsed.rest }

-- Each item is measured from the chain's depth; one followed by `operator`
-- is a parameter, one level deeper, checked at the operator once parsed;
-- the last is the result and is not (FN001 design §1). A loop, so a chain
-- of any length costs no recursion.
rightAt ∷ ∀ a. Int → String → Run a → Run { init ∷ Array a, last ∷ a }
rightAt limit operator item state =
  tailRecM step { items: Stack.empty, peak: state.peak, rest: state }
  where
  step chain = item (chain.rest { peak = chain.rest.depth })
    >>= after chain
  after chain parsed
    | peekText parsed.rest /= operator = Right (Done (finish chain parsed))
    | parsed.rest.peak >= limit = tooDeep limit parsed.rest
    | otherwise = Right (Loop (parameter chain parsed))
  parameter chain parsed =
    { items: Stack.push parsed.value chain.items
    , peak: max chain.peak (parsed.rest.peak + 1)
    , rest: skip parsed.rest
    }
  finish chain parsed =
    { value: { init: Array.fromFoldable chain.items, last: parsed.value }
    , rest: parsed.rest { peak = max chain.peak parsed.rest.peak }
    }

-- One level deeper, with its own peak; the caller checks the limit.
enter ∷ State → State
enter state = state { depth = state.depth + 1, peak = state.depth + 1 }

-- Back at the outer level; the outer peak keeps the deepest inner level.
leave ∷ State → State → State
leave outer inner =
  inner { depth = outer.depth, peak = max outer.peak inner.peak }

ungroup ∷ State → State → State
ungroup outer inner =
  inner { depth = outer.depth, peak = max outer.peak (inner.peak - 1) }

-- An infix operator makes everything parsed since the enclosing nested
-- position its left operand, one level deeper.
deepen ∷ State → State
deepen state = state { peak = state.peak + 1 }

tooDeep ∷ ∀ a. Int → State → Either Diagnostic a
tooDeep limit state =
  Left (problemAt (NestingTooDeep limit) (nextSpan state))

separated ∷ String → Continue
separated separator state =
  Right
    (if peekText state == separator then Loop (skip state) else Done state)

-- Items that each begin where `starts` holds; the item consumes it.
whileAt ∷ (State → Boolean) → Continue
whileAt starts state = Right (if starts state then Loop state else Done state)

trailing ∷ String → String → Continue
trailing separator close state
  | peekText state /= separator = Right (Done state)
  | peekText (skip state) == close = Right (Done (skip state))
  | otherwise = Right (Loop (skip state))

-- One of the operators after an operand: E_NESTING at the operator when
-- the operands before it would be pushed past the limit.
shifting ∷ Int → Array String → Continue
shifting limit operators state
  | not (Array.elem (peekText state) operators) = Right (Done state)
  | state.peak >= limit = tooDeep limit state
  | otherwise = Right (Loop (skip (deepen state)))

-- The first item runs directly; then one item per step: tailRecM runs the
-- steps as a loop, so lists of any length run in constant stack (BACKLOG
-- E002), and a one-item list never enters it (fewer frames per nesting).
foldAt ∷ ∀ a b. Continue → (a → b) → (b → a → b) → Run a → Run a → Run b
foldAt next first combine head item state = head state >>= begin
  where
  begin parsed = next parsed.rest >>= resume (first parsed.value)
  resume value (Loop rest) = tailRecM step { add: combine value, rest }
  resume value (Done rest) = Right { value, rest }
  step pending = item pending.rest >>= decide pending.add
  decide add parsed = map (after (add parsed.value)) (next parsed.rest)
  after value (Loop rest) = Loop { add: combine value, rest }
  after value (Done rest) = Done { value, rest }
