-- What the trace gate (scripts/structure-trace.mjs; tranche 2 Task 7,
-- design §C.4, dossier §18.155 (4)) reads from one module, by its
-- concrete syntax tree: the export list, the imports, every instance
-- head's class and type constructors, and every use of a record label
-- `trace` (an accessor path naming it, a record update, literal field or
-- pun, a record pattern) under the top-level declaration it sits in. The
-- policy (allowlist, importers, instances) is the script's. A module that
-- does not parse cleanly is reported unparsed, never read partly.
module Style.Trace (Facts, Imported, InstanceFact, Use, facts) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldMap, intercalate)
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import PureScript.CST (RecoveredParserResult(..), parseModule)
import PureScript.CST.Traversal
  ( defaultMonoidalVisitor
  , foldMapDecl
  , foldMapType
  )
import PureScript.CST.Types as CST

type Use = { declaration ∷ String, form ∷ String }

type Imported =
  { name ∷ String, open ∷ Boolean, hiding ∷ Boolean, names ∷ Array String }

type InstanceFact = { className ∷ String, types ∷ Array String }

-- `exportList` is false when the header has none (everything exported).
type Facts =
  { parsed ∷ Boolean
  , name ∷ String
  , exportList ∷ Boolean
  , exported ∷ Array String
  , imports ∷ Array Imported
  , uses ∷ Array Use
  , instances ∷ Array InstanceFact
  }

facts ∷ String → Facts
facts source = case parseModule source of
  ParseSucceeded parsed → moduleFacts parsed
  _ → unparsed

unparsed ∷ Facts
unparsed =
  { parsed: false
  , name: ""
  , exportList: false
  , exported: []
  , imports: []
  , uses: []
  , instances: []
  }

moduleFacts ∷ CST.Module Void → Facts
moduleFacts
  ( CST.Module
      { header: CST.ModuleHeader header, body: CST.ModuleBody body }
  ) =
  { parsed: true
  , name: moduleText header.name
  , exportList: maybe false (const true) header.exports
  , exported: maybe [] (foldMap exportName <<< wrappedItems) header.exports
  , imports: map imported header.imports
  , uses: foldMap declarationUses body.decls
  , instances: foldMap declarationInstances body.decls
  }

traceLabel ∷ String
traceLabel = "trace"

moduleText ∷ CST.Name CST.ModuleName → String
moduleText (CST.Name { name: CST.ModuleName text }) = text

separatedItems ∷ ∀ a. CST.Separated a → Array a
separatedItems (CST.Separated items) = Array.cons items.head
  (map itemOf items.tail)
  where
  itemOf (Tuple _ item) = item

wrappedItems ∷ ∀ a. CST.Wrapped (CST.Separated a) → Array a
wrappedItems (CST.Wrapped wrapped) = separatedItems wrapped.value

delimitedItems ∷ ∀ a. CST.Delimited a → Array a
delimitedItems (CST.Wrapped wrapped) = maybe [] separatedItems wrapped.value

identText ∷ CST.Name CST.Ident → String
identText (CST.Name { name: CST.Ident text }) = text

properText ∷ CST.Name CST.Proper → String
properText (CST.Name { name: CST.Proper text }) = text

operatorText ∷ CST.Name CST.Operator → String
operatorText (CST.Name { name: CST.Operator text }) = "(" <> text <> ")"

membersText ∷ CST.DataMembers → String
membersText = case _ of
  CST.DataAll _ → "(..)"
  CST.DataEnumerated names → "("
    <> intercalate ", "
      (map properText (delimitedItems names))
    <> ")"

exportName ∷ CST.Export Void → Array String
exportName = case _ of
  CST.ExportValue name → [ identText name ]
  CST.ExportOp name → [ operatorText name ]
  CST.ExportType name members →
    [ properText name <> maybe "" membersText members ]
  CST.ExportTypeOp _ name → [ "type " <> operatorText name ]
  CST.ExportClass _ name → [ "class " <> properText name ]
  CST.ExportModule _ name → [ "module " <> moduleText name ]
  CST.ExportError error → absurd error

