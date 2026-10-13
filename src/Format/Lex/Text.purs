module Format.Lex.Text (Literal, Hole, literal, resume) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))
import Data.String.CodeUnits as String
import Data.String.Common (joinWith)
import Domain.Syntax (Diagnostic, Position)
import Format.Lex.Escape (Decoded, escape)
import Format.Lex.Origin
  ( Mark(..)
  , Origin
  , Start
  , lineBreak
  , markAt
  , positionAt
  , run
  , spanOf
  , unterminated
  )
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
type Literal =
  { tokens ∷ Array Token
  , index ∷ Int
  , position ∷ Position
  , hole ∷ Maybe Hole
  }

-- A `${` the scanner is inside: the quote of the literal it belongs to, the
-- `$`, and the braces opened in the hole and not yet closed. A `"""`
-- literal's holes may span lines (`block`); an ordinary literal's may not.
type Hole =
  { quote ∷ Start, dollar ∷ Start, braces ∷ Int, block ∷ Boolean }

-- One run of a literal: from the quote (`fresh`) or from the `}` that
-- closed a hole, through the next `${` or the closing quote.
type Segment = { origin ∷ Origin, fresh ∷ Boolean, from ∷ Int }

type Walk = { at ∷ Int, from ∷ Int, pieces ∷ Stack String }
type Body = { decoded ∷ String, end ∷ Int, opens ∷ Boolean }

-- `enclosing` is the `$` of the hole this literal is in, if any.
literal ∷ String → Int → Position → Maybe Start → Either Diagnostic Literal
literal source index open enclosing = scanned
  { origin: { source, index, open, enclosing }, fresh: true, from: index + 1 }

-- The rest of the literal that owns `hole`, from the index after its `}`.
resume ∷ String → Hole → Int → Maybe Start → Either Diagnostic Literal
resume source hole from enclosing = scanned { origin, fresh: false, from }
  where
  origin =
    { source
    , index: hole.quote.index
    , open: hole.quote.position
    , enclosing
    }

scanned ∷ Segment → Either Diagnostic Literal
scanned segment = map (finished segment) (tailRecM (walk segment.origin) start)
  where
  start = { at: segment.from, from: segment.from, pieces: Stack.empty }

finished ∷ Segment → Body → Literal
finished segment body =
  { tokens: Array.catMaybes [ opening, chunk, Just ending ]
  , index: after
  , position: positionAt origin after
  , hole: if body.opens then Just opened else Nothing
  }
  where
  origin = segment.origin
  after = body.end + if body.opens then 2 else 1
  opening =
    if segment.fresh then Just (quote origin origin.index TextOpen)
    else Nothing
  ending =
    if body.opens then
      { text: "${", span: spanOf origin body.end after, kind: HoleOpen }
    else quote origin body.end TextClose
  opened =
    { quote: { index: origin.index, position: origin.open }
    , dollar: { index: body.end, position: positionAt origin body.end }
    , braces: 0
    , block: false
    }
  chunk =
    if body.end == segment.from then Nothing
    else Just
      { text: run origin segment.from body.end
      , span: spanOf origin segment.from body.end
      , kind: TextChunk body.decoded
      }

quote ∷ Origin → Int → TokenKind → Token
quote origin at kind =
  { text: "\"", span: spanOf origin at (at + 1), kind }

walk ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
walk origin state = case markAt origin.source state.at of
  Ended → unterminated origin state.at
  Quote → Right (Done (closed origin state false))
  LineEnd → lineBreak origin state.at
  Backslash → map (resumed origin state) (escape origin state.at)
  Other '$' → Right (dollar origin state)
  Other _ → Right (Loop state { at = state.at + 1 })

-- `${` opens a hole; any other `$` is text.
dollar ∷ Origin → Walk → Step Walk Body
dollar origin state =
  if String.charAt (state.at + 1) origin.source == Just '{' then
    Done (closed origin state true)
  else Loop state { at = state.at + 1 }

closed ∷ Origin → Walk → Boolean → Body
closed origin state opens =
  { decoded: joined (Stack.push (run origin state.from state.at) state.pieces)
  , end: state.at
  , opens
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

