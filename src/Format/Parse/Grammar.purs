module Format.Parse.Grammar
  ( module Exports
  , Parser
  , Case
  , nestingLimit
  , token
  , textLiteral
  , expect
  , name
  , upperName
  , failWith
  , refine
  , defer
  , on
  , onWhen
  , dispatch
  , ifSecond
  , ifQualifier
  , choose
  , optionalOn
  , sepBy1
  , sepByTrailing1
  , commaList
  , chainLeftAny
  , chainRight
  , manyOn
  , manyWhile
  , spanned
  , nested
  , rooted
  , infixed
  , grouped
  , run
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..), maybe)
import Domain.Syntax (Diagnostic, Expr, Span)
import Format.Lex (Token, isName, isUpper)
import Format.Lex.Chars as Chars
import Format.Parse.Cursor (Parsed, Run, State, initialState) as Exports
import Format.Parse.Cursor
  ( Continue
  , Run
  , State
  , expected
  , failAt
  , foldAt
  , groupedAt
  , infixedAt
  , nestedAt
  , peekText
  , touchesQualifier
  , rightAt
  , separated
  , shifting
  , skip
  , rootedAt
  , trailing
  , whileAt
  )
import Format.Parse.Interpolated (takeText)
import Format.Parse.Steps
  ( applyAt
  , mapAt
  , pureAt
  , refineAt
  , spannedAt
  , takeAt
  , taggedAt
  )
import Format.Stack as Stack

-- Applicative only (no Bind): choice is LL(1) on the next token (dispatch),
-- and the remaining input is threaded here and nowhere else.
newtype Parser a = Parser (Run a)

type Case a = { accepts ∷ String → Boolean, parser ∷ Parser a }

instance Functor Parser where
  map transform (Parser parser) = Parser (mapAt transform parser)

instance Apply Parser where
  apply (Parser function) (Parser argument) =
    Parser (applyAt function argument)

instance Applicative Parser where
  pure value = Parser (pureAt value)

-- Deeper nesting is E_NESTING; the lexer counts open holes against the
-- same limit (Format.Lex.Chars).
nestingLimit ∷ Int
nestingLimit = Chars.nestingLimit

token ∷ Parser Token
token = Parser takeAt

-- A whole text literal: a constant, or its chunks and holes, whose
-- expressions `hole` parses.
textLiteral ∷ Parser Expr → Parser Expr
textLiteral hole = Parser (takeText (run hole))

expect ∷ String → Parser Token
expect text = dispatch [ on text token ]
  (failWith (expected text))

name ∷ Parser Token
name = dispatch [ onWhen isName token ] (failWith "Expected an identifier")

upperName ∷ Parser Token
upperName = dispatch [ onWhen upperText token ]
  (failWith "Expected a capitalized name")
  where
  upperText text = isName text && isUpper text

-- E_SYNTAX at the next token, or as an empty span at end of input.
failWith ∷ ∀ a. String → Parser a
failWith message = Parser (flip failAt message)

-- A fallible map: checks a parsed value without consuming more input.
refine ∷ ∀ a b. (a → Either Diagnostic b) → Parser a → Parser b
refine check (Parser parser) = Parser (refineAt check parser)

-- PureScript is strict, so recursive productions delay their reference.
defer ∷ ∀ a. (Unit → Parser a) → Parser a
defer later = Parser (deferAt later)

on ∷ ∀ a. String → Parser a → Case a
on text parser = { accepts: eq text, parser }

onWhen ∷ ∀ a. (String → Boolean) → Parser a → Case a
onWhen accepts parser = { accepts, parser }

-- The first case accepting the next token's text (`<end>` at end of
-- input), else the fallback. Nothing is consumed before the choice.
dispatch ∷ ∀ a. Array (Case a) → Parser a → Parser a
dispatch cases fallback = Parser (dispatchAt cases fallback)

-- Chooses on the token after the next, consuming nothing: a contextual
-- keyword is one only when what follows it says so.
ifSecond ∷ ∀ a. (String → Boolean) → Parser a → Parser a → Parser a
ifSecond accepts = choose (accepts <<< peekText <<< skip)

-- Chooses on whether a `.` touches the token before and after it, so
-- `Log . log` and `Log\n.log` are not qualifiers (R19). Consumes nothing.
ifQualifier ∷ ∀ a. Parser a → Parser a → Parser a
ifQualifier = choose touchesQualifier

