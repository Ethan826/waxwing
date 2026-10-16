module Format.Parse.Expression (expression) where

import Prelude
import Data.Either (Either(..))
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , Expr(..)
  , Operator(..)
  , Span
  , exprSpan
  , problemAt
  )
import Format.Lex (Token, isName, isUpper)
import Format.Parse.Grammar
  ( Case
  , Parser
  , chainLeftAny
  , choose
  , defer
  , dispatch
  , expect
  , failWith
  , infixed
  , nested
  , on
  , onWhen
  , refine
  , textLiteral
  , token
  )
import Format.Parse.Block (block, parenthesized)
import Format.Parse.Lambda (lambda)
import Format.Parse.Handler
  ( handleExpr
  , handlerExpr
  , unsupportedControl
  , withExpr
  )
import Format.Parse.Lookahead (literalStart)
import Format.Parse.Name (Primary, named, upperNamed)
import Format.Parse.Postfix (applied, suffixes)
import Format.Parse.Record (literal)
import Format.Parse.Literal (integerLiteral, integerStart)
import Format.Parse.Pattern (arms)

type Comparison = { text ∷ String, operator ∷ Operator }

comparisons ∷ Array Comparison
comparisons =
  [ { text: "==", operator: Equal }
  , { text: "!=", operator: NotEqual }
  , { text: "<", operator: Less }
  , { text: "<=", operator: LessEqual }
  , { text: ">", operator: Greater }
  , { text: ">=", operator: GreaterEqual }
  ]

-- PureScript is strict, so the productions below receive `inner`, which
-- reaches `expression` lazily, rather than naming `expression` themselves.
-- Every use of `inner` is a nested position (ADR 006): a parenthesized
-- expression, an `if` condition or branch, a `match` scrutinee or arm body,
-- a call or constructor argument, a lambda body, or a block's item or
-- value (FX001).
expression ∷ Parser Expr
expression = dispatch
  [ on "if" (conditional inner)
  , on "match" (matchExpression inner)
  , on "fn" (lambda inner)
  , on "{" (choose literalStart (pipeline inner) (block inner))
  , on "handler" (handlerExpr inner)
  , on "with" (withExpr inner)
  , on "handle" (handleExpr inner)
  ]
  (pipeline inner)
  where
  inner = nested (defer later)
  later _ = expression

-- `a |> f |> g` is `(a |> f) |> g`, looser than comparison; an `if`,
-- `match` or lambda operand needs parentheses (FN001 design §1).
pipeline ∷ Parser Expr → Parser Expr
pipeline inner = chainLeftAny [ "|>" ] (const pipe)
  (comparison inner)
  where
  pipe left right = Pipe (spanBetween left right) left right

-- Comparison is non-associative: one operator between two additions, and
-- E_SYNTAX at a second operator. Both operands are one level deeper.
comparison ∷ Parser Expr → Parser Expr
comparison inner = (#) <$> additive inner
  <*> dispatch (map (rightOperand inner) comparisons) (pure identity)

rightOperand ∷ Parser Expr → Comparison → Case (Expr → Expr)
rightOperand inner comparing = on comparing.text
  (compareTo <$ infixed token <*> nested (additive inner) <* unchained)
  where
  compareTo right left =
    Compare (spanBetween left right) comparing.operator left right

unchained ∷ Parser Unit
unchained = dispatch (map chained comparisons) (pure unit)
  where
  chained comparing = on comparing.text
    (failWith "Comparisons do not chain")

-- Operator nodes span their operands, so `(1) + 2` starts at `1`.
spanBetween ∷ Expr → Expr → Span
spanBetween first second =
  { start: (exprSpan first).start, end: (exprSpan second).end }

-- `+` and `++` share this level and mix in one chain, so `1 + 2 ++ "x"`
-- is `(1 + 2) ++ "x"`; the checker rejects it.
additive ∷ Parser Expr → Parser Expr
additive inner = chainLeftAny [ "+", "++" ] operation (atom inner)
  where
  operation operator = if operator == "+" then add Add else add Concat
  add build left right = build (spanBetween left right) left right

conditional ∷ Parser Expr → Parser Expr
conditional inner = ifOf <$> expect "if" <*> inner <* expect "then" <*> inner
  <* expect "else"
  <*> inner
  where
  ifOf keyword condition yes no =
    If { start: keyword.span.start, end: (exprSpan no).end } condition yes no

-- `match` is not an atom, so as an addition operand it needs parentheses.
matchExpression ∷ Parser Expr → Parser Expr
matchExpression inner = matchOf <$> expect "match" <*> inner <* expect "{"
  <*> arms inner
  <*> expect "}"
  where
  matchOf keyword scrutinee matched close =
    Match { start: keyword.span.start, end: close.span.end } scrutinee matched

-- A primary, then any postfix operations (Format.Parse.Postfix).
atom ∷ Parser Expr → Parser Expr
atom inner = applied <$> primary inner <*> suffixes inner

-- Parentheses return the inner expression with its own span, and `()`
-- the Unit value (Format.Parse.Block); `start` is where the primary
-- begins, its `(` if parenthesized, so an application of `(f)` spans from
-- that `(` (FN001 Task 4 review).
primary ∷ Parser Expr → Parser Primary
primary inner = dispatch
  [ on "(" (parenthesized inner)
  , on "ctl" (bare <$> unsupportedControl)
  , on "resume" (bare <$> unsupportedControl)
  , on "true" (bare <<< boolean true <$> token)
  , on "false" (bare <<< boolean false <$> token)
  , on "\"" (bare <$> textLiteral inner)
  , onWhen integerStart (bare <<< integer <$> integerLiteral)
  , on "{" (bare <$> choose literalStart (literal inner) unexpected)
  , onWhen isQualifier (upperNamed inner)
  , onWhen isName (named inner)
  ]
  (bare <$> unexpected)
  where
  unexpected = refine notAnExpression token
  boolean value found = Boolean found.span value
  integer literal = Integer literal.span literal.value
  bare value = { value, start: (exprSpan value).start }

-- A capitalized name may start `Effect.op` (FX020).
isQualifier ∷ String → Boolean
isQualifier text = isName text && isUpper text

-- Reached past the last token too, where taking reports the missing token.
notAnExpression ∷ Token → Either Diagnostic Expr
notAnExpression found =
  Left (problemAt (Syntax "Expected an expression") found.span)
