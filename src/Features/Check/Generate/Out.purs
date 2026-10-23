-- What a generation rule contributes (T-R0b §2.4): entries with their
-- origins (§6), fresh variables with their site-table entries (§5.2) and
-- each node's type. A rule's entries at one path are indexed in its
-- listed order (§6 "Index"), so the index is fixed by the rule alone.
module Features.Check.Generate.Out
  ( At
  , Generated
  , Item(..)
  , Listed
  , Out
  , TypeMarker(..)
  , concatOut
  , emit
  , listed
  , markersAt
  , noOut
  , typeAt
  , varsOut
  ) where

import Prelude
import Data.Array as Array
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom
  ( Atom
  , CallSite
  , OutsideKind(..)
  , RTExpr
  , ReqAtom
  , Var
  , VarInfo
  )
import Domain.Recorded.Origin
  ( Entry
  , Origin
  , OriginKind
  , Path
  , RowGroup(..)
  , RuleId
  , SpecRow(..)
  )
import Domain.Resolved (FunctionId)
import Domain.Syntax (Span)

type Out =
  { d ∷ Array (Entry Atom)
  , b ∷ Array (Entry Atom)
  , bq ∷ Array (Entry ReqAtom)
  , outside ∷ Array (Entry OutsideKind)
  , adm ∷ Array (Entry CallSite)
  , split ∷ Array (Entry CallSite)
  , vars ∷ Array (Tuple Var VarInfo)
  , types ∷ Array (Tuple Path RTExpr)
  }

-- An expression's or pattern's result: its type and what it contributes.
type Generated = { ty ∷ RTExpr, out ∷ Out }

-- Which part of the problem an entry joins.
data Item
  = ToD Atom
  | ToB Atom
  | ToBQ ReqAtom
  | ToOutside OutsideKind
  | ToAdm CallSite
  | ToSplit CallSite

type Listed = { item ∷ Item, row ∷ SpecRow, kind ∷ OriginKind, span ∷ Span }

-- The rule emitting and where: its entries' AtomId and rule.
type At = { decl ∷ FunctionId, path ∷ Path, rule ∷ RuleId }

-- §2.2's markers, which translating a written type emits: an `app` over
-- a declared type with a record-row parameter, any other `app` with
-- arguments, and a handler type.
data TypeMarker = OverRecords | Application | HandlerMark

noOut ∷ Out
noOut =
  { d: [], b: [], bq: [], outside: [], adm: [], split: [], vars: [], types: [] }

-- One pass per field over every part, so a node of many children costs
-- linear time (never an append per child).
concatOut ∷ Array Out → Out
concatOut outs =
  { d: Array.concatMap _.d outs
  , b: Array.concatMap _.b outs
  , bq: Array.concatMap _.bq outs
  , outside: Array.concatMap _.outside outs
  , adm: Array.concatMap _.adm outs
  , split: Array.concatMap _.split outs
  , vars: Array.concatMap _.vars outs
  , types: Array.concatMap _.types outs
  }

listed ∷ Item → RowGroup → Int → OriginKind → Span → Listed
listed item group number kind span =
  { item, row: SpecRow group number, kind, span }

-- The rule's entries at its path, indexed in listed order.
emit ∷ At → Array Listed → Out
emit at items = concatOut (Array.mapWithIndex entryOut items)
  where
  entryOut index found = placed (originOf index found) found.item
  originOf index found =
    { atom: { decl: at.decl, path: at.path, index }
    , rule: at.rule
    , row: found.row
    , span: found.span
    , kind: found.kind
    }

-- The rows T-R0b gives §2.2's markers under every rule (O5, F8, O3;
-- docs/findings.md "RT1's translator", reading 7).
markersAt ∷ OriginKind → Span → Array TypeMarker → Array Listed
markersAt kind span = map marked
  where
  marked = case _ of
    OverRecords → listed (ToOutside DataOverRecords) RowO 5 kind span
    Application → listed (ToOutside DataApplication) RowF 8 kind span
    HandlerMark → listed (ToOutside HandlerType) RowO 3 kind span

typeAt ∷ Path → RTExpr → Out
typeAt path ty = noOut { types = [ Tuple path ty ] }

varsOut ∷ Array (Tuple Var VarInfo) → Out
varsOut vars = noOut { vars = vars }

placed ∷ Origin → Item → Out
placed origin = case _ of
  ToD value → noOut { d = [ { origin, value } ] }
  ToB value → noOut { b = [ { origin, value } ] }
  ToBQ value → noOut { bq = [ { origin, value } ] }
  ToOutside value → noOut { outside = [ { origin, value } ] }
  ToAdm value → noOut { adm = [ { origin, value } ] }
  ToSplit value → noOut { split = [ { origin, value } ] }
