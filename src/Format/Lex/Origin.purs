module Format.Lex.Origin
  ( Origin
  , Start
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
import Data.Maybe (Maybe, maybe)
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, Span, problemAt)

-- A place in the source, with its position.
type Start = { index ∷ Int, position ∷ Position }

-- The literal's opening quote is at `index`, at `open`. `enclosing` is the
-- `$` of the hole the literal sits in, if any: a literal that runs out
-- inside a hole is that hole's failure, not its own (design §1).
type Origin =
  { source ∷ String, index ∷ Int, open ∷ Position, enclosing ∷ Maybe Start }

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

-- The source ended at `stop`.
unterminated ∷ ∀ a. Origin → Int → Either Diagnostic a
unterminated origin stop = Left
  (maybe own (stopped origin stop) origin.enclosing)
  where
  own = problemAt (Syntax "Unterminated text literal")
    (spanOf origin origin.index (origin.index + 1))

-- From the opening quote to the line break.
lineBreak ∷ ∀ a. Origin → Int → Either Diagnostic a
lineBreak origin at = Left (maybe own (stopped origin at) origin.enclosing)
  where
  own = problemAt
    (Syntax "Text cannot contain a line break; use \\n or a \"\"\" block")
    (spanOf origin origin.index at)

-- Inside a hole, a literal that ends its line or the file leaves the hole
-- itself unbalanced: from its `$` to where scanning stopped.
stopped ∷ Origin → Int → Start → Diagnostic
stopped origin stop hole = problemAt (Syntax "Unterminated interpolation")
  { start: hole.position, end: positionAt origin stop }

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
