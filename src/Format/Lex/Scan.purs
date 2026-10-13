module Format.Lex.Scan
  ( Scan
  , Scanned
  , start
  , emit
  , quoted
  , opened
  , closed
  , finish
  , lined
  , atBreak
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..))
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, origin, problemAt)
import Format.Lex.Chars (lineBreak, nestingLimit)
import Format.Lex.Origin (Start)
import Format.Lex.Text (Hole, Literal, literal, resume)
import Format.Lex.Token (Token, TokenKind(..))
import Format.Stack (Stack)
import Format.Stack as Stack

-- The lexer's state. `holes` is the explicit stack of open `${` (Text v1
-- design §3), newest on top, and `depth` its size: nesting such as
-- `"${ "${ … }" }"` costs a stack entry, never host recursion.
type Scan =
  { index ∷ Int
  , position ∷ Position
  , tokens ∷ Stack Token
  , holes ∷ Stack Hole
  , depth ∷ Int
  }

type Scanned = Either Diagnostic (Step Scan (Array Token))

type Top = { item ∷ Hole, below ∷ Stack Hole }

start ∷ Scan
start =
  { index: 0
  , position: origin
  , tokens: Stack.empty
  , holes: Stack.empty
  , depth: 0
  }

-- Tokens never contain a newline, so a token only moves the column.
emit ∷ String → Scan → Scan
emit = emitAs Plain

emitAs ∷ TokenKind → String → Scan → Scan
emitAs kind text state = state
  { index = state.index + width
  , position = next
  , tokens = Stack.push token state.tokens
  }
  where
  width = String.length text
  next = state.position
    { offset = state.position.offset + width
    , column = state.position.column + width
    }
  token = { text, span: { start: state.position, end: next }, kind }

-- The `$` of the innermost open hole: a literal started now sits in it.
enclosing ∷ Scan → Maybe Start
enclosing state = map dollarOf (Stack.unpush state.holes)
  where
  dollarOf top = top.item.dollar

-- A whole run of a literal, as its tokens, is one step.
quoted ∷ String → Scan → Scanned
quoted source state =
  taken state (literal source state.index state.position (enclosing state))

taken ∷ Scan → Either Diagnostic Literal → Scanned
taken state result = result >>= pushed state

-- A literal that stopped at `${` leaves its hole open on the stack.
pushed ∷ Scan → Literal → Scanned
pushed state found = maybe (Right (Loop moved)) (entered moved) found.hole
  where
  moved = state
    { index = found.index
    , position = found.position
    , tokens = Array.foldl (flip Stack.push) state.tokens found.tokens
    }

-- E_NESTING at the `${` that is one hole too many.
entered ∷ Scan → Hole → Scanned
entered state hole
  | state.depth >= nestingLimit = Left
      ( problemAt (NestingTooDeep nestingLimit)
          { start: hole.dollar.position, end: state.position }
      )
  | otherwise = Right
      ( Loop
          state
            { holes = Stack.push hole state.holes, depth = state.depth + 1 }
      )

-- A `{`; inside a hole it is counted, so its `}` is not the hole's.
opened ∷ Scan → Scan
opened state = emit "{" (maybe state counted (Stack.unpush state.holes))
  where
  counted top = state
    { holes = Stack.push (top.item { braces = top.item.braces + 1 }) top.below
    }

-- A `}`: the hole's end when no brace opened in it is open, else a brace
-- like any other. Ending a hole resumes the literal that owns it.
closed ∷ String → Scan → Scanned
closed source state = maybe' plain (closing source state)
  (Stack.unpush state.holes)
  where
  plain _ = Right (Loop (emit "}" state))

closing ∷ String → Scan → Top → Scanned
closing source state top
  | top.item.braces > 0 = Right
      ( Loop
          ( emit "}"
              state
                { holes = Stack.push (top.item { braces = top.item.braces - 1 })
                    top.below
                }
          )
      )
  | otherwise =
      taken after
        (resume source top.item after.index (enclosing after))
      where
      after = emitAs HoleClose "}"
        state { holes = top.below, depth = state.depth - 1 }

-- The end of the source: done, unless a hole is still open.
finish ∷ Scan → Scanned
finish state = maybe' done unclosed (Stack.unpush state.holes)
  where
  done _ = Right (Done (Array.fromFoldable state.tokens))
  unclosed top = Left (unclosedAt state top.item)

-- Whether a line break ends the innermost hole's text, which is so for
-- every hole but a `"""` literal's.
lined ∷ Scan → Boolean
lined state = maybe false single (Stack.unpush state.holes)
  where
  single top = not top.item.block

-- The failure if `head` is a line break the innermost hole cannot cross.
atBreak ∷ Scan → Char → Maybe Diagnostic
atBreak state head = Stack.unpush state.holes >>= crossing
  where
  crossing top =
    if lineBreak head && not top.item.block then
      Just (unclosedAt state top.item)
    else Nothing

-- From the open `${` to where scanning stopped.
unclosedAt ∷ Scan → Hole → Diagnostic
unclosedAt state hole = problemAt (Syntax "Unterminated interpolation")
  { start: hole.dollar.position, end: state.position }
