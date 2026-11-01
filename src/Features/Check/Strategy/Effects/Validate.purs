-- trusted surface: every diff needs token review; see docs/engineering.md
-- A2's validator steps around G0 (spec §4, §5; dossier §18.145 (b)).
-- `prerequisites` reads the problem and the input package: record
-- validation (step 0, Effects.Record), then the first `Unsupported`
-- obligation in recorded order (step 1), then I3 (step 2,
-- Effects.Malformed); steps 0 and 1 read only the problem, so they
-- precede I3 whatever the package. `judgeObligations` is step 5: each
-- obligation in recorded order, judged completely by its kind's one
-- check on the settled completed package before the next, so an earlier
-- obligation's edge failure is never masked by a later one's condition
-- (spec §5, case C2(c)). Its first failure is classified by
-- Effects.Dependency with that obligation's provenance and check index.
-- G0, completion, the witness and coverage are composed by
-- Strategy.Substitution's `validate`, the only module that mints `Valid`.
module Features.Check.Strategy.Effects.Validate
  ( judgeObligations
  , prerequisites
  ) where

import Prelude
import Data.Array (findMap)
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse_)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (Obligation(..), Placed, UnsupportedKind)
import Domain.Verdict.EffectPackage (Completed, EffectPackage)
import Domain.Verdict.Search (CheckRefusal(..), Limitation(..))
import Features.Check.Strategy.Effects.Complete (settledOf)
import Features.Check.Strategy.Effects.Consume (consumeCheck)
import Features.Check.Strategy.Effects.Dependency (classify, dependencySet)
import Features.Check.Strategy.Effects.Equal (equalCheck)
import Features.Check.Strategy.Effects.Judged (Context, Judged)
import Features.Check.Strategy.Effects.Malformed (malformed)
import Features.Check.Strategy.Effects.Record (recordDefect)
import Features.Check.Strategy.Effects.Sites
  ( deferCheck
  , entryCheck
  , failConcreteCheck
  , handlerLitCheck
  , installCheck
  )

-- Each step runs only when the earlier ones hold (Either's bind).
prerequisites
  ∷ RecordedProblem → EffectPackage → Either CheckRefusal Unit
prerequisites problem package = do
  refuseWith RecordDefect (recordDefect problem)
  refuseWith identity
    (findMap unsupportedIn (fields problem).effects.obligations)
  refuseWith Malformed (malformed problem package)

-- The context is P_c = settle (complete P_in) (spec §4, "The
-- obligations' package: P_c only") and the declared rigid marks.
judgeObligations ∷ RecordedProblem → Completed → Either CheckRefusal Unit
judgeObligations problem completed =
  traverse_ (judgeOne problem context) view.effects.obligations
  where
  view = fields problem
  context =
    { package: settledOf completed, rigidMarks: view.effects.rigidMarks }

refuseWith
  ∷ ∀ a. (a → CheckRefusal) → Maybe a → Either CheckRefusal Unit
refuseWith refusal = maybe (Right unit) (Left <<< refusal)

unsupportedIn ∷ Placed Obligation → Maybe CheckRefusal
unsupportedIn placed = case placed.value of
  Unsupported kind → Just (unsupportedAt placed kind)
  _ → Nothing

unsupportedAt ∷ Placed Obligation → UnsupportedKind → CheckRefusal
unsupportedAt placed kind = NotCertifiable (UnsupportedRecorded kind)
  { provenance: placed.provenance, check: 0 }

-- One check function per kind (spec §9). `Unsupported` is refused by
-- `prerequisites` first; judged alone it gets the same refusal. Dep is
-- computed only for a failure.
judgeOne
  ∷ RecordedProblem → Context → Placed Obligation → Either CheckRefusal Unit
judgeOne problem context placed = case placed.value of
  Equal lhs rhs → classified (equalCheck context lhs rhs)
  Consume site → classified (consumeCheck context site)
  HandlerLit lit → classified (handlerLitCheck context lit)
  Install site → classified (installCheck context site)
  Defer site → classified (deferCheck context site)
  Entry row → classified (entryCheck context row)
  FailConcrete payload → classified (failConcreteCheck context payload)
  Unsupported kind → Left (unsupportedAt placed kind)
  where
  classified ∷ Judged → Either CheckRefusal Unit
  classified = either (Left <<< classify (dependencySet problem) placed) Right
