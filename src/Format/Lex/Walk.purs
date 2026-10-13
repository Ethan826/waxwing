module Format.Lex.Walk (walk) where

import Prelude
import Control.Monad.Rec.Class (Step(..))
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Data.String.CodeUnits as String
import Domain.Syntax (Diagnostic)
import Format.Lex.Block (blockClose, lineStart)
import Format.Lex.Chars (hashesEnd, repeated)
import Format.Lex.Escape (Decoded, escape)
import Format.Lex.Origin
  ( Mark(..)
  , Origin
  , invalid
  , lineBreak
  , markAt
  , mismatch
  , positionAt
  , run
  , runOut
  )
import Format.Lex.Run (Body, Ends(..), Walk, closed, lastQuote)
import Format.Stack as Stack

walk ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
walk origin state =
  if state.line then maybe' plain indented origin.dedent
  else stepped origin state
  where
  plain _ = stepped origin state
  indented indent = lineStart origin indent state

stepped ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
stepped origin state =
  if state.at == origin.stop then Right (Done (closed origin state Stops))
  else case markAt origin.source state.at of
    Ended → endOfFile origin state state.at
    Quote → quoted origin state
    LineEnd → broken origin state
    Backslash → slashed origin state
    Other '$' → dollar origin state
    Other _ → Right (Loop state { at = state.at + 1 })

-- A quote closes the literal when it is followed by exactly its `#`s. With
-- fewer it is text. With more it is the error `Expected "#, found "##`,
-- unless the literal has no `#`s, when the extra ones are not its own.
-- (A `where` binding is not in scope in a guard, so these are `if`s.)
quoted ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
quoted origin state =
  if origin.shape.block && not triple then content
  else if hashes == 0 || following == hashes then closing origin state
  else if following < hashes then content
  else mismatch origin (here state.at) quotes following
  where
  hashes = origin.shape.hashes
  quotes = if origin.shape.block then 3 else 1
  triple = String.slice (state.at + 1) (state.at + 3) origin.source == "\"\""
  following = hashesEnd origin.source (state.at + quotes) - state.at - quotes
  here index = { index, position: positionAt origin index }
  content = Right
    ( Loop
        state
          { at = state.at + 1
          , quote = if hashes > 0 then Just state.at else state.quote
          }
    )

-- A line break: a block's are text, with CRLF read as LF and a lone CR
-- an error (§1); a literal on one line ends there.
broken ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
broken origin state =
  if not origin.shape.block then lineEnded origin state state.at
  else if here == Just '\n' then
    Right (Loop state { at = state.at + 1, line = true })
  else if String.charAt (state.at + 1) origin.source == Just '\n' then
    Right
      ( Loop
          state
            { at = state.at + 2
            , from = state.at + 2
            , pieces = Stack.push "\n" before
            , line = true
            }
      )
  else lineBreak origin state.at
  where
  here = String.charAt state.at origin.source
  before = Stack.push (run origin state.from state.at) state.pieces

-- A line literal reaching the end of its line, which only an LF or a CRLF
-- is (§2). Without `#`s that is the line break error, and so is a lone CR
-- in any literal; with `#`s the unclosed-delimiter rules apply.
lineEnded ∷ ∀ a. Origin → Walk → Int → Either Diagnostic a
lineEnded origin state at =
  if origin.shape.hashes == 0 || not (endsLine origin.source at) then
    lineBreak origin at
  else endOfFile origin state at

endsLine ∷ String → Int → Boolean
endsLine source at = String.charAt at source == Just '\n'
  || String.slice at (at + 2) source == "\r\n"

endOfFile ∷ ∀ a. Origin → Walk → Int → Either Diagnostic a
endOfFile origin state stop = runOut origin stop (lastQuote origin state)

-- A backslash starts an escape only when followed by the literal's `#`s.
slashed ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
slashed origin state =
  if not introduced then Right (Loop state { at = state.at + 1 })
  else case markAt origin.source body of
    Ended → endOfFile origin state body
    LineEnd →
      if origin.shape.block then
        invalid origin state.at body "Unknown escape "
      else lineEnded origin state body
    _ → map (resumed origin state) (escape origin state.at)
  where
  hashes = origin.shape.hashes
  body = state.at + 1 + hashes
  introduced = String.slice (state.at + 1) body origin.source
    == repeated '#' hashes

-- `$` followed by the literal's `#`s and `{` opens a hole.
dollar ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
dollar origin state =
  if opens then Right (Done (closed origin state Opens))
  else Right (Loop state { at = state.at + 1 })
  where
  hashes = origin.shape.hashes
  opens = String.slice (state.at + 1) (state.at + 2 + hashes) origin.source
    == repeated '#' hashes <> "{"

-- The plain run before the escape, then the escape's text.
resumed ∷ Origin → Walk → Decoded → Step Walk Body
resumed origin state decoded = Loop
  state
    { at = decoded.next
    , from = decoded.next
    , pieces = Stack.push decoded.text before
    }
  where
  before = Stack.push (run origin state.from state.at) state.pieces

-- Only a block's closing delimiter has rules of its own (Format.Lex.Block).
closing ∷ Origin → Walk → Either Diagnostic (Step Walk Body)
closing origin state =
  if origin.shape.block then blockClose origin state
  else Right (Done (closed origin state Closes))
