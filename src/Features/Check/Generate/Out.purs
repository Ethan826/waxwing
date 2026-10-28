-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a generation rule contributes (T-R0b §2.4): entries with their
-- origins (§6), fresh variables with their site-table entries (§5.2) and
-- each node's type. A rule's entries at one path are indexed in its
-- listed order (§6 "Index"), so the index is fixed by the rule alone.
module Features.Check.Generate.Out
  ( At
  , EffectItem(..)
  , Item(..)
  , Listed
  , Out
  , TypeMarker(..)
  , concatOut
  , emit
  , noOut
  , varsOut
  ) where

import Data.Array as Array
import Data.Tuple (Tuple)
import Domain.Recorded.Atom
  ( Atom
  , CallSite
  , OutsideKind
  , RTExpr
  , ReqAtom
  , Var
  , VarInfo
  )
import Domain.Recorded.Effect
  ( EVar
  , InstanceSig
  , MRow
  , MTy
  , Obligation
  , Position
  )
import Domain.Recorded.Origin
  ( Entry
  , Origin
  , OriginKind
  , Path
  , RuleId
  , SpecRow
  )
import Domain.Resolved (FunctionId)
import Domain.Syntax (Span)
import Domain.Type (VarId)

type Out =
  { d ∷ Array (Entry Atom)
  , b ∷ Array (Entry Atom)
  , bq ∷ Array (Entry ReqAtom)
  , outside ∷ Array (Entry OutsideKind)
  , adm ∷ Array (Entry CallSite)
  , split ∷ Array (Entry CallSite)
  , vars ∷ Array (Tuple Var VarInfo)
  , types ∷ Array (Tuple Path RTExpr)
  , effects ∷ Array EffectItem
  }

-- What a rule adds to the effect problem (a-min §10), in emission order.
data EffectItem
  = Obliged (Entry Obligation)
  | NodeAt Path MTy
  | InstanceAt Path InstanceSig
  | AnnotationAt Path MTy
  | RigidMark String
  | EffectRigid VarId
  | ArityAt Path Int
  | AmbientAt Path MRow
  | SignatureAt Path InstanceSig
  | MintedVar EVar
  | MintedPosition Position

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
  { d: []
  , b: []
  , bq: []
  , outside: []
  , adm: []
  , split: []
  , vars: []
  , types: []
  , effects: []
  }

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
  , effects: Array.concatMap _.effects outs
  }

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
