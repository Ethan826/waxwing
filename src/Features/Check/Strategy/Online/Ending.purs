-- How a refusal by today's solver ends the online search (T-R0a §4.2,
-- §3.5; Task 4.3), with ruling R3's routing of `InternalKind`, which
-- Task 2.1 stated in Domain.Problem and which this module enforces: each
-- kind is named, none by a wildcard (§18.71 forbids a blanket catch).
-- - Confined to one body's checking (`LaterWork`, `RuleBroken`,
--   `BoundPassed`, `BodyState`, `Unrendered`): the untrusted search's
--   own broken invariant, `Broke`, which `decide` records as
--   `SearchBroke` and the run goes on (G-Q13, dossier §18.71 item 2).
-- - Stopping (`TableLookup`, `InputShape`, `PassInvariant`): doubt about
--   input an earlier phase built, or a pass outside the body, which the
--   search reports as `Inconsistent`, so the run stops with
--   `BrokenInvariant` (ruling R10 (iii)).
-- A type too deep is the inferred-type bound (`inferredTypeLimit`,
-- carried in the problem). Every other refusal is the solver finding
-- nothing: `Exhausted`, an inability to solve that says nothing of the
-- program, so the wildcard below makes no semantic claim.
module Features.Check.Strategy.Online.Ending
  ( Ending(..)
  , Route(..)
  , ending
  , route
  ) where

import Prelude
import Domain.Problem (InternalKind(..), Problem(..))
import Domain.Verdict (LimitReached(..), SearchEnd(..))

data Route = Confined | Stops

data Ending = Ended SearchEnd | Stopped String

route ∷ InternalKind → Route
route = case _ of
  LaterWork → Confined
  RuleBroken → Confined
  BoundPassed → Confined
  BodyState → Confined
  Unrendered → Confined
  TableLookup → Stops
  InputShape → Stops
  PassInvariant → Stops

ending ∷ Problem → Ending
ending = case _ of
  TypeTooDeep depth → Ended (OutOfBudget (InferredTypeDepth depth))
  Internal kind text → internal (route kind) text
  Hinted inner _ → ending inner
  _ → Ended Exhausted

internal ∷ Route → String → Ending
internal routed text = case routed of
  Confined → Ended (Broke text)
  Stops → Stopped text

derive instance eqRoute ∷ Eq Route
