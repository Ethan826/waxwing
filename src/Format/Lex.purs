module Format.Lex
  ( module Format.Lex.Token
  , lex
  , module Exports
  , isName
  , endPosition
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.String.CodePoints as CodePoints
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, origin, problemAt)
import Format.Lex.Chars (isUpper) as Exports
import Format.Lex.Chars
  ( hashesEnd
  , isDigit
  , isLetter
  , isNameChar
  , isSpace
  , lineBreak
  , pairStart
  , punctuation
  , reserved
  , twoCharacter
  )
import Format.Lex.Scan
  ( Scan
  , Scanned
  , atBreak
  , closed
  , emit
  , finish
  , lined
  , opened
  , quoted
  , start
  )
import Format.Lex.Token (Token, TokenKind(..))
import Format.Stack as Stack

lex ∷ String → Either Diagnostic (Array Token)
lex source = tailRecM (scan source) start

-- The parser asks this of most tokens it dispatches on, so the text is
-- read in place rather than copied into a character array (T003).
isName ∷ String → Boolean
isName text = maybe false validName (String.charAt 0 text)
  where
  validName head = isLetter head
    && wordEnd text isNameChar 1 == String.length text
    && not (reserved text)

endPosition ∷ String → Position
endPosition = Array.foldl advance origin <<< String.toCharArray

-- One run of whitespace or one token per step. tailRecM runs the steps as
-- a loop, and indexing replaces Array.uncons, which copied the remaining
-- input per character (BACKLOG E002). The source is read in place, by
-- code unit: a token's text is a slice of it, not a rebuilt character
-- array (T003).
scan ∷ String → Scan → Scanned
scan source state = maybe' finished (scanAt source state)
  (String.charAt state.index source)
  where
  finished _ = finish state

scanAt ∷ String → Scan → Char → Scanned
scanAt source state head
  | isSpace head = maybe (continue (spaces source state)) Left
      (atBreak state head)
  | isLetter head = continue (word source state isNameChar)
  | isDigit head = continue (word source state isDigit)
  | head == '"' = quoted source state
  | head == '#', rawStart source state.index = quoted source state
  | head == '{' = continue (opened state)
  | head == '}' = closed source state
  | head == '.', String.slice state.index (state.index + 3) source == "..." =
      continue (emit "..." state)
  | head == '.', afterNumber state = unexpected source state
  | pairStart head, Just text ← twoCharacter source state.index =
      continue (emit text state)
  | punctuation head = continue (emit (String.singleton head) state)
  | otherwise = unexpected source state

-- A `.` directly after an integer literal is a decimal point, which the
-- language lacks (`1.5`): E_LEX as before `.` became a token. Only a
-- literal is refused, so `r.field` on a lowercase receiver stays open.
afterNumber ∷ Scan → Boolean
afterNumber state = maybe false numberEndsHere (Stack.unpush state.tokens)
  where
  numberEndsHere top = maybe false isDigit (String.charAt 0 top.item.text)
    && top.item.span.end.offset == state.position.offset

-- `#`s, then the quote of a raw or extended literal.
rawStart ∷ String → Int → Boolean
rawStart source index =
  String.charAt (hashesEnd source index) source == Just '"'

continue ∷ Scan → Scanned
continue state = Right (Loop state)

-- A whole run of whitespace is one step (T003): a step per character was
-- most of lexing an indented source.
spaces ∷ String → Scan → Scan
spaces source state = state
  { index = skipped.index, position = skipped.position }
  where
  skipped = spaceEnd (lined state) source state.index state.position

-- A self tail call, which purs compiles to a loop.
spaceEnd
  ∷ Boolean → String → Int → Position → { index ∷ Int, position ∷ Position }
spaceEnd within source index position
  | Just next ← spaceStep within position (String.charAt index source) =
      spaceEnd within source (index + 1) next
  | otherwise = { index, position }

-- The position after `found` if it is whitespace. A run inside an
-- ordinary hole stops at a line break, which ends the hole (`within`).
spaceStep ∷ Boolean → Position → Maybe Char → Maybe Position
spaceStep within position found = found >>= stepped
  where
  stepped character =
    if isSpace character && not (within && lineBreak character) then
      Just (advance position character)
    else Nothing

-- The span covers the whole code point, so a character outside the BMP is
-- two units (Text v1 design §2).
unexpected ∷ String → Scan → Scanned
unexpected source state = Left (problemAt Lexical span)
  where
  width = String.length
    (CodePoints.take 1 (String.slice state.index (state.index + 2) source))
  span = { start: state.position, end: moved }
  moved = state.position
    { offset = state.position.offset + width
    , column = state.position.column + width
    }

word ∷ String → Scan → (Char → Boolean) → Scan
word source state predicate = emit text state
  where
  end = wordEnd source predicate state.index
  text = String.slice state.index end source

-- A self tail call, which purs compiles to a loop.
wordEnd ∷ String → (Char → Boolean) → Int → Int
wordEnd source predicate index =
  if maybe false predicate (String.charAt index source) then
    wordEnd source predicate (index + 1)
  else index

advance ∷ Position → Char → Position
advance position character =
  if character == '\n' then
    nextLine
  else nextColumn
  where
  nextLine = { offset: position.offset + 1, line: position.line + 1, column: 1 }
  nextColumn = position
    { offset = position.offset + 1, column = position.column + 1 }
