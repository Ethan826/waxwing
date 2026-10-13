module Format.Lex.Text (Literal, literal) where

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
type Literal = { tokens ∷ Array Token, index ∷ Int, position ∷ Position }

type Walk = { at ∷ Int, from ∷ Int, pieces ∷ Stack String }
type Body = { decoded ∷ String, close ∷ Int }

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

