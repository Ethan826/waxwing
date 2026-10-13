module Format.Lex.Text (Literal, literal) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Enum (toEnum)
import Data.Int (fromStringAs, hexadecimal)
import Data.Maybe (Maybe(..), maybe)
import Data.String.CodePoints as CodePoints
import Data.String.CodeUnits as String
import Data.String.Common (joinWith)
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, Span, problemAt)
import Format.Lex.Token (Token, TokenKind(..))
import Format.Stack (Stack)
import Format.Stack as Stack

-- Ordinary single-line literals (Text v1 design §1). Everything this
-- scanner classifies is ASCII (`"`, `\`, `$`, line breaks, hex digits), and
-- no UTF-16 surrogate unit is ASCII, so it walks code units and copies
-- other characters through whole; only an escape's offending character is
-- read as a code point. Offsets and columns are UTF-16 units throughout,
-- and a literal never leaves its line, so a position is the opening
-- quote's plus a distance in units.
type Literal = { tokens ∷ Array Token, index ∷ Int, position ∷ Position }

-- The literal's opening quote is at `index`, at `open`.
type Origin = { source ∷ String, index ∷ Int, open ∷ Position }

type Walk = { at ∷ Int, from ∷ Int, pieces ∷ Stack String }
type Body = { decoded ∷ String, close ∷ Int }
type Decoded = { text ∷ String, next ∷ Int }

maximumScalar ∷ Int
maximumScalar = 0x10FFFF

firstSurrogate ∷ Int
firstSurrogate = 0xD800

lastSurrogate ∷ Int
lastSurrogate = 0xDFFF

maximumDigits ∷ Int
maximumDigits = 6

literal ∷ String → Int → Position → Either Diagnostic Literal
literal source index open = map tokensOf (tailRecM (walk origin) start)
  where
  origin = { source, index, open }
  start = { at: index + 1, from: index + 1, pieces: Stack.empty }
  tokensOf body = finished origin body

finished ∷ Origin → Body → Literal
finished origin body =
  { tokens: Array.catMaybes [ Just opening, chunk, Just closing ]
  , index: body.close + 1
  , position: positionAt origin (body.close + 1)
  }
  where
  start = origin.index + 1
  opening = quote origin origin.index TextOpen
  closing = quote origin body.close TextClose
  chunk =
    if body.close == start then Nothing
    else Just
      { text: String.slice start body.close origin.source
      , span: spanOf origin start body.close
      , kind: TextChunk body.decoded
      }

quote ∷ Origin → Int → TokenKind → Token
quote origin at kind =
  { text: "\"", span: spanOf origin at (at + 1), kind }

walk ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
walk origin state = case markAt origin.source state.at of
  Ended → unterminated origin
  Quote → Right (Done (closed origin state))
  LineEnd → lineBreak origin state.at
  Backslash → map (resumed origin state) (escape origin state.at)
  Other _ → Right (Loop state { at = state.at + 1 })

-- What the character at an index means to the scanner.
data Mark = Ended | Quote | LineEnd | Backslash | Other Char

markAt ∷ String → Int → Mark
markAt source index = maybe Ended marked (String.charAt index source)

marked ∷ Char → Mark
marked = case _ of
  '"' → Quote
  '\n' → LineEnd
  '\r' → LineEnd
  '\\' → Backslash
  character → Other character

closed ∷ Origin → Walk → Body
closed origin state =
  { decoded: joined (Stack.push (run origin state.from state.at) state.pieces)
  , close: state.at
  }

-- The plain run before the escape, then the escape's text.
resumed ∷ Origin → Walk → Decoded → Step Walk Body
resumed origin state decoded = Loop
  { at: decoded.next
  , from: decoded.next
  , pieces: Stack.push decoded.text before
  }
  where
  before = Stack.push (run origin state.from state.at) state.pieces

joined ∷ Stack String → String
joined pieces = joinWith "" (Array.fromFoldable pieces)

run ∷ Origin → Int → Int → String
run origin from to = String.slice from to origin.source

-- The escape starting at the backslash at `at`.
escape ∷ Origin → Int → Either Diagnostic Decoded
escape origin at = case markAt origin.source (at + 1) of
  Ended → unterminated origin
  LineEnd → lineBreak origin (at + 1)
  Quote → simple at "\""
  Backslash → simple at "\\"
  Other 'u' → unicode origin at
  Other found → maybe (unknown origin at) (simple at) (simpleEscape found)

simple ∷ Int → String → Either Diagnostic Decoded
simple at text = Right { text, next: at + 2 }

simpleEscape ∷ Char → Maybe String
simpleEscape = case _ of
  'n' → Just "\n"
  't' → Just "\t"
  'r' → Just "\r"
  '$' → Just "$"
  _ → Nothing

-- `\q`, quoting the whole code point after the backslash.
unknown ∷ Origin → Int → Either Diagnostic Decoded
unknown origin at = invalid origin at (at + 1 + width) "Unknown escape "
  where
  width = String.length (CodePoints.take 1 (run origin (at + 1) (at + 3)))

-- `\u{H…}`: 1 to 6 hex digits naming a scalar value. The escape runs
-- through its `}`, or ends at the first character that is neither a hex
-- digit nor `}`.
unicode ∷ Origin → Int → Either Diagnostic Decoded
unicode origin at =
  if String.charAt (at + 2) origin.source /= Just '{' then
    invalid origin at (at + 2) "Unknown escape "
  else scalar origin at digitsEnd closedAt
  where
  digitsEnd = hexEnd origin.source (at + 3)
  closedAt = String.charAt digitsEnd origin.source == Just '}'

scalar ∷ Origin → Int → Int → Boolean → Either Diagnostic Decoded
scalar origin at digitsEnd closedAt =
  if not closedAt then bad digitsEnd
  else if digitCount < 1 || digitCount > maximumDigits then bad closeEnd
  else maybe (bad closeEnd) (decoded closeEnd) value
  where
  bad end = invalid origin at end "Invalid Unicode escape "
  closeEnd = digitsEnd + 1
  digitCount = digitsEnd - (at + 3)
  value = fromStringAs hexadecimal (run origin (at + 3) digitsEnd)
    >>= validScalar
    >>= toEnum
  decoded next point = Right { text: CodePoints.singleton point, next }

validScalar ∷ Int → Maybe Int
validScalar number =
  if number > maximumScalar then Nothing
  else if number >= firstSurrogate && number <= lastSurrogate then Nothing
  else Just number

-- A self tail call, which purs compiles to a loop.
hexEnd ∷ String → Int → Int
hexEnd source index =
  if maybe false hexDigit (String.charAt index source) then
    hexEnd source (index + 1)
  else index

hexDigit ∷ Char → Boolean
hexDigit character = character >= '0' && character <= '9'
  || character >= 'a' && character <= 'f'
  || character >= 'A' && character <= 'F'

invalid ∷ ∀ a. Origin → Int → Int → String → Either Diagnostic a
invalid origin from to prefix = Left
  ( problemAt (Syntax (prefix <> run origin from to))
      (spanOf origin from to)
  )

unterminated ∷ ∀ a. Origin → Either Diagnostic a
unterminated origin = Left
  ( problemAt (Syntax "Unterminated text literal")
      (spanOf origin origin.index (origin.index + 1))
  )

-- From the opening quote to the line break.
lineBreak ∷ ∀ a. Origin → Int → Either Diagnostic a
lineBreak origin at = Left
  ( problemAt
      (Syntax "Text cannot contain a line break; use \\n or a \"\"\" block")
      (spanOf origin origin.index at)
  )

spanOf ∷ Origin → Int → Int → Span
spanOf origin from to =
  { start: positionAt origin from, end: positionAt origin to }

positionAt ∷ Origin → Int → Position
positionAt origin at = origin.open
  { offset = origin.open.offset + distance
  , column = origin.open.column + distance
  }
  where
  distance = at - origin.index
