-- What a module's matches bind, read from its syntax tree, for tests
-- that a mapping names every constructor with no catch-all (R0 Task
-- 2.3: test/r0-static.test.mjs). A regex over the source misses forms
-- the parser does not (an equation's `_`, a nested wildcard), so the
-- tree is read. Fails closed: a source with parse errors is refused.
module Style.Arms (Arms, arms) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..))
import Data.Foldable (foldMap)
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..), snd)
import PureScript.CST (RecoveredParserResult(..), parseModule)
import PureScript.CST.Traversal (defaultMonoidalVisitor, foldMapModule)
import PureScript.CST.Types as CST

-- `wildcards`: `_` binders anywhere. `armConstructors`: the constructor
-- each case arm's pattern starts with, once per arm and pattern;
-- `armOthers`: arm patterns that start with no constructor (a variable,
-- a literal). `declared`: the constructors of the module's data types.
-- `binding`: the declarations whose equations bind arguments.
-- `identifiers`: every identifier used as an expression.
type Arms =
  { wildcards ∷ Int
  , armConstructors ∷ Array String
  , armOthers ∷ Int
  , declared ∷ Array String
  , binding ∷ Array String
  , identifiers ∷ Array String
  }

arms ∷ String → Either String Arms
arms source = case parseModule source of
  ParseSucceeded parsed → Right (read parsed)
  ParseSucceededWithErrors _ _ → Left "arms input has parse errors"
  ParseFailed _ → Left "arms input did not parse"

type Found =
  { wildcards ∷ Array Unit
  , armConstructors ∷ Array String
  , armOthers ∷ Array Unit
  , declared ∷ Array String
  , binding ∷ Array String
  , identifiers ∷ Array String
  }

read ∷ CST.Module Void → Arms
read parsed = found
  { wildcards = Array.length found.wildcards
  , armOthers = Array.length found.armOthers
  }
  where
  found = foldMapModule visitor parsed
  visitor = defaultMonoidalVisitor
    { onBinder = binderFound, onExpr = exprFound, onDecl = declFound }

nothing ∷ Found
nothing =
  { wildcards: []
  , armConstructors: []
  , armOthers: []
  , declared: []
  , binding: []
  , identifiers: []
  }

binderFound ∷ CST.Binder Void → Found
binderFound = case _ of
  CST.BinderWildcard _ → nothing { wildcards = [ unit ] }
  _ → nothing

exprFound ∷ CST.Expr Void → Found
exprFound = case _ of
  CST.ExprCase branches → foldMap armFound
    (NonEmptyArray.toArray branches.branches)
  CST.ExprIdent (CST.QualifiedName name) → nothing
    { identifiers = [ identText name.name ] }
  _ → nothing

armFound
  ∷ Tuple (CST.Separated (CST.Binder Void)) (CST.Guarded Void) → Found
armFound (Tuple (CST.Separated patterns) _) =
  foldMap patternFound (Array.cons patterns.head (map snd patterns.tail))

patternFound ∷ CST.Binder Void → Found
patternFound binder = maybe (nothing { armOthers = [ unit ] }) constructed
  (leading binder)
  where
  constructed name = nothing { armConstructors = [ name ] }

leading ∷ CST.Binder Void → Maybe String
leading = case _ of
  CST.BinderConstructor (CST.QualifiedName name) _ → pure
    (properText name.name)
  CST.BinderParens (CST.Wrapped wrapped) → leading wrapped.value
  CST.BinderTyped inner _ _ → leading inner
  _ → Nothing

declFound ∷ CST.Declaration Void → Found
declFound = case _ of
  CST.DeclData _ constructors → nothing
    { declared = maybe [] (dataNames <<< snd) constructors }
  CST.DeclValue fields | not (Array.null fields.binders) → nothing
    { binding = [ nameText fields.name ] }
  _ → nothing

dataNames ∷ CST.Separated (CST.DataCtor Void) → Array String
dataNames (CST.Separated constructors) = map dataName
  (Array.cons constructors.head (map snd constructors.tail))

dataName ∷ CST.DataCtor Void → String
dataName (CST.DataCtor constructor) = nameProper constructor.name

nameProper ∷ CST.Name CST.Proper → String
nameProper (CST.Name name) = properText name.name

nameText ∷ CST.Name CST.Ident → String
nameText (CST.Name name) = identText name.name

properText ∷ CST.Proper → String
properText (CST.Proper text) = text

identText ∷ CST.Ident → String
identText (CST.Ident text) = text
