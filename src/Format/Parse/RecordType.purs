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
-- the caller reads `{}`, the empty record type (R005 design §4). Each
-- field's type is one level deeper.
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

-- Fields in written order, then the tails, which must come last: a field
-- after a tail is refused at the first tail it follows (R005 Tranche B
-- allows several tails, `{ ...r, ...s }`; effect rows still allow one).
assembled
  ∷ { span ∷ Span, parts ∷ Array Part } → Either Diagnostic TypeRef
assembled found = maybe (Right (RecordRef found.span fields tails)) misplaced
  (Array.find (before lastField) indexed)
  where
  fields = Array.mapMaybe fieldOf found.parts
  indexed = Array.catMaybes (Array.mapWithIndex tailAt found.parts)
  tails = map tailValue indexed
  tailValue entry = entry.value
  lastField = Array.findLastIndex isField found.parts
  before last entry = maybe false (laterThan entry.index) last
  laterThan index field = field > index
  misplaced entry = Left
    (problemAt (Syntax "Row tail must be last") entry.value.span)
  tailAt index = case _ of
    TailPart value → Just { index, value }
    _ → Nothing
  fieldOf = case _ of
    FieldPart value → Just value
    _ → Nothing
  isField = case _ of
    FieldPart _ → true
    _ → false
