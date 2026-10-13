module Format.Lex.Origin
  ( Origin
  , Shape
  , Start
  , Mark(..)
  , markAt
  , run
  , invalid
  , unterminated
  , runOut
  , lineBreak
  , mismatch
  , spanOf
  , openSpan
  , positionAt
  , openWidth
  ) where

import Prelude
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), isNothing, maybe, maybe')
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, Span, problemAt)
import Format.Lex.Chars (hashesEnd, repeated)

-- A place in the source, with its position.
type Start = { index ∷ Int, position ∷ Position }

-- A literal's delimiter: `hashes` `#`s around the quote, and whether the
-- quote is `"""` (Text v1 design §1).
type Shape = { hashes ∷ Int, block ∷ Boolean }

-- The literal's opening delimiter starts at `index`, at `open`. `base` is a
-- place of the segment being scanned whose position is known, and every
-- position is derived from it: the delimiter for a segment that starts the
-- literal, the character after a hole's `}` for one that resumes it.
-- `enclosing` is the `$` of the hole the literal sits in, if any: a
-- literal that runs out inside a hole is that hole's failure, not its own
-- (design §1). `fresh` is whether the segment starts a line (a block's
-- first). `dedent` is a block's indent once known, which a second scan
-- removes from each line up to `stop`.
type Origin =
  { source ∷ String
  , index ∷ Int
  , open ∷ Position
  , enclosing ∷ Maybe Start
  , base ∷ Start
  , shape ∷ Shape
  , fresh ∷ Boolean
  , dedent ∷ Maybe String
  , stop ∷ Int
  }

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
  own = problemAt (Syntax "Unterminated text literal") (openSpan origin)

-- A literal with `#`s that ends without closing, at the end of its line or
-- of the file: the error is at its last quote, if it has one (design §1,
-- "Termination").
runOut ∷ ∀ a. Origin → Int → Maybe Start → Either Diagnostic a
runOut origin stop last =
  if origin.shape.hashes > 0 && isNothing origin.enclosing then
    maybe' plain mismatched last
  else plain unit
  where
  plain _ = unterminated origin stop
  mismatched quote =
    mismatch origin quote 1
      (hashesEnd origin.source (quote.index + 1) - quote.index - 1)

-- From the opening delimiter to the line break.
lineBreak ∷ ∀ a. Origin → Int → Either Diagnostic a
lineBreak origin at = Left (maybe own (stopped origin at) origin.enclosing)
  where
  own = problemAt
    (Syntax "Text cannot contain a line break; use \\n or a \"\"\" block")
    { start: along origin.open 0, end: positionAt origin at }

-- A closing quote with the wrong number of `#`s: `quotes` quotes and
-- `found` `#`s at `quote`, where the literal's own closing was expected.
mismatch ∷ ∀ a. Origin → Start → Int → Int → Either Diagnostic a
mismatch origin quote quotes found = Left
  (problemAt (Syntax ("Expected " <> closing <> ", found " <> seen)) span)
  where
  closing = repeated '"' (if origin.shape.block then 3 else 1)
    <> repeated '#' origin.shape.hashes
  seen = repeated '"' quotes <> repeated '#' found
  width = quotes + found
  span =
    { start: quote.position
    , end: along quote.position width
    }

-- Inside a hole, a literal that ends its line or the file leaves the hole
-- itself unbalanced: from its `$` to where scanning stopped.
stopped ∷ Origin → Int → Start → Diagnostic
stopped origin stop hole = problemAt (Syntax "Unterminated interpolation")
  { start: hole.position, end: positionAt origin stop }

spanOf ∷ Origin → Int → Int → Span
spanOf origin from to =
  { start: positionAt origin from, end: positionAt origin to }

-- The opening delimiter, which is on one line.
openSpan ∷ Origin → Span
openSpan origin =
  { start: along origin.open 0
  , end: along origin.open (openWidth origin.shape)
  }

-- The position `distance` units further along a line.
along ∷ Position → Int → Position
along position distance = position
  { offset = position.offset + distance
  , column = position.column + distance
  }

-- The `#`s and the quote or quotes of a delimiter.
openWidth ∷ Shape → Int
openWidth shape = shape.hashes + if shape.block then 3 else 1

-- A line literal stays on one line, so a distance in units moves its
-- column; a block's line breaks are counted from `base` (design §2).
positionAt ∷ Origin → Int → Position
positionAt origin at =
  if origin.shape.block then
    travel origin.source origin.base.index at origin.base.position
  else along origin.base.position distance
  where
  distance = at - origin.base.index

-- A self tail call, which purs compiles to a loop. An LF starts the next
-- line; a CR is a column like any other unit.
travel ∷ String → Int → Int → Position → Position
travel source index stop position =
  if index >= stop then position
  else travel source (index + 1) stop (stepped position found)
  where
  found = String.charAt index source

stepped ∷ Position → Maybe Char → Position
stepped position found =
  if found == Just '\n' then
    { offset: position.offset + 1, line: position.line + 1, column: 1 }
  else position
    { offset = position.offset + 1, column = position.column + 1 }
