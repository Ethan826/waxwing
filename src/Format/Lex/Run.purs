module Format.Lex.Run
  ( Walk
  , Body
  , Ends(..)
  , begin
  , closed
  , finished
  , lastQuote
  , joined
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.String.Common (joinWith)
import Format.Lex.Origin (Origin, Start, positionAt, run)
import Format.Stack (Stack)
import Format.Stack as Stack

-- One run of a literal (Text v1 design §1): from the opening delimiter or
-- the `}` of a hole, through the next hole or the closing delimiter. The
-- scanner classifies only ASCII (`"`, `\`, `$`, `#`, line breaks, hex
-- digits), and no UTF-16 surrogate unit is ASCII, so it walks code units
-- and copies other characters through whole.
-- `start` is where the run's text starts, `from` where its plain part since
-- the last escape or line break does.
-- `quote` is the last quote that was content, in this run; `carried` the
-- one before it, from an earlier run. `line` is whether a line starts here.
type Walk =
  { at ∷ Int
  , start ∷ Int
  , from ∷ Int
  , pieces ∷ Stack String
  , line ∷ Boolean
  , quote ∷ Maybe Int
  , carried ∷ Maybe Start
  }

-- How a run ended: at its closing delimiter, at a hole, or (when scanning
-- again with a known indent) at the end of the text it was asked for.
data Ends = Closes | Opens | Stops

-- `chunkEnd` is where the run's text ends, which is `end` but for a block's
-- last run, whose closing line is not text. `indent` is that line's
-- whitespace; `last` the final content quote (Opens only).
type Body =
  { decoded ∷ String
  , end ∷ Int
  , ends ∷ Ends
  , chunkEnd ∷ Int
  , indent ∷ Maybe String
  , last ∷ Maybe Start
  }

begin ∷ Origin → Int → Maybe Start → Walk
begin origin from carried =
  { at: from
  , start: from
  , from
  , pieces: Stack.empty
  , line: origin.fresh
  , quote: Nothing
  , carried
  }

closed ∷ Origin → Walk → Ends → Body
closed origin state ends = finished origin state ends state.at Nothing

-- The run's text is through `chunkEnd`.
finished ∷ Origin → Walk → Ends → Int → Maybe String → Body
finished origin state ends chunkEnd indent =
  { decoded: joined (Stack.push (run origin state.from chunkEnd) state.pieces)
  , end: state.at
  , ends
  , chunkEnd
  , indent
  , last: if opens then lastQuote origin state else Nothing
  }
  where
  opens = case ends of
    Opens → true
    _ → false

lastQuote ∷ Origin → Walk → Maybe Start
lastQuote origin state = maybe state.carried (Just <<< startOf) state.quote
  where
  startOf index = { index, position: positionAt origin index }

joined ∷ Stack String → String
joined pieces = joinWith "" (Array.fromFoldable pieces)
