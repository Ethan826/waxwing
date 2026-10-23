-- T-R0a §3.2, T-R0b §1: the per-declaration static refusals, judged
-- beside the recorded problem. A resolved declaration can break only the
-- class-a rules today's check raises (every Resolve refusal stops before
-- there is a resolved declaration, T-R0b §8): the arity of a call or
-- pipe against a declared result that is never a function, a call with
-- no arguments to a callee with parameters, `print`, `show` and `crash`
-- with other than one argument, and `main`'s printable result. Each is
-- found syntactically, at the raise site Task 2.3 classified, and its
-- refusal comes from that classification (`staticRefusal`), so the class
-- is never decided here. Run before generation only from Task 4.6.
--
-- Amendment (Task 3.2): T-R0b §10 types this `Tables → FunctionDecl`,
-- but the arity at a fixed result reads the callee's declared result, a
-- signature, which `Tables` does not hold; `Signatures` is added.
module Features.Check.Generate.Static.Rules (staticRules) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (Expr(..), FunctionDecl, Ty(..), VarId)
import Domain.Verdict (StaticRefusal)
import Features.Check.Functional (containsFunction, functional)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Lookup (calleeOf, ctorShape)
import Features.Check.Generate.Signature (isEntry)
import Features.Check.Generate.Static (staticRefusal)
import Features.Check.Generate.Static.Site
  ( AritySite(..)
  , NameSite(..)
  , RaiseSite(..)
  )
import Features.Check.Generate.Static.Walk (expressions)

staticRules ∷ Tables → Signatures → FunctionDecl → Array StaticRefusal
staticRules tables signatures function = Array.mapMaybe refusal
  (entry <> Array.concatMap (sitesAt tables signatures) nodes)
  where
  nodes = expressions (Path { root: InBody, steps: [] }) function.body
  refusal (Tuple at site) = staticRefusal at site
  -- Outcomes.purs:136 `printableEntry`: `main`'s result holds no
  -- function, directly or through a declared type's fields.
  entry
    | isEntry function
        && containsFunction (functional tables.ctors) function.result =
        [ Tuple (Path { root: InResult, steps: [] }) (NameAt EntryPrintable) ]
    | otherwise = []

-- The static raise sites at one node; every constructor is named, so a
-- new one must be classified here.
sitesAt
  ∷ Tables → Signatures → Tuple Path Expr → Array (Tuple Path RaiseSite)
sitesAt tables signatures (Tuple at found) = map (Tuple at) case found of
  Call _ function arguments → named (function' function) arguments
  Construct _ ctor arguments → named (ctor' ctor) arguments
  Pipe _ _ right → pipeSites (saturated right)
  Print _ arguments → counted PrintArguments arguments
  Show _ arguments → counted ShowArguments arguments
  Crash _ arguments → counted CrashArguments arguments
  Integer _ _ → []
  Boolean _ _ → []
  Local _ _ → []
  FunctionRef _ _ → []
  CtorRef _ _ → []
  Add _ _ _ → []
  Concat _ _ _ → []
  Interpolate _ _ → []
  Compare _ _ _ _ → []
  If _ _ _ _ → []
  Match _ _ _ → []
  Lambda _ _ _ → []
  Apply _ _ _ → []
  UnitValue _ → []
  Block _ _ _ → []
  OperationRef _ _ _ → []
  Perform _ _ _ _ → []
  PrintRef _ → []
  ShowRef _ → []
  CrashRef _ → []
  Handler _ _ _ → []
  With _ _ _ → []
  Handle _ _ _ → []
  Fail _ _ _ → []
  TextLiteral _ _ → []
  RecordLiteral _ _ → []
  FieldAccess _ _ _ → []
  RecordUpdate _ _ _ → []
  RecordExtension _ _ → []
  RecordRemoval _ _ _ → []
  where
  function' function = declaredOf (calleeOf signatures function)
  ctor' ctor = constructed (ctorShape tables ctor)
  -- A pipe into a saturated named call whose declared result is never a
  -- function (Pipe.purs:33); its instantiated case (:36) is semantic.
  pipeSites = maybe [] pipeFixed
  pipeFixed callee = if callee.fixed then [ ArityAt PipeFixedResult ] else []
  saturated = case _ of
    Call _ function arguments → saturation (function' function) arguments
    Construct _ ctor arguments
      | not (Array.null arguments) → saturation (ctor' ctor) arguments
    _ → Nothing

-- What an arity rule reads of a named callee: its declared count and
-- whether its declared result can never be a function (Call.purs
-- `fixedResult`: not an arrow, not a variable). A constructor's result
-- is its owner, never a function.
type Declared = { count ∷ Int, fixed ∷ Boolean }

declaredOf
  ∷ ∀ r. { parameters ∷ Array (Ty VarId), result ∷ Ty VarId | r } → Declared
declaredOf callee =
  { count: Array.length callee.parameters, fixed: fixedResult callee.result }

constructed ∷ ∀ r. { fields ∷ Array (Ty VarId) | r } → Declared
constructed ctor = { count: Array.length ctor.fields, fixed: true }

-- Call.purs `named`: no argument to a callee with parameters (:123); more
-- than `n` against a fixed declared result (:144). Its instantiated
-- case (:148) is semantic.
named ∷ Declared → Array Expr → Array RaiseSite
named callee arguments = without <> over
  where
  given = Array.length arguments
  without =
    if given == 0 && callee.count > 0 then [ ArityAt CallWithoutArguments ]
    else []
  over =
    if given > callee.count && callee.fixed then [ ArityAt CallFixedResult ]
    else []

-- Call.purs `saturatedResult`: exactly `n` arguments.
saturation ∷ Declared → Array Expr → Maybe Declared
saturation callee arguments =
  if Array.length arguments == callee.count then Just callee else Nothing

-- Show.purs:27, Operation.purs:64, :104: other than one argument.
counted ∷ AritySite → Array Expr → Array RaiseSite
counted site arguments =
  if Array.length arguments /= 1 then [ ArityAt site ] else []

fixedResult ∷ Ty VarId → Boolean
fixedResult = case _ of
  TFun _ _ _ → false
  TVar _ → false
  TInt → true
  TBool → true
  TData _ _ _ → true
  TUnit → true
  THandler _ _ → true
  TText → true
  TRecord _ → true
