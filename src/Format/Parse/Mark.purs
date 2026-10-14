module Format.Parse.Mark
  ( label
  , markedLabel
  , opensLabel
  , plainLabel
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Domain.Problem (Problem(..))
import Domain.Syntax
  ( Diagnostic
  , LabelRef
  , MarkRef(..)
  , Position
  , TypeRef
  , problemAt
  )
import Format.Lex (Token, isName, isUpper)
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , failWith
  , name
  , on
  , onWhen
  , optionalOn
  , refine
  , sepBy1
  , sepByTrailing1
  , spanned
  , token
  , upperName
  )

-- What `nofail(k)` adds to `nofail`: the name and where its `)` ends.
type Variable = { name ∷ String, end ∷ Position }

-- A label as written: `Log`, `State(Int)`. It carries no mark.
plainLabel ∷ Parser TypeRef → Parser LabelRef
plainLabel inner = spanned labelOf
  ( parts <$> upperName
      <*> optionalOn "(" arguments
  )
  where
  arguments = expect "(" *> sepBy1 "," inner <* expect ")"
  parts identifier found =
    { name: identifier.text, arguments: fromMaybe [] found }
  labelOf span found =
    { name: found.name
    , arguments: found.arguments
    , mark: Nothing
    , alias: Nothing
    , imports: Nothing
    , span
    }

-- A label of a row: `Database as D`, `Log { log, info as note }` (FX020
-- §1). Where an alias or import has no meaning, the row refuses it.
label ∷ Parser TypeRef → Parser LabelRef
label inner = withBindings <$> plainLabel inner <*> optionalOn "as" alias
  <*> optionalOn "{" imports
  where
  alias = expect "as" *> (aliasOf <$> upperName)
  aliasOf found = { name: found.text, span: found.span }
  imports = importsOf <$> expect "{"
    <*> sepByTrailing1 "," "}" import_
    <* expect "}"
  importsOf open names = { open: open.span, names }
  import_ = importOf <$> name <*> optionalOn "as" (expect "as" *> name)
  importOf found renamed = maybe' (same found) (renamedTo found) renamed
  same found _ = importFor found found
  renamedTo found local = importFor found local
  importFor found local =
    { name: found.text
    , nameSpan: found.span
    , local: local.text
    , localSpan: local.span
    }
  withBindings found written imported =
    found { alias = written, imports = imported }

-- `nofail Log` or `nofail(k) Log` (FX008 design §3.2), read where a label
-- must follow: after `with`, after `+`, as a row argument or a handled
-- label. The label's span stays the label's; the mark has its own.
-- `nofail ...e` is refused here, reserved for FX007.
markedLabel ∷ Parser TypeRef → Parser LabelRef
markedLabel inner = refine identity
  ( built <$> expect "nofail" <*> optionalOn "(" variable
      <*> dispatch [ on "..." spread ] (Right <$> label inner)
  )
  where
  variable = closed <$> (expect "(" *> lowerName) <*> expect ")"
  closed identifier close =
    { name: identifier.text, end: close.span.end }
  spread = Left <$> (expect "..." *> name)

-- What follows `nofail` opens a label: an uppercase name, `(` of a mark
-- variable, or `...` of the refused `nofail ...e`. Elsewhere in a type
-- `nofail` is an ordinary type variable.
opensLabel ∷ String → Boolean
opensLabel text = text == "(" || text == "..." || (isName text && isUpper text)

lowerName ∷ Parser Token
lowerName = dispatch [ onWhen lowercase token ]
  (failWith "Expected a mark variable")
  where
  lowercase text = isName text && not (isUpper text)

-- The tail of a refused `nofail ...e` ends the unsupported form.
built
  ∷ Token
  → Maybe Variable
  → Either Token LabelRef
  → Either Diagnostic LabelRef
built keyword found = either (Left <<< unsupported)
  (Right <<< withMark)
  where
  unsupported tail = problemAt (Syntax "nofail ...e is not supported yet")
    { start: keyword.span.start, end: tail.span.end }
  withMark reference = reference { mark = Just (markOf found) }
  markOf = maybe' plain variableMark
  plain _ = NofailRef keyword.span
  variableMark variable = NofailVariableRef
    { start: keyword.span.start, end: variable.end }
    variable.name
