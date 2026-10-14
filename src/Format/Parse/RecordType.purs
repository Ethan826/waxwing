module Format.Parse.RecordType (operand, label) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , FieldRef
  , RecordTail
  , Span
  , TypeRef(..)
  , problemAt
  )
import Format.Lex (Token, isName, isUpper)
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , failWith
  , name
  , nested
  , on
  , onWhen
  , refine
  , sepByTrailing1
  , spanned
  , token
  )

data Part = FieldPart FieldRef | TailPart RecordTail

-- `{ a: A, b: B }` or `{ a: A, ...r }`, a comma allowed after the last
-- item (G005). The `{` is at the next token and a `}` does not follow it:
-- the empty record has no spelling (design §1), so `{}` is refused by the
-- caller as any other non-type. Each field's type is one level deeper.
operand ∷ Parser TypeRef → Parser TypeRef
operand inner = refine assembled
  ( spanned written
      (expect "{" *> sepByTrailing1 "," "}" (part inner) <* expect "}")
  )
  where
  written span parts = { span, parts }

part ∷ Parser TypeRef → Parser Part
part inner = dispatch [ on "..." tailPart ] (fieldPart inner)
  where
  tailPart = spanned tailOf (expect "..." *> name)
  tailOf span found = TailPart { name: found.text, span }

fieldPart ∷ Parser TypeRef → Parser Part
fieldPart inner = fieldOf <$> label <* expect ":" <*> nested inner
  where
  fieldOf found ty = FieldPart { name: found.text, ty, span: found.span }

label ∷ Parser Token
label = dispatch [ onWhen lowerText token ] (failWith "Expected an identifier")
  where
  lowerText text = isName text && not (isUpper text)

-- Fields in written order, and the tail, which must be last and single.
assembled
  ∷ { span ∷ Span, parts ∷ Array Part } → Either Diagnostic TypeRef
assembled found = case tails of
  [] → Right (RecordRef found.span fields Nothing)
  [ tail ] | tail.index == Array.length found.parts - 1 →
    Right (RecordRef found.span fields (Just tail.value))
  [ tail ] → invalid "Row tail must be last" tail.value.span
  _ → invalid "Only one row tail is allowed" secondSpan
  where
  fields = Array.mapMaybe fieldOf found.parts
  tails = Array.catMaybes
    (Array.mapWithIndex tailAt found.parts)
  tailAt index = case _ of
    TailPart value → Just { index, value }
    _ → Nothing
  fieldOf = case _ of
    FieldPart value → Just value
    _ → Nothing
  secondSpan = maybe found.span tailSpan (Array.index tails 1)
  tailSpan entry = entry.value.span
  invalid message span = Left (problemAt (Syntax message) span)
