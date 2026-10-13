module Format.Lex.Origin
  ( Origin
  , Mark(..)
  , markAt
  , run
  , invalid
  , unterminated
  , lineBreak
  , spanOf
  , positionAt
  ) where

import Prelude
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, Span, problemAt)

-- The literal's opening quote is at `index`, at `open`.
type Origin = { source ∷ String, index ∷ Int, open ∷ Position }

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

run ∷ Origin → Int → Int → String
run origin from to = String.slice from to origin.source

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
