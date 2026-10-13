module Format.Lex.Token (Token, TokenKind(..)) where

import Domain.Syntax (Span)

-- A text literal is one run of tokens (Text v1 design §3): `TextOpen`, then
-- chunks and holes in source order, then `TextClose`. A `TextChunk` carries
-- its decoded text; the token's own `text` is the source slice, so spans
-- and the decoded value can differ (`\n` is two units of source, one of
-- text). Every other token, including the contents of a hole, is `Plain`.
-- The hole kinds are produced once interpolation is lexed.
data TokenKind
  = Plain
  | TextOpen
  | TextChunk String
  | HoleOpen
  | HoleClose
  | TextClose

type Token = { text ∷ String, span ∷ Span, kind ∷ TokenKind }
