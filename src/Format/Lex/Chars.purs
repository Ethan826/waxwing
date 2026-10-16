module Format.Lex.Chars
  ( nestingLimit
  , punctuation
  , reserved
  , pairStart
  , twoCharacter
  , isSpace
  , lineBreak
  , isLetter
  , isDigit
  , isNameChar
  , isUpper
  , hashesEnd
  , repeated
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.String.CodeUnits as String

-- Deeper nesting is E_NESTING (ADR 006 derives the number from the measured
-- stack): the parser counts expression levels against it, and the lexer
-- counts the holes open at once.
nestingLimit ∷ Int
nestingLimit = 128

-- Membership is a `case`, which compiles to a chain of comparisons: the
-- lexer asks it of each punctuation character and the parser asks
-- `reserved` of each name it dispatches on, and Array.elem's closures were
-- a measurable share of parsing (T003).
punctuation ∷ Char → Boolean
punctuation = case _ of
  '(' → true
  ')' → true
  ':' → true
  ',' → true
  '=' → true
  ';' → true
  '+' → true
  '-' → true
  '|' → true
  '{' → true
  '}' → true
  '<' → true
  '>' → true
  -- `...` is matched before this (Format.Lex), so a lone `.` is one token.
  '.' → true
  _ → false

-- FX001 reserves its words at once (design §1), though later tasks parse
-- most of them; `pure` stays an ordinary name.
reserved ∷ String → Boolean
reserved = case _ of
  "fn" → true
  "if" → true
  "then" → true
  "else" → true
  "true" → true
  "false" → true
  "Int" → true
  "Bool" → true
  "type" → true
  "match" → true
  "_" → true
  "effect" → true
  "handler" → true
  "handle" → true
  "with" → true
  "let" → true
  "defer" → true
  "Unit" → true
  "Text" → true
  "ctl" → true
  "resume" → true
  -- R005 (design §2): `disjoint` is reserved with them so that Tranche B
  -- breaks no program a second time.
  "where" → true
  "lacks" → true
  "without" → true
  "disjoint" → true
  _ → false

-- The first characters of `twoCharacterTokens`.
pairStart ∷ Char → Boolean
pairStart = case _ of
  '=' → true
  '!' → true
  '<' → true
  '>' → true
  '-' → true
  '|' → true
  '+' → true
  _ → false

-- Two-character tokens win over their one-character prefixes: `->` over
-- the minus of a negative literal, `|>` over `|`. The pair is built once
-- and looked up, rather than each token's characters being compared with a
-- fresh slice of the input (T003).
twoCharacter ∷ String → Int → Maybe String
twoCharacter source index = Array.find (eq pair) twoCharacterTokens
  where
  pair = String.slice index (index + 2) source

twoCharacterTokens ∷ Array String
twoCharacterTokens = [ "=>", "==", "!=", "<=", ">=", "->", "|>", "++" ]

isSpace ∷ Char → Boolean
isSpace character = character == ' ' || character == '\n'
  || character == '\r'
  || character == '\t'

isLetter ∷ Char → Boolean
isLetter character = character >= 'a' && character <= 'z'
  || character >= 'A' && character <= 'Z'
  || character == '_'

isDigit ∷ Char → Boolean
isDigit character = character >= '0' && character <= '9'

isNameChar ∷ Char → Boolean
isNameChar character = isLetter character || isDigit character

isUpper ∷ String → Boolean
isUpper text = maybe false upper (String.charAt 0 text)
  where
  upper character = character >= 'A' && character <= 'Z'

lineBreak ∷ Char → Boolean
lineBreak character = character == '\n' || character == '\r'

-- The index after the run of `#`s that starts at `index`. A self tail call,
-- which purs compiles to a loop.
hashesEnd ∷ String → Int → Int
hashesEnd source index =
  if String.charAt index source == Just '#' then hashesEnd source (index + 1)
  else index

-- `count` copies of a character.
repeated ∷ Char → Int → String
repeated character count = String.fromCharArray
  (Array.replicate count character)
