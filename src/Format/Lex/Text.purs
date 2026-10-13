module Format.Lex.Text
  ( Literal
  , Hole
  , Closing
  , literal
  , resume
  ) where

import Prelude
import Control.Monad.Rec.Class (tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.String.CodeUnits as String
import Domain.Problem (Problem(..))
import Domain.Syntax (Diagnostic, Position, problemAt)
import Format.Lex.Chars (hashesEnd, lineBreak)
import Format.Lex.Origin
  ( Origin
  , Shape
  , Start
  , openSpan
  , openWidth
  , unterminated
  , positionAt
  , run
  , spanOf
  )
import Format.Lex.Token (Token, TokenKind(..))
import Format.Lex.Run (Body, Ends(..), begin)
import Format.Lex.Walk (walk)

-- Literals (Text v1 design §1). Offsets and columns are UTF-16 units
-- throughout (Format.Lex.Origin). The parser dispatches on a token's text,
-- so every delimiter is `"`, `${` or `"` whatever `#`s it was written with;
-- its span covers all of them.
-- `closing` is a block's closing line's indent, once the block has closed:
-- its lines are then dedented (Format.Lex.Dedent).
type Literal =
  { tokens ∷ Array Token
  , index ∷ Int
  , position ∷ Position
  , hole ∷ Maybe Hole
  , closing ∷ Maybe Closing
  }

type Closing = { indent ∷ String, shape ∷ Shape }

-- A `${` the scanner is inside: the opening delimiter of the literal it
-- belongs to, the `$`, the braces opened in the hole and not yet closed,
-- and what the literal needs to resume after it. A `"""` literal's holes
-- may span lines (`shape.block`); an ordinary literal's may not.
type Hole =
  { quote ∷ Start
  , dollar ∷ Start
  , braces ∷ Int
  , shape ∷ Shape
  , last ∷ Maybe Start
  }

-- `enclosing` is the `$` of the hole this literal is in, if any.
literal ∷ String → Int → Position → Maybe Start → Either Diagnostic Literal
literal source index open enclosing =
  opening origin >>= scannedFrom origin
  where
  hashes = hashesEnd source index - index
  quote = index + hashes
  block = String.slice (quote + 1) (quote + 3) source == "\"\""
  shape = { hashes, block }
  origin =
    { source
    , index
    , open
    , enclosing
    , base: { index, position: open }
    , shape
    , fresh: true
    , dedent: Nothing
    , stop: -1
    }

-- Where the text starts. A block's delimiter is followed by a line break.
opening ∷ Origin → Either Diagnostic Int
opening origin =
  if not origin.shape.block then Right after
  else if after >= String.length origin.source then
    unterminated origin after
  else if String.charAt after origin.source == Just '\n' then Right (after + 1)
  else if String.slice after (after + 2) origin.source == "\r\n" then
    Right (after + 2)
  else Left
    ( problemAt (Syntax "\"\"\" must be followed by a line break")
        (spanOf origin after (lineEnd origin.source after))
    )
  where
  after = origin.index + openWidth origin.shape

-- A self tail call, which purs compiles to a loop.
lineEnd ∷ String → Int → Int
lineEnd source index =
  if maybe false (not <<< lineBreak) (String.charAt index source) then
    lineEnd source (index + 1)
  else index

-- The rest of the literal that owns `hole`, from the character after its
-- `}`.
resume
  ∷ String
  → Hole
  → Start
  → Maybe Start
  → Either Diagnostic Literal
resume source hole from enclosing = scanned origin from.index hole.last
  where
  origin =
    { source
    , index: hole.quote.index
    , open: hole.quote.position
    , enclosing
    , base: from
    , shape: hole.shape
    , fresh: false
    , dedent: Nothing
    , stop: -1
    }

scannedFrom ∷ Origin → Int → Either Diagnostic Literal
scannedFrom origin from = scanned origin from Nothing

scanned ∷ Origin → Int → Maybe Start → Either Diagnostic Literal
scanned origin from carried = map (finished origin from)
  (tailRecM (walk origin) (begin origin from carried))

finished ∷ Origin → Int → Body → Literal
finished origin from body =
  { tokens: Array.catMaybes [ opened, chunk, Just ending ]
  , index: after
  , position: positionAt origin after
  , hole: case body.ends of
      Opens → Just hole
      _ → Nothing
  , closing: map (closing origin) body.indent
  }
  where
  width = openWidth origin.shape
  opens = case body.ends of
    Opens → true
    _ → false
  after = body.end + if opens then 2 + origin.shape.hashes else width
  opened =
    if origin.fresh then Just
      { text: "\""
      , span: openSpan origin
      , kind: TextOpen
      }
    else Nothing
  ending =
    { text: if opens then "${" else "\""
    , span: spanOf origin body.end after
    , kind: if opens then HoleOpen else TextClose
    }
  hole =
    { quote: { index: origin.index, position: origin.open }
    , dollar: { index: body.end, position: positionAt origin body.end }
    , braces: 0
    , shape: origin.shape
    , last: body.last
    }
  chunk =
    if body.chunkEnd == from then Nothing
    else Just
      { text: run origin from body.chunkEnd
      , span: spanOf origin from body.chunkEnd
      , kind: TextChunk body.decoded
      }

closing ∷ Origin → String → Closing
closing origin indent = { indent, shape: origin.shape }
