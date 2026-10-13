module Format.Lex.Dedent (dedent) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Either (Either(..))
import Data.Foldable (foldr)
import Data.Maybe (Maybe(..), maybe, maybe')
import Domain.Syntax (Diagnostic)
import Format.Lex.Text (Closing)
import Format.Lex.Token (Token, TokenKind(..))
import Format.Lex.Run (begin)
import Format.Lex.Walk (walk)
import Format.Stack (Stack)
import Format.Stack as Stack

type Top = { item ∷ Token, below ∷ Stack Token }

-- The tokens read so far, newest on top, and those already passed on the
-- way back, with the hole depth at which the walk stands.
type Back = { rest ∷ Stack Token, kept ∷ Stack Token, depth ∷ Int }

-- A block's closing line gives the indent that every line loses, so only
-- once it has closed can its chunks be settled (design §1). This walks back
-- from the block's `TextClose`, which is on top of `tokens`, to its
-- `TextOpen`, and scans each chunk of the block itself again with the
-- indent: not those of the literals inside its holes, which closed earlier.
dedent
  ∷ String → Closing → Stack Token → Either Diagnostic (Stack Token)
dedent source closing tokens = tailRecM (back source closing)
  { rest: tokens, kept: Stack.empty, depth: 0 }

back
  ∷ String
  → Closing
  → Back
  → Either Diagnostic (Step Back (Stack Token))
back source closing state =
  maybe' done (visited source closing state) (Stack.unpush state.rest)
  where
  done _ = Right (Done (restored state.kept Stack.empty))

visited
  ∷ String
  → Closing
  → Back
  → Top
  → Either Diagnostic (Step Back (Stack Token))
visited source closing state top =
  visit source closing state top.item top.below

visit
  ∷ String
  → Closing
  → Back
  → Token
  → Stack Token
  → Either Diagnostic (Step Back (Stack Token))
visit source closing state item below = case item.kind of
  TextOpen | state.depth == 0 →
    Right (Done (restored (Stack.push item state.kept) below))
  HoleClose → Right (passed state item below 1)
  HoleOpen → Right (passed state item below (-1))
  TextChunk _ | state.depth == 0 →
    map (renewed state below) (rechunk source closing (follows below) item)
  _ → Right (passed state item below 0)

passed ∷ Back → Token → Stack Token → Int → Step Back (Stack Token)
passed state item below change = Loop
  { rest: below
  , kept: Stack.push item state.kept
  , depth: state.depth + change
  }

renewed
  ∷ Back → Stack Token → Token → Step Back (Stack Token)
renewed state below token = passed state token below 0

-- The first chunk is the one just after the block's `TextOpen`.
follows ∷ Stack Token → Boolean
follows below = maybe false opens (Stack.unpush below)
  where
  opens top = case top.item.kind of
    TextOpen → true
    _ → false

-- The oldest token is on top of `kept`, and is pushed first.
restored ∷ Stack Token → Stack Token → Stack Token
restored kept base = foldr Stack.push base kept

rechunk
  ∷ String → Closing → Boolean → Token → Either Diagnostic Token
rechunk source closing fresh token = map renewedText
  (tailRecM (walk origin) (begin origin from Nothing))
  where
  from = token.span.start.offset
  origin =
    { source
    , index: from
    , open: token.span.start
    , enclosing: Nothing
    , base: { index: from, position: token.span.start }
    , shape: closing.shape
    , fresh
    , dedent: Just closing.indent
    , stop: token.span.end.offset
    }
  renewedText body = token { kind = TextChunk body.decoded }
