module Format.Parse.Name (Primary, nameOrQualified) where

import Prelude
import Data.Maybe (Maybe, maybe)
import Domain.Syntax (Expr(..), Position, Span)
import Format.Lex (Token, isUpper)
import Format.Parse.Grammar
  ( Parser
  , commaList
  , dispatch
  , expect
  , ifSecond
  , name
  , onWhen
  , optionalOn
  , spanned
  )

-- A primary expression and the position its source text starts at.
type Primary = { value ∷ Expr, start ∷ Position }

-- A capitalized name followed by `.` is a qualified operation (FX020);
-- anything else is a variable or call. A lowercase receiver is never read
-- as a qualifier, so `r.field` can reuse `.` later (R001).
nameOrQualified ∷ Parser Expr → Parser Primary
nameOrQualified inner = dispatch
  [ onWhen isUpper (ifSecond (eq ".") (qualified inner) (named inner)) ]
  (named inner)

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

-- `Effect.op` or `Effect.op(args)`, spanning from the qualifier through the
-- last character written, like a variable or a call.
qualified ∷ Parser Expr → Parser Primary
qualified inner = spanned primaryOf
  ( parts <$> name <* expect "." <*> name
      <*> optionalOn "(" (expect "(" *> commaList inner <* expect ")")
  )
  where
  primaryOf span found = { value: qualifiedOf span found, start: span.start }
  parts qualifier member found = { qualifier, member, arguments: found }

qualifiedOf
  ∷ Span
  → { qualifier ∷ Token, member ∷ Token, arguments ∷ Maybe (Array Expr) }
  → Expr
qualifiedOf span found = maybe
  (Qualified span found.qualifier.text found.member.text)
  (QualifiedCall span found.qualifier.text found.member.text)
  found.arguments
