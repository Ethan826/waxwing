module Format.Parse.Type (typeRef, typeAndRow) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Data.Tuple (Tuple(..))
import Data.Traversable (traverse)
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , RowRef(..)
  , RowTail(..)
  , Span
  , TypeArgument(..)
  , TypeRef(..)
  , problemAt
  , typeRefSpan
  )
import Format.Parse.Chain (Segment, combined, unexpectedRow)
import Format.Parse.Row (markedOr, rowArgument, rowRef)
import Format.Parse.HandlerType as HandlerType
import Format.Parse.RecordType as RecordType
import Format.Lex (Token, isName, isUpper)
import Format.Parse.Grammar
  ( Parser
  , chainRight
  , defer
  , dispatch
  , expect
  , failWith
  , grouped
  , ifSecond
  , nested
  , on
  , onWhen
  , optionalOn
  , refine
  , sepBy1
  , spanned
  , token
  , upperName
  )

type Applied = { identifier ∷ Token, arguments ∷ Maybe (Array TypeArgument) }

-- `->` is right-associative and loosest (FN001 design §1). The chain is
-- read as a list and folded right, never one recursion per arrow, and a
-- parameter is one nesting level deeper than its arrow (Grammar
-- `chainRight`). `(A, B) -> C` is `A -> B -> C`; `(A) -> B` is `A -> B`.
-- PureScript is strict, so the productions below receive `inner`, which
-- reaches `typeRef` lazily.
typeRef ∷ Parser TypeRef
typeRef = refine withoutRow typeAndRow
  where
  withoutRow found = maybe' (kept found) unexpectedRow found.row
  kept found _ = Right found.ty

typeAndRow ∷ Parser { ty ∷ TypeRef, row ∷ Maybe RowRef }
typeAndRow = refine combined (chainRight "->" (segment inner))
  where
  inner = defer later
  later _ = typeRef

-- Int, Bool, Unit, a type variable, or a capitalized name with optional type
-- arguments, each one nesting level deeper (ADR 006); otherwise E_SYNTAX at
-- that token. `List()` is rejected at `)`; `Int(a)` and `a(Int)` at `(`,
-- by whatever follows the type.
operand ∷ Parser TypeRef → Parser TypeRef
operand inner = dispatch
  [ on "Int" (IntRef <$> tokenSpan)
  , on "Bool" (BoolRef <$> tokenSpan)
  , on "Unit" (UnitRef <$> tokenSpan)
  , on "Text" (TextRef <$> tokenSpan)
  , on "Handler" (HandlerType.operand (defer rowed) inner)
  , on "{" (ifSecond (eq "}") emptyRecord (RecordType.operand inner))
  , onWhen upperText (spanned appliedOf (parts <$> upperName <*> arguments))
  , onWhen lowerText (variable <$> token)
  ]
  (refine unknown token)
  where
  rowed _ = typeAndRow
  -- `{}` is the empty record type (R005 design §4), never Unit.
  emptyRecord = spanned emptyOf (expect "{" *> expect "}")
  emptyOf span _ = RecordRef span [] Nothing
  parts identifier found = { identifier, arguments: found }
  arguments = optionalOn "(" (expect "(" *> sepBy1 "," argument <* expect ")")
  argument = dispatch
    [ on "..." (spreadArgument inner)
    , on "pure" pureArgument
    , on "nofail" (markedOr inner (typeOrRow inner))
    ]
    (typeOrRow inner)
  pureRowArgument = spanned pureRow (expect "pure")
  pureRow span _ = RowRef span [] (Just Pure)
  spreadArgument parser = RowArgument <$> rowArgument parser
  pureArgument = RowArgument <$> pureRowArgument
  variable found = VarRef found.span found.text

-- A list of two or more types must be followed by `->`, which the chain
-- then reads, so the last segment of a chain is always a single type.
-- `()` is rejected at `)`, where a type is expected.
segment ∷ Parser TypeRef → Parser Segment
segment inner = spanned segmentOf
  ( parts
      <$> dispatch [ on "(" parenthesized ]
        (NonEmptyArray.singleton <$> operand inner)
      <*> optionalOn "with" (rowRef inner)
  )
  where
  parts types row = { types, row }
  segmentOf span found = { span, types: found.types, row: found.row }
  parenthesized = expect "(" *> grouped
    (NonEmptyArray.cons' <$> inner <*> dispatch [ on "," more ] closing)
  more = expect "," *> sepBy1 "," inner <* expect ")" <* arrowNext
  closing = [] <$ expect ")"
  arrowNext = dispatch [ on "->" (pure unit) ] (failWith "Expected ->")

appliedOf ∷ Span → Applied → TypeRef
appliedOf span found =
  NamedRef span found.identifier.text (fromMaybe [] found.arguments)

typeOrRow ∷ Parser TypeRef → Parser TypeArgument
typeOrRow inner = refine makeArgument
  ( Tuple <$> nested inner
      <*> optionalOn "+" (expect "+" *> rowArgument inner)
  )
  where
  makeArgument (Tuple first Nothing) = Right (TypeArgument first)
  makeArgument (Tuple first (Just rest)) = rowArgumentFor first rest
  rowArgumentFor first rest = case first of
    NamedRef span name arguments →
      RowArgument <$>
        ( addFirst span name <$> traverse typeArgument arguments
            <*> pure rest
        )
    _ → expectedLabel first
  expectedLabel first = Left
    (problemAt (Syntax "Expected an effect label") (typeRefSpan first))
  typeArgument = case _ of
    TypeArgument found → Right found
    RowArgument row → Left (problemAt (RowSort false) (rowSpan row))
  rowSpan (RowRef span _ _) = span

addFirst ∷ Span → String → Array TypeRef → RowRef → RowRef
addFirst span name arguments (RowRef rest labels tail) = RowRef
  { start: span.start, end: rest.end }
  ( Array.cons
      { name
      , arguments
      , mark: Nothing
      , alias: Nothing
      , imports: Nothing
      , span
      }
      labels
  )
  tail

unknown ∷ Token → Either Diagnostic TypeRef
unknown found = Left (problemAt (Syntax "Expected a type") found.span)

tokenSpan ∷ Parser Span
tokenSpan = spanOf <$> token
  where
  spanOf found = found.span

upperText ∷ String → Boolean
upperText text = isName text && isUpper text

lowerText ∷ String → Boolean
lowerText text = isName text && not (isUpper text)
