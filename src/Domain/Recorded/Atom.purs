-- The recorded problem's vocabulary (T-R0b §2, §3.5, §5.2, §10):
-- variables, type expressions, atoms, markers, sites and the site table's
-- entries. Plain data; only the problem itself is opaque.
module Domain.Recorded.Atom
  ( Atom(..)
  , Base(..)
  , CallSite
  , Callee(..)
  , CheckedName(..)
  , Head(..)
  , Holders
  , OutsideKind(..)
  , Quant(..)
  , RTExpr(..)
  , ReqAtom(..)
  , Role(..)
  , Var(..)
  , VarInfo
  , VarOrigin
  , VarSort(..)
  ) where

import Prelude
import Data.Maybe (Maybe)
import Data.Set (Set)
import Data.Tuple (Tuple)
import Domain.Recorded.Origin (Path, RuleId)
import Domain.Resolved (CtorId, FunctionId)
import Domain.Row (EffectRef)
import Domain.Syntax (Span)
import Domain.Type (TypeId, VarId)

-- A problem variable: a rigid one by its `VarId` (Sig1), a fresh one by
-- its canonical name `⟨p, role⟩` (§2.3; identities, §6).
data Var = RigidVar VarId | FreshVar Path Role

-- §2.3's roles. `Inst i` takes the sort of the callee's, owner's or
-- effect's variable `i`.
data Role
  = Inst VarId
  | Res
  | Param Int
  | Field String
  | Rest
  | Upd String
  | UpdRest String
  | Spread Int

-- Lean's `TExpr` with §2.1's `app` node; a record's tails are row
-- variables.
data RTExpr
  = Base Base
  | Arrow RTExpr RTExpr
  | TVar Var
  | Record (Array (Tuple String RTExpr)) (Array Var)
  | App Head (Array RTExpr)

-- A declaration of thousands of parameters has an arrow spine as long
-- (Domain.Type.Core's `Ty`), so equality walks a spine by a loop: purs
-- compiles `sameSpine`'s self tail call to one. It recurses only into
-- parameters and record or application arguments, which nesting bounds.
-- No wildcard arm: a new constructor fails to compile here.
instance eqRTExpr ∷ Eq RTExpr where
  eq = sameSpine

sameSpine ∷ RTExpr → RTExpr → Boolean
sameSpine left right = case left, right of
  Arrow one rest, Arrow other more →
    if one == other then sameSpine rest more else false
  Base one, Base other → one == other
  TVar one, TVar other → one == other
  Record one oneTails, Record other otherTails →
    one == other && oneTails == otherTails
  App one oneArguments, App other otherArguments →
    one == other && oneArguments == otherArguments
  Arrow _ _, _ → false
  Base _, _ → false
  TVar _, _ → false
  Record _ _, _ → false
  App _ _, _ → false

-- The program's declared types and, among them, every one whose
-- constructors hold a function, directly or through another declared
-- type, a record field or a type argument (Features.Check.Functional's
-- set). Ruling K-a (author, 2026-10-23): the recorded problem carries
-- the complete set, so the ground rule reads the problem alone; a head
-- outside `declared` is never judged printable.
type Holders = { declared ∷ Set TypeId, holding ∷ Set TypeId }

-- `base`: a builtin, or a declared type of no parameters (§2.2).
data Base = IntBase | BoolBase | TextBase | UnitBase | DataBase TypeId

-- A handler's head names its effect by reference, so the builtin effects
-- have one too: `Handler(Console)` is `HandlerHead ConsoleEffect` (Task
-- 3.2; §2.2's `Handler e` covers every effect a handler type names).
data Head = DataHead TypeId | HandlerHead EffectRef

-- Lean's atoms (Composition/Syntax.lean): `eq t u`, `lacks ρ l`,
-- `disjoint ρ σ`, `ff`.
data Atom
  = Equal RTExpr RTExpr
  | Lacks Var String
  | Disjoint Var Var
  | Ff

-- Requirement atoms [VOR]: `pr τ`, `cmp τ`.
data ReqAtom = Printable RTExpr | Comparable RTExpr

-- §3.5's markers.
data OutsideKind
  = EffectArgument
  | DataOverRecords
  | DataApplication
  | HandlerType
  | FailFamily
  | Deferred
  | LocalGeneralization

-- An `adm` or `split` site: one function or constructor reference and
-- its instantiation slots.
type CallSite = { callee ∷ Callee, slots ∷ Array Var }

data Callee = CalleeFunction FunctionId | CalleeCtor CtorId

-- §5.2's site table entry for one variable. `quant` is fixed by Sig1 and
-- §2.3; `position` is its checked-IR position.
type VarInfo =
  { sort ∷ VarSort
  , quant ∷ Quant
  , origin ∷ VarOrigin
  , position ∷ CheckedName
  }

-- Amendment to §5.2 (Task 3.1): `role` is `Nothing` for a rigid
-- variable, which §2.3 gives no role.
type VarOrigin =
  { path ∷ Path, role ∷ Maybe Role, rule ∷ RuleId, span ∷ Span }

data VarSort = SortType | SortRow

data Quant = Forall VarId | Exists

data CheckedName
  = RigidName VarId
  | Slot Path Int
  | NodeType Path
  | ParamType Path Int
  | LambdaBody Path
  | PatternType Path
  | RestType Path
  | Auxiliary

derive instance eqVar ∷ Eq Var
derive instance ordVar ∷ Ord Var
derive instance eqRole ∷ Eq Role
derive instance ordRole ∷ Ord Role
derive instance eqBase ∷ Eq Base
derive instance eqHead ∷ Eq Head
derive instance eqAtom ∷ Eq Atom
derive instance eqReqAtom ∷ Eq ReqAtom
derive instance eqOutsideKind ∷ Eq OutsideKind
derive instance eqCallee ∷ Eq Callee
derive instance eqVarSort ∷ Eq VarSort
derive instance eqQuant ∷ Eq Quant
derive instance eqCheckedName ∷ Eq CheckedName
