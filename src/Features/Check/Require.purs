module Features.Check.Require
  ( module Features.Check.TypeName
  , Requiring
  , require
  , expectType
  , bounded
  , tooDeepAt
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Map (Map)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..), thisFunction)
import Domain.Resolved (EffectInfo)
import Domain.Row (Row(..), isPure)
import Features.Check.Provenance (trail)
import Features.Check.Report (crossingNotes, originNotes)
import Features.Check.RowName (labelName, rowConflict)
import Features.Check.TypeName (Names, typeName, typeNames)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Features.Check.Context (CheckEnv)
import Features.Check.Hint (hinted)
import Features.Check.Lacked (refusedAt)
import Features.Check.Placeholder (placeholderAt)
import Features.Check.Sync (sync)
import Features.Check.Scheme (State, flexible, opened, resolved, tooDeep)
import Features.Check.RowStore (atSite)
import Features.Check.Subst (onStore)
import Features.Check.Unify (Failure(..), inferredTypeLimit, unify)

-- What a diagnostic needs to name a type: the declared types, and the
-- enclosing function's variables (`VarId i` is the i-th).

-- What `require` needs: names for its message, declarations for its hint.
type Requiring r = CheckEnv r

-- The expression's type must unify with the expected one. A mismatch may
-- gain the under-application hint (Features.Check.Hint).
require
  ∷ ∀ r
  . Requiring r
  → State
  → Ty Open
  → Checked.Expr
  → Either Diagnostic State
require env state expected actual = either hint Right
  ( expectType env state expected (Checked.typeOf actual)
      (Checked.spanOf actual)
  )
  where
  -- The hint reads `headOf` of the expected type, which the hook may have
  -- solved (design §3.4: Hint is an eager decision). The synced state never
  -- escapes: this branch returns `Left`. No test observes the synced hint
  -- (the gate's accepted programs never reach it).
  hint = Left <<< hinted env synced expected actual
  synced = either (const state) identity
    (sync env state (Checked.spanOf actual))

-- A failure names the whole expected and found types, resolved under the
-- substitution before this comparison, as monomorphic checking always did;
-- the unifier's own pair is only the innermost one that differs. A row
-- failure is reported so too until rows are written (FX001 Task 4).
expectType
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo, introduced ∷ Map String Span | r)
  → State
  → Ty Open
  → Ty Open
  → Span
  → Either Diagnostic State
-- Both operands are bounded first, since unifying recurses over them.
expectType env state expected actual span = do
  bounded state expected span
  bounded state actual span
  either failed bound
    ( unify (atSpan (Just span) state.subst) (flexible expected)
        (flexible actual)
    )
  where
  -- Metas bound while this requirement is checked arrive here (`arrivedAt`).
  atSpan site = onStore (atSite site)
  bound subst = Right (state { subst = atSpan Nothing subst })
  failed = case _ of
    Occurs meta whole → reported InfiniteType (TVar (Hole meta)) (opened whole)
    TooDeep → tooDeepAt span
    Mismatch _ _ → mismatched unit
    RowMissing label row occurrence → rowFailure label row occurrence
    RowExtra label _ occurrence → rowFailure label (Row [] Nothing) occurrence
    RowSharedTail left right → rowConflict env span left right
    RowMismatch _ _ → mismatched unit
    RowPayload _ _ _ → mismatched unit
    RowOccurs _ _ → mismatched unit
    Refused refusal → Left (refusedAt env state.subst span refusal)
    Placeholder what → Left (placeholderAt span what)
  -- The label's trail is where it arose, as far as the state knows it.
  rowFailure label row occurrence = do
    name ← labelName env span label
    Left
      { problem: rowProblem name row
      , span
      , related: originNotes span name (walk occurrence)
          <> crossingNotes name (walk occurrence)
      }
  rowProblem name row =
    if isPure row then MustBePure name
    else EffectNotAllowed thisFunction name
  walk = trail state.subst state.origins

  -- A function: `where` bindings are strict, and this resolves both types.
  mismatched _ = reported TypeMismatch (resolved state.subst expected)
    (resolved state.subst actual)
  reported problem one other = do
    Tuple first second ← typeNames env span one other
    Left (problemAt (problem first second) span)

-- A type, resolved under the state, may be at most `inferredTypeLimit`
-- deep; past it is E_NESTING at `span`, before anything recurses on it.
bounded ∷ State → Ty Open → Span → Either Diagnostic Unit
bounded state ty span =
  if tooDeep state.subst ty then tooDeepAt span else Right unit

tooDeepAt ∷ ∀ a. Span → Either Diagnostic a
tooDeepAt span = Left (problemAt (TypeTooDeep inferredTypeLimit) span)