-- Chooses on the state ahead (Format.Parse.Lookahead), consuming nothing.
choose ∷ ∀ a. (State → Boolean) → Parser a → Parser a → Parser a
choose test (Parser yes) (Parser no) = Parser chosen
  where
  chosen state = (if test state then yes else no) state

optionalOn ∷ ∀ a. String → Parser a → Parser (Maybe a)
optionalOn text parser = dispatch [ on text (Just <$> parser) ]
  (pure Nothing)

sepBy1 ∷ ∀ a. String → Parser a → Parser (Array a)
sepBy1 separator item = collect (separated separator) item

-- A separator directly before `close` ends the list; `close` is left.
sepByTrailing1 ∷ ∀ a. String → String → Parser a → Parser (Array a)
sepByTrailing1 separator close item =
  collect (trailing separator close) item

-- Empty exactly when the next token is `)`, which is left for the caller.
commaList ∷ ∀ a. Parser a → Parser (Array a)
commaList item = dispatch [ on ")" (pure []) ] (sepBy1 "," item)

-- Folds left in a loop: a `op` b `op` c is (a `op` b) `op` c, where the
-- operators are any of `operators`, mixed freely (`combine` is given the
-- one read). Each operator pushes the operands before it one level deeper,
-- and each later operand is nested, so the counted depth is the depth of
-- the left-nested tree.
chainLeftAny
  ∷ ∀ a. Array String → (String → a → a → a) → Parser a → Parser a
chainLeftAny operators combine item = Parser
  ( foldAt (shifting nestingLimit operators) _.value step (taggedAt (run item))
      (taggedAt (run (nested item)))
  )
  where
  step left right = combine right.operator left right.value

-- `a -> b -> c`: the items before each operator, one level deeper, and the
-- last, which is not (Cursor `rightAt`); the caller folds them right.
chainRight ∷ ∀ a. String → Parser a → Parser { init ∷ Array a, last ∷ a }
chainRight operator item = Parser (rightAt nestingLimit operator (run item))

-- Zero or more items, each beginning with `text` (which the item reads).
manyOn ∷ ∀ a. String → Parser a → Parser (Array a)
manyOn text = manyWhile (eq text <<< peekText)

-- Zero or more items, each where `starts` holds (the item reads on).
manyWhile ∷ ∀ a. (State → Boolean) → Parser a → Parser (Array a)
manyWhile starts item = choose starts (collect (whileAt starts) item) (pure [])

-- From the first to the last consumed token; an empty span at the next
-- token's start if nothing was consumed.
spanned ∷ ∀ a b. (Span → a → b) → Parser a → Parser b
spanned build (Parser parser) = Parser (spannedAt build parser)

-- One nesting level deeper (ADR 006): E_NESTING at the next token past
-- `nestingLimit`. The depth is restored afterwards.
nested ∷ ∀ a. Parser a → Parser a
nested parser = Parser (nestedAt nestingLimit (run parser))

-- A declaration body: depth 0, unaffected by earlier declarations.
rooted ∷ ∀ a. Parser a → Parser a
rooted parser = Parser (rootedAt (run parser))

-- An infix operator (`parser` reads it): what was parsed since the enclosing
-- nested position becomes its left operand, one level deeper.
infixed ∷ ∀ a. Parser a → Parser a
infixed parser = Parser (infixedAt nestingLimit (run parser))

-- Parentheses in a type (Cursor `groupedAt`).
grouped ∷ ∀ a. Parser a → Parser a
grouped parser = Parser (groupedAt nestingLimit (run parser))

-- Runs a whole production from a state; the declaration loop steps with it.
run ∷ ∀ a. Parser a → Run a
run (Parser parser) = parser

deferAt ∷ ∀ a. (Unit → Parser a) → Run a
deferAt later state = run (later unit) state

dispatchAt ∷ ∀ a. Array (Case a) → Parser a → Run a
dispatchAt cases fallback state =
  run (maybe fallback chosen (Array.find accepting cases)) state
  where
  text = peekText state
  accepting choice = choice.accepts text
  chosen choice = choice.parser

-- Lists are Stack-accumulated in push order, so building them is linear.
collect ∷ ∀ a. Continue → Parser a → Parser (Array a)
collect next item =
  Array.fromFoldable <$> Parser
    (foldAt next single (flip Stack.push) (run item) (run item))
  where
  single first = Stack.push first Stack.empty
