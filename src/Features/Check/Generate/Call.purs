-- T-R0b §3.2, E3-E6: references to and calls of functions and
-- constructors. Each occurrence instantiates the callee's or owner's
-- variables as `⟨p, inst i⟩` (θ), so two occurrences share none
-- (G-fresh). The declared count `n` comes from the signature, so the
-- over-application case is syntactic (§4). Index order (docs/findings.md
-- "RT1's translator", reading 4): the rule's listed entries, then the
-- markers of the types it translated (T₁ … Tₙ, then the result).
module Features.Check.Generate.Call
  ( call
  , construct
  , ctorRef
  , functionRef
  ) where

import Prelude
import Data.Traversable (sequence)
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Atom(..)
  , Callee(..)
  , RTExpr(..)
  , Var
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (CtorId, Expr, FunctionId)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh (childAt, instNaming, instVars, nodeRes)
import Features.Check.Generate.Lookup (calleeOf, ctorShape)
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , Listed
  , concatOut
  , emit
  , listed
  , markersAt
  , varsOut
  )
import Features.Check.Generate.Signature (calleeClauses)
import Features.Check.Generate.Translate (arrowOf, translate, translateAll)

-- An instantiated callee or constructor: its parameter (or field) types
-- and result under θ, its listed entries and variables, and the markers
-- of those types.
type Instance =
  { parameters ∷ Array RTExpr
  , result ∷ RTExpr
  , entries ∷ Array Listed
  , vars ∷ Array (Tuple Var VarInfo)
  , markers ∷ Array Listed
  }

type Node = { path ∷ Path, span ∷ Span, rule ∷ RuleId }

-- E3: `θ(⟦T₁ → … → R⟧)`.
functionRef ∷ Context → Path → Span → FunctionId → Gen Generated
functionRef context path span function =
  referenced context path
    (ExprRule 3) <$> functionInstance context path span function (ExprRule 3)

-- E4: `θ(⟦fields → owner(args)⟧)`.
ctorRef ∷ Context → Path → Span → CtorId → Gen Generated
ctorRef context path span ctor = referenced context path (ExprRule 4)
  <$> ctorInstance context path span ctor (ExprRule 4)

-- E5: `g(e₁ … e_k)` against `g`'s `n` parameters.
call
  ∷ Recur → Context → Path → Span → FunctionId → Array Expr → Gen Generated
call recur context path span function arguments =
  applied context
    { path, span, rule: ExprRule 5 }
    <$> functionInstance context path span function (ExprRule 5)
    <*> sequence
      (Array.mapWithIndex (argument recur context path "Call") arguments)

-- E6: as E5, with the constructor's fields and owner.
construct
  ∷ Recur → Context → Path → Span → CtorId → Array Expr → Gen Generated
construct recur context path span ctor arguments =
  applied context
    { path, span, rule: ExprRule 6 }
    <$> ctorInstance context path span ctor (ExprRule 6)
    <*> sequence
      (Array.mapWithIndex (argument recur context path "Construct") arguments)

referenced ∷ Context → Path → RuleId → Instance → Generated
referenced context path rule found =
  { ty: arrowOf found.parameters found.result
  , out: concatOut
      [ varsOut found.vars
      , emit (at context path rule) (found.entries <> found.markers)
      ]
  }

-- An argument at `Call/args/i` (`Construct/args/i`). Every argument is
-- generated, whatever the count (G-dead).
argument
  ∷ Recur → Context → Path → String → Int → Expr → Gen Generated
argument recur context path label index = recur context
  (childAt path label "args" index)

-- E5/E6's arguments: `eq τ_{e_i} θ(T_i)` for `i ≤ min(k, n)` (F1); with
-- `k > n`, `⟨p, res⟩` and `eq θ(R) (τ_{e_{n+1}} → … → ⟨p, res⟩)` (B1).
applied ∷ Context → Node → Instance → Array Generated → Generated
applied context node found generated =
  { ty: if overApplied then res else partial
  , out: concatOut
      ( [ varsOut (found.vars <> if overApplied then [ resVar ] else [])
        , emit (at context node.path node.rule)
            (found.entries <> equations <> over <> found.markers)
        ]
          <> map _.out generated
      )
  }
  where
  count = Array.length found.parameters
  overApplied = Array.length generated > count
  resVar = nodeRes node.path node.rule node.span
  res = TVar (fst resVar)
  partial = arrowOf (Array.drop (Array.length generated) found.parameters)
    found.result
  equations = Array.zipWith equation generated found.parameters
  equation given declared = body RowF 1 (Equal given.ty declared)
  over =
    if overApplied then
      [ body RowB 1 (Equal found.result (arrowOf rest res)) ]
    else []
  rest = map _.ty (Array.drop count generated)
  body group number atom = listed (ToB atom) group number Body node.span

-- E3's entries (origin inst): θ(D_g) written (F2) and implied (F3), the
-- `adm` site of every reference (F7, every `inst` slot) and a `split`
-- site when `g` has a record-row variable (H2, those slots). The
-- signature is read first, then the types it holds.
functionInstance
  ∷ Context → Path → Span → FunctionId → RuleId → Gen Instance
functionInstance context path span function rule =
  calleeOf context.signatures function >>= instanceOf
  where
  callee = CalleeFunction function
  naming = instNaming path
  instanceOf signature = made (instVars path rule span signature.sorts)
    <$> translateAll context.tables naming signature.parameters
    <*> translate context.tables naming signature.result
    <*> calleeClauses context.tables naming signature
  made vars parameters result clauses =
    { parameters: parameters.tys
    , result: result.ty
    , entries: map (inst RowF 2 <<< ToB) clauses.written
        <> map (inst RowF 3 <<< ToB) clauses.implied
        <> [ inst RowF 7 (ToAdm { callee, slots: map fst vars }) ]
        <> splitSite (Array.mapMaybe rowSlot vars)
    , vars
    , markers: markersAt InstOrigin span (parameters.marks <> result.marks)
    }
  rowSlot (Tuple var info) =
    if info.sort == SortRow then Just var else Nothing
  splitSite rows =
    if Array.null rows then []
    else [ inst RowH 2 (ToSplit { callee, slots: rows }) ]
  inst group number item = listed item group number InstOrigin span

-- E4's entries (origin inst): `disjoint` per joined pair of the
-- constructor (F8; reading 8: not the fields' implied `lacks`).
ctorInstance ∷ Context → Path → Span → CtorId → RuleId → Gen Instance
ctorInstance context path span ctor rule =
  ctorShape context.tables ctor >>= instanceOf
  where
  naming = instNaming path
  instanceOf shape = made shape
    <$> translateAll context.tables naming shape.fields
    <*> translate context.tables naming shape.owner
  made shape fields owner =
    { parameters: fields.tys
    , result: owner.ty
    , entries: map joinedPair shape.joined
    , vars: instVars path rule span shape.sorts
    , markers: markersAt InstOrigin span (fields.marks <> owner.marks)
    }
  joinedPair { variables: Tuple one other } = listed
    (ToB (Disjoint (naming one) (naming other)))
    RowF
    8
    InstOrigin
    span
