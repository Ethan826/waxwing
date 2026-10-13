module Format.Lex.Escape (Decoded, escape) where

import Prelude
import Data.Either (Either(..))
import Data.Enum (toEnum)
import Data.Int (fromStringAs, hexadecimal)
import Data.Maybe (Maybe(..), maybe)
import Data.String.CodePoints as CodePoints
import Data.String.CodeUnits as String
import Domain.Syntax (Diagnostic)
import Format.Lex.Origin
  ( Mark(..)
  , Origin
  , invalid
  , lineBreak
  , markAt
  , run
  , unterminated
  )

type Decoded = { text ∷ String, next ∷ Int }

maximumScalar ∷ Int
maximumScalar = 0x10FFFF

firstSurrogate ∷ Int
firstSurrogate = 0xD800

lastSurrogate ∷ Int
lastSurrogate = 0xDFFF

maximumDigits ∷ Int
maximumDigits = 6

-- The escape starting at the backslash at `at`.
escape ∷ Origin → Int → Either Diagnostic Decoded
escape origin at = case markAt origin.source (at + 1) of
  Ended → unterminated origin (at + 1)
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

