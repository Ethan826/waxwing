module Format.Parse.Interpolated (takeText) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Data.String.Common (joinWith)
import Domain.Syntax (Diagnostic, Expr(..), Span)
import Format.Lex (Token, TokenKind(..))
import Format.Parse.Cursor (Parsed, Run, State, advance, current, failAt)
import Format.Stack (Stack)
import Format.Stack as Stack

-- The parts so far, newest first on the stack, and whether any is a hole.
type Walk = { parts ∷ Stack Expr, holed ∷ Boolean, rest ∷ State }

-- A whole text literal (Format.Lex.Token) as one expression. The dispatch
-- that reaches it has seen `TextOpen`; an open that is not one cannot occur
-- and fails like a missing expression. A literal with no hole is a constant
-- of its decoded chunks; with holes it is its chunks and holes in source
-- order (design §3). `hole` parses one hole's expression, which the lexer
-- has delimited with `HoleOpen` and `HoleClose`.
takeText ∷ Run Expr → Run Expr
takeText hole state = maybe' missing opened (current state)
  where
  missing _ = failAt state "Expected an expression"
  opened open = case open.kind of
    TextOpen → map (built open) (tailRecM (part hole) (start open))
    _ → missing unit
  start open =
    { parts: Stack.empty, holed: false, rest: advance state open }

built ∷ Token → Walk → Parsed Expr
built open walk = { value: literalOf span walk, rest: walk.rest }
  where
  span = { start: open.span.start, end: walk.rest.lastEnd }

-- A hole-free literal has at most one chunk.
literalOf ∷ Span → Walk → Expr
literalOf span walk =
  if walk.holed then Interpolate span parts
  else TextLiteral span (joinWith "" (map textOf parts))
  where
  parts = Array.fromFoldable walk.parts

textOf ∷ Expr → String
textOf = case _ of
  TextLiteral _ text → text
  _ → ""

part ∷ Run Expr → Walk → Either Diagnostic (Step Walk Walk)
part hole walk = maybe' (stuck walk) (taken hole walk) (current walk.rest)

taken ∷ Run Expr → Walk → Token → Either Diagnostic (Step Walk Walk)
taken hole walk next = case next.kind of
  TextChunk decoded → Right
    ( Loop
        walk
          { parts = Stack.push (TextLiteral next.span decoded) walk.parts
          , rest = advance walk.rest next
          }
    )
  HoleOpen → hole (advance walk.rest next) >>= closed walk
  TextClose → Right (Done walk { rest = advance walk.rest next })
  _ → stuck walk unit

-- The hole's expression, then its closing `}`.
closed ∷ Walk → Parsed Expr → Either Diagnostic (Step Walk Walk)
closed walk parsed = maybe' (unbalanced parsed) (closing walk parsed)
  (current parsed.rest)

closing
  ∷ Walk → Parsed Expr → Token → Either Diagnostic (Step Walk Walk)
closing walk parsed close = case close.kind of
  HoleClose → Right
    ( Loop
        { parts: Stack.push parsed.value walk.parts
        , holed: true
        , rest: advance parsed.rest close
        }
    )
  _ → unbalanced parsed unit

unbalanced ∷ ∀ a. Parsed Expr → Unit → Either Diagnostic a
unbalanced parsed _ = failAt parsed.rest "Expected '}'"

-- A literal the lexer left unclosed cannot occur.
stuck ∷ ∀ a. Walk → Unit → Either Diagnostic a
stuck walk _ = failAt walk.rest "Unterminated text literal"
