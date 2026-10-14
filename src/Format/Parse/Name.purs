module Format.Parse.Name (Primary, named, upperNamed) where

import Prelude
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (Expr(..), Position, Span)
import Format.Lex (Token)
import Format.Parse.Grammar
  ( Parser
  , commaList
  , dispatch
  , expect
  , ifQualifier
  , name
  , on
  , optionalOn
  , spanned
  )

-- A primary expression and the position its source text starts at.
type Primary = { value ∷ Expr, start ∷ Position }

-- A variable spans its name; a call runs through its `)`. It builds its
-- Primary itself: a separate `<$>` over it added a stack layer per nested
-- call level (FN001 Task 6 review, ADR 006 "Functions emitted").
named ∷ Parser Expr → Parser Primary
named inner = spanned primaryOf (parts <$> name <*> optionalOn "(" arguments)
  where
  primaryOf span found = { value: namedOf span found, start: span.start }
  parts identifier found = { identifier, arguments: found }
  arguments = expect "(" *> commaList inner <* expect ")"

namedOf
  ∷ Span → { identifier ∷ Token, arguments ∷ Maybe (Array Expr) } → Expr
namedOf span found = maybe (Variable span found.identifier.text)
  (Call span found.identifier.text)
  found.arguments

-- What follows a capitalized name: nothing, a call's arguments, or `.op`
-- with its optional arguments (FX020).
data Tail = Bare | Applied (Array Expr) | Member Token (Maybe (Array Expr))

-- A capitalized name: a constructor or `Effect.op`. It has the shape of
-- `named`, with the choice made by the one dispatch after the name, so a
-- constructor argument costs no frame beyond a plain call (G002, ADR 006).
-- The `.` must touch both names (R19); otherwise it is a stray token, as
-- before FX020. Only capitalized names read `.`; a lowercase receiver never does, so
-- `r.field` can reuse `.` later (R001). Spans run from the name through the
-- last character written, like a variable or a call.
upperNamed ∷ Parser Expr → Parser Primary
upperNamed inner = spanned primaryOf
  ( parts <$> name
      <*> dispatch [ on "(" (Applied <$> arguments) ]
        (ifQualifier member (pure Bare))
  )
  where
  primaryOf span found = { value: tailOf span found, start: span.start }
  parts identifier found = { identifier, found }
  arguments = expect "(" *> commaList inner <* expect ")"
  member = Member <$ expect "." <*> name <*> optionalOn "(" arguments

tailOf ∷ Span → { identifier ∷ Token, found ∷ Tail } → Expr
tailOf span parsed = case parsed.found of
  Bare → Variable span parsed.identifier.text
  Applied arguments → Call span parsed.identifier.text arguments
  Member member Nothing →
    Qualified span parsed.identifier.text member.text
  Member member (Just arguments) →
    QualifiedCall span parsed.identifier.text member.text arguments
