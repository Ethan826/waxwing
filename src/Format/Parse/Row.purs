module Format.Parse.Row
  ( bindingSpan
  , plainRow
  , refuseBindings
  , rowRef
  , rowArgument
  , markedOr
  , placement
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , LabelRef
  , RowRef(..)
  , RowTail(..)
  , Span
  , TypeArgument(..)
  , TypeRef
  , markSpan
  , origin
  , problemAt
  )
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , ifSecond
  , name
  , on
  , optionalOn
  , refine
  , sepBy1
  , spanned
  )
import Format.Parse.Mark (label, markedLabel, opensLabel)

rowRef ∷ Parser TypeRef → Parser RowRef
rowRef inner = spanned rowOf
  ( expect "with" *> dispatch
      [ on "pure" (pureRow <$ expect "pure") ]
      ordinary
  )
  where
  pureRow = { labels: [], tail: Just Pure }
  ordinary = gathered <$> validatedParts inner
  rowOf span found = RowRef span found.labels found.tail

-- A row argument is never a function's own row: no aliases or imports.
rowArgument ∷ Parser TypeRef → Parser RowRef
rowArgument inner = refine refuseBindings
  (spanned rowOf (gathered <$> validatedParts inner))
  where
  rowOf span found = RowRef span found.labels found.tail

-- A written row that is not a function's own (FX020 §1).
plainRow ∷ Parser TypeRef → Parser RowRef
plainRow inner = refine refuseBindings (rowRef inner)

-- E_SYNTAX at the first alias, or opening brace, of a row's labels.
refuseBindings ∷ RowRef → Either Diagnostic RowRef
refuseBindings row@(RowRef _ labels _) = maybe' (const (Right row))
  (Left <<< placement)
  (Array.findMap bindingSpan labels)

bindingSpan ∷ LabelRef → Maybe Span
bindingSpan found = maybe' fromImports aliasSpan found.alias
  where
  fromImports _ = map openOf found.imports
  aliasSpan alias = Just alias.span
  openOf imports = imports.open

placement ∷ Span → Diagnostic
placement = problemAt
  (Syntax "Imports and aliases are allowed only in a function's own row")

-- A type argument that starts with `nofail`: a marked label, which makes it
-- a row argument, only when a label follows (design §3.2); otherwise it is
-- the type variable `nofail`, read by `otherwise`.
markedOr
  ∷ Parser TypeRef → Parser TypeArgument → Parser TypeArgument
markedOr inner otherwise = ifSecond opensLabel (markedArgument inner)
  otherwise

markedArgument ∷ Parser TypeRef → Parser TypeArgument
markedArgument inner = refine rowOf
  (Tuple <$> markedLabel inner <*> optionalOn "+" (expect "+" *> rest))
  where
  rest = rowArgument inner
  rowOf (Tuple first more) = RowArgument <$> refuseBindings
    (joined first more)
  joined first = maybe' (alone first) (before first)
  alone first _ = RowRef (labelSpan first first.span) [ first ] Nothing
  before first (RowRef span labels tail) = RowRef
    (labelSpan first span)
    (Array.cons first labels)
    tail
  labelSpan first span = { start: startOf first, end: span.end }
  startOf first = maybe' (const first.span.start) markStart first.mark
  markStart mark = (markSpan mark).start

gathered ∷ Array Part → { labels ∷ Array LabelRef, tail ∷ Maybe RowTail }
gathered parts =
  { labels: Array.mapMaybe labelPart parts, tail: lastTail parts }

data Part = LabelPart LabelRef | TailPart RowTail Span

rowPart ∷ Parser TypeRef → Parser Part
rowPart inner = dispatch
  [ on "..." spreadPart, on "nofail" (LabelPart <$> markedLabel inner) ]
  (LabelPart <$> label inner)
  where
  spreadPart = tailPart <$> expect "..." <*> name
  tailPart marker found = TailPart (Spread found.text)
    { start: marker.span.start, end: found.span.end }

validatedParts ∷ Parser TypeRef → Parser (Array Part)
validatedParts inner = refine validate (sepBy1 "+" (rowPart inner))
  where
  validate parts = case tails of
    [] → Right parts
    [ tail ] →
      if tail.index == Array.length parts - 1 then Right parts
      else invalid "Row tail must be last" tail.span
    _ → invalid "Only one row tail is allowed" (secondTail tails).span
    where
    tails = Array.mapMaybe identity
      ( Array.zipWith tailAt
          (Array.range 0 (Array.length parts - 1))
          parts
      )
    tailAt index = case _ of
      TailPart _ span → Just { index, span }
      _ → Nothing
  secondTail tails = fromMaybe { index: 0, span: nowhere }
    (Array.index tails 1)
  invalid message span = Left (problemAt (Syntax message) span)
  nowhere = { start: origin, end: origin }

labelPart ∷ Part → Maybe LabelRef
labelPart = case _ of
  LabelPart labelValue → Just labelValue
  _ → Nothing

tailPartValue ∷ Part → Maybe RowTail
tailPartValue = case _ of
  TailPart tail _ → Just tail
  _ → Nothing

lastTail ∷ Array Part → Maybe RowTail
lastTail = Array.last <<< Array.mapMaybe tailPartValue
