-- T-R0b §3.5, E18 and E19: `print`, `show` and `crash`, as references
-- and as calls. A reference is a checked `Lambda` (Check/Show.purs,
-- Operation.purs `crashRef`), so its parameter `π = ⟨p, param 0⟩` is at
-- `ParamType p 0` and `crash`'s result at `LambdaBody p` (§5.2, §18.69
-- Q12). The requirement atom `pr` [VOR] is origin body (C1). A call with
-- other than one argument gets every argument's entries and no `pr`: its
-- arity is a static rule (class a).
module Features.Check.Generate.Builtin
  ( Builtin(..)
  , builtinCall
  , builtinRef
  ) where

import Prelude
import Data.Traversable (sequence)
import Data.Array as Array
import Data.Tuple (fst)
import Domain.Recorded.Atom
  ( Base(..)
  , CheckedName(..)
  , RTExpr(..)
  , ReqAtom(..)
  , Role(..)
  , VarSort(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh (childAt, fresh, nodeRes)
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , concatOut
  , emit
  , listed
  , varsOut
  )
import Features.Check.Generate.Translate (arrowOf)

data Builtin = PrintBuiltin | ShowBuiltin | CrashBuiltin

-- E18: `π → Unit`, `π → Text`, `π → ⟨p, res⟩`; `pr π`.
builtinRef ∷ Context → Path → Span → Builtin → Generated
builtinRef context path span builtin =
  { ty: arrowOf [ TVar (fst parameter) ] result.ty
  , out: concatOut
      [ varsOut ([ parameter ] <> result.vars)
      , emit (at context path (ExprRule 18))
          [ listed (ToBQ (Printable (TVar (fst parameter)))) RowC 1 Body span ]
      ]
  }
  where
  parameter = fresh
    { path
    , role: Param 0
    , rule: ExprRule 18
    , span
    , sort: SortType
    , position: ParamType path 0
    }
  result = case builtin of
    PrintBuiltin → { ty: Base UnitBase, vars: [] }
    ShowBuiltin → { ty: Base TextBase, vars: [] }
    CrashBuiltin → crashResult
  crashResult = { ty: TVar (fst crashed), vars: [ crashed ] }
  crashed = fresh
    { path
    , role: Res
    , rule: ExprRule 18
    , span
    , sort: SortType
    , position: LambdaBody path
    }

-- E19: `Unit`, `Text`, `⟨p, res⟩`; `pr τ_e` when there is one argument.
-- Arguments at `Print/args/i` (`Show/…`, `Crash/…`).
builtinCall
  ∷ Recur → Context → Path → Span → Builtin → Array Expr → Gen Generated
builtinCall recur context path span builtin arguments = called
  <$> sequence (Array.mapWithIndex argument arguments)
  where
  called generated =
    { ty: result.ty
    , out: concatOut
        ( [ varsOut result.vars
          , emit (at context path (ExprRule 19))
              (map printable (single generated))
          ]
            <> map _.out generated
        )
    }
  argument index = recur context (childAt path (label builtin) "args" index)
  single generated =
    if Array.length generated == 1 then generated else []
  printable found = listed (ToBQ (Printable found.ty)) RowC 1 Body span
  result = case builtin of
    PrintBuiltin → { ty: Base UnitBase, vars: [] }
    ShowBuiltin → { ty: Base TextBase, vars: [] }
    CrashBuiltin → { ty: TVar (fst resVar), vars: [ resVar ] }
  resVar = nodeRes path (ExprRule 19) span

label ∷ Builtin → String
label = case _ of
  PrintBuiltin → "Print"
  ShowBuiltin → "Show"
  CrashBuiltin → "Crash"
