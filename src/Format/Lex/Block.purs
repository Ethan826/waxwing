module Format.Lex.Block (lineStart, blockClose) where

import Prelude
import Control.Monad.Rec.Class (Step(..))
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.String.CodeUnits as String
import Data.String.Pattern (Pattern(..))
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, problemAt)
import Format.Lex.Origin (Mark(..), Origin, markAt, run, spanOf)
import Format.Lex.Run (Body, Ends(..), Walk, finished)
import Format.Stack as Stack

-- The start of a line when the indent is known: a blank line is dropped,
-- and any other loses the indent, which must be its exact prefix.
lineStart
  ∷ Origin → String → Walk → Either Diagnostic (Step Walk Body)
lineStart origin indent state = case markAt origin.source after of
  LineEnd → Right (Loop (moved after))
  _ → maybe under kept
    (String.stripPrefix (Pattern indent) (run origin state.at after))
  where
  after = blankEnd origin.source state.at
  under = Left
    ( problemAt
        (Syntax "This line is indented less than the closing \"\"\"")
        (spanOf origin state.at after)
    )
  kept _ = Right (Loop (moved (state.at + String.length indent)))
  moved to = state
    { at = to
    , from = to
    , pieces = Stack.push (run origin state.from state.at) state.pieces
    , line = false
    }

-- A self tail call, which purs compiles to a loop.
blankEnd ∷ String → Int → Int
blankEnd source index =
  if isBlank (String.charAt index source) then blankEnd source (index + 1)
  else index

isBlank ∷ Maybe Char → Boolean
isBlank found = found == Just ' ' || found == Just '\t'

-- The closing delimiter of a block must start its line. Its indent is that
-- line's whitespace, and the line, with the break before it, is not text.
blockClose ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
blockClose origin state =
  if ownLine then Right (Done (closedBlock origin state margin))
  else Left
    ( problemAt (Syntax "The closing \"\"\" must be on its own line")
        (spanOf origin state.at (state.at + 3 + origin.shape.hashes))
    )
  where
  margin = blankStart origin.source state.start state.at
  ownLine =
    if margin > state.start then
      String.charAt (margin - 1) origin.source == Just '\n'
    else origin.fresh

-- A self tail call, which purs compiles to a loop.
blankStart ∷ String → Int → Int → Int
blankStart source floor index =
  if index > floor && isBlank (String.charAt (index - 1) source) then
    blankStart source floor (index - 1)
  else index

closedBlock ∷ Origin → Walk → Int → Body
closedBlock origin state margin = finished origin state Closes textEnd
  (Just (run origin margin state.at))
  where
  textEnd =
    if margin <= state.start then state.start
    else if
      margin - 2 >= state.start
        && String.charAt (margin - 2) origin.source == Just '\r' then margin - 2
    else margin - 1