importName ∷ CST.Import Void → Array String
importName = case _ of
  CST.ImportValue name → [ identText name ]
  CST.ImportOp name → [ operatorText name ]
  CST.ImportType name members →
    [ properText name <> maybe "" membersText members ]
  CST.ImportTypeOp _ name → [ "type " <> operatorText name ]
  CST.ImportClass _ name → [ "class " <> properText name ]
  CST.ImportError error → absurd error

imported ∷ CST.ImportDecl Void → Imported
imported (CST.ImportDecl declaration) =
  { name: moduleText declaration.module
  , open: maybe true (const false) declaration.names
  , hiding: maybe false hidingOf declaration.names
  , names: maybe [] listed declaration.names
  }
  where
  hidingOf (Tuple keyword _) = maybe false (const true) keyword
  listed (Tuple _ list) = foldMap importName (wrappedItems list)

declarationName ∷ CST.Declaration Void → String
declarationName = case _ of
  CST.DeclValue fields → identText fields.name
  CST.DeclInstanceChain _ → "instance"
  _ → ""

declarationUses ∷ CST.Declaration Void → Array Use
declarationUses declaration = map located (foldMapDecl visitor declaration)
  where
  visitor = defaultMonoidalVisitor
    { onExpr = expressionForms, onBinder = binderForms }
  located form = { declaration: declarationName declaration, form }

expressionForms ∷ CST.Expr Void → Array String
expressionForms = case _ of
  CST.ExprRecordAccessor accessor →
    formIf "accessor" (Array.any isTraceLabel (separatedItems accessor.path))
  CST.ExprRecordUpdate _ updates → foldMap updateForms (wrappedItems updates)
  CST.ExprRecord fields → foldMap (labeledForms "field") (delimitedItems fields)
  _ → []

binderForms ∷ CST.Binder Void → Array String
binderForms = case _ of
  CST.BinderRecord fields → foldMap (labeledForms "binder")
    (delimitedItems fields)
  _ → []

updateForms ∷ CST.RecordUpdate Void → Array String
updateForms = case _ of
  CST.RecordUpdateLeaf label _ _ → formIf "update" (isTraceLabel label)
  CST.RecordUpdateBranch label nested → formIf "update" (isTraceLabel label)
    <> foldMap updateForms (wrappedItems nested)

labeledForms ∷ ∀ a. String → CST.RecordLabeled a → Array String
labeledForms form = case _ of
  CST.RecordPun name → formIf form (identText name == traceLabel)
  CST.RecordField label _ _ → formIf form (isTraceLabel label)

formIf ∷ String → Boolean → Array String
formIf form found = if found then [ form ] else []

isTraceLabel ∷ CST.Name CST.Label → Boolean
isTraceLabel (CST.Name { name: CST.Label text }) = text == traceLabel

declarationInstances ∷ CST.Declaration Void → Array InstanceFact
declarationInstances = case _ of
  CST.DeclInstanceChain chain → map instanceHead (separatedItems chain)
  CST.DeclDerive _ _ head → [ headFact head ]
  _ → []
  where
  instanceHead (CST.Instance instance_) = headFact instance_.head

headFact ∷ CST.InstanceHead Void → InstanceFact
headFact head =
  { className: qualifiedText head.className
  , types: foldMap (foldMapType visitor) head.types
  }
  where
  visitor = defaultMonoidalVisitor { onType = constructorNames }

constructorNames ∷ CST.Type Void → Array String
constructorNames = case _ of
  CST.TypeConstructor name → [ qualifiedText name ]
  _ → []

qualifiedText ∷ CST.QualifiedName CST.Proper → String
qualifiedText (CST.QualifiedName { name: CST.Proper text }) = text
