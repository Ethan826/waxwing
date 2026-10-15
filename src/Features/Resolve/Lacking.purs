module Features.Resolve.Lacking
  ( Lacking
  , signatureLacking
  , lackingIn
  , signatureOccurrences
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Domain.Note (NoteReason(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Resolved (TypeId(..))
import Domain.Type (Ty(..), TyRow, VarId(..))
import Features.Check.Implied (Implied, declared, implied)
import Features.Resolve.Marks (arrowRows)
import Features.Resolve.ArgumentClash (clashIn)
import Features.Resolve.Occurrences (Occurrence, typeOccurrences)
import Features.Resolve.Occurrences as Occurrences
import Features.Resolve.RecordArguments
  ( RecordArgument
  , recordArguments
  , slotOf
  )

-- What a signature says each of its record row variables lacks (R001
-- design §2, rule 4), the set its body is seeded with
-- (Features.Check.Function), and where each is introduced: its first
-- written `...r`.
type Lacking =
  { variables ∷ Array String
  , lacks ∷ Map Int (Set String)
  , introduced ∷ Map String Syntax.Span
  }

-- A label written beside a record tail, or a declared type's, where it is
-- written: at the label, or at the `...r` passed to that type.
type Written = { tail ∷ String, label ∷ String, span ∷ Syntax.Span }

type Signature r =
  { variables ∷ Array String
  , sorts ∷ Array Syntax.Sort
  , parameters ∷ Array Resolved.Parameter
  , result ∷ Ty VarId
  , row ∷ TyRow VarId
  | r
  }

-- Nothing for a signature with no record row variable: no type in its
-- body can have a record tail then (every program before records).
signatureLacking
  ∷ ∀ r
  . Occurrences.Declared
  → Resolved.Tables
  → Syntax.FunctionDecl
  → Signature r
  → Maybe Lacking
signatureLacking declaredHere tables function signature =
  if Array.elem Syntax.RecordSort signature.sorts then Just
    (lackingOf declaredHere tables function signature)
  else Nothing

-- A function, so that only a signature with a record row variable pays
-- for its walk: `where` bindings are strict.
lackingOf
  ∷ ∀ r
  . Occurrences.Declared
  → Resolved.Tables
  → Syntax.FunctionDecl
  → Signature r
  → Lacking
lackingOf declaredHere tables function signature =
  { variables: signature.variables, lacks, introduced }
  where
  types = map typeOf signature.parameters
    <> [ signature.result, TFun TUnit signature.row TUnit ]
  typeOf parameter = parameter.ty
  lacks = foldl noted Map.empty (Array.concatMap (implied tables) types)
  noted found (entry ∷ Implied VarId) = case entry.tail of
    VarId index → Map.insertWith Set.union index entry.labels found
  introduced = foldl first Map.empty
    (Array.sortWith start (signatureOccurrences declaredHere function))
  first found occurrence
    | Map.member occurrence.name found = found
    | otherwise = Map.insert occurrence.name occurrence.span found
  start occurrence = occurrence.span.start.offset

-- A type written in a body names only its signature's variables, so each
-- record tail in it is one of the signature's rigids, which a caller may
-- fill with any label the signature does not say it lacks: a label beside
-- one must be among those (C1, R001 final review). The first in source
-- order is reported. A record argument there must not repeat its
-- declaration's labels (ArgumentClash, R012), checked first.
lackingIn
  ∷ ∀ r
  . { types ∷ Array Resolved.TypeInfo
    , ctors ∷ Array Resolved.CtorInfo
    , lacking ∷ Maybe Lacking
    | r
    }
  → Syntax.TypeRef
  → Either Syntax.Diagnostic Unit
lackingIn scope reference = clashIn tables reference
  *> maybe (Right unit) checked scope.lacking
  where
  checked lacking = maybe (Right unit) (refused lacking)
    ( Array.head
        ( Array.sortWith start
            (Array.filter (unlacked lacking) (written tables reference))
        )
    )
  tables = { types: scope.types, ctors: scope.ctors }
  start found = found.span.start.offset
  unlacked lacking found = maybe false (absent lacking found)
    (Array.elemIndex found.tail lacking.variables)
  absent lacking found index = not
    (Set.member found.label (lacksAt lacking index))
  lacksAt lacking index = maybe Set.empty identity
    (Map.lookup index lacking.lacks)
  refused lacking found = Left
    { problem: RowMayHaveField found.tail found.label
    , span: found.span
    , related: maybe [] (note found.tail)
        (Map.lookup found.tail lacking.introduced)
    }
  note name span = [ { span, reason: IntroducedHere name } ]

-- Every label a written type puts beside a record tail.
written ∷ Resolved.Tables → Syntax.TypeRef → Array Written
written tables reference = beside reference
  <> Array.concatMap (passed tables) (recordArguments tables.types reference)

-- A tail passed to a declared type's record parameter, alone (`...r`) or
-- as a record argument's tail (R012), implies the labels that type writes
-- beside that parameter (Features.Check.Implied), all at the `...r`.
passed ∷ Resolved.Tables → RecordArgument → Array Written
passed tables argument = maybe [] labelled argument.tail
  where
  labelled tail = map (at tail) (Set.toUnfoldable labels)
  labels = maybe Set.empty implied (Array.index tables.types argument.callee)
  implied info = declared tables (TypeId argument.callee)
    (slotOf info argument.position)
  at tail label = { tail: tail.name, label, span: tail.span }

-- The labels written beside a record tail, at each label. Recursion is
-- over written structure, which the nesting limits bound; an arrow chain
-- is walked by loops (`Syntax.typeRefSpine`).
beside ∷ Syntax.TypeRef → Array Written
beside = case _ of
  Syntax.RecordRef _ fields tail → maybe [] (own fields) tail
    <> Array.concatMap field fields
  Syntax.NamedRef _ _ arguments → Array.concatMap argument arguments
  Syntax.THandlerRef _ label row → labelled label <> maybe [] rowLabels row
  arrow@(Syntax.FunRef _ _ _ _) →
    Array.concatMap beside
      (Array.snoc spine.parameters spine.result)
      <> Array.concatMap (maybe [] rowLabels) (arrowRows arrow)
    where
    spine = Syntax.typeRefSpine arrow
  _ → []
  where
  own fields tail = map (labelAt tail) fields
  labelAt tail found = { tail: tail.name, label: found.name, span: found.span }
  field found = beside found.ty
  argument = case _ of
    Syntax.TypeArgument found → beside found
    Syntax.RowArgument row → rowLabels row
  rowLabels (Syntax.RowRef _ labels _) = Array.concatMap labelled labels
  labelled label = Array.concatMap beside label.arguments

signatureOccurrences
  ∷ Occurrences.Declared → Syntax.FunctionDecl → Array Occurrence
signatureOccurrences declaredHere function =
  Array.concatMap (typeOccurrences declaredHere) references
    <> maybe [] (Occurrences.rowOccurrences declaredHere Nothing) function.row
  where
  references = Array.snoc (map typeOf function.parameters) function.result
  typeOf parameter = parameter.ty
