-- trusted surface: every diff needs token review; see docs/engineering.md
-- The site checks (statements §4 E4, E5, E6, E8, E9; spec §9's
-- `HandlerLit`, `Install`, `Defer`, `Entry` and `FailConcrete` rows), on
-- the settled completed package P_c. Each judges only what its own record
-- carries: the consumptions recorded beside a literal (`ClauseIntoR`,
-- `ClauseIntoC`) and an installation (`InstallR`, `AtInstalledC`), and a
-- `defer`'s `AtDefer`, are separate obligations judged by Effects.Consume.
-- The check index j follows spec §9's last column. Every failure here is
-- ordinary: only Definition 4.2's exact counts are limitations (spec §5).
-- Rows and marks are read through Effects.Package's `under`/`underRow`.
-- An unreadable record is refused at check 0, never accepted unread: I3
-- runs first and binds every variable and position a record names (spec
-- §2.3, §5), so this is unreachable after I3.
module Features.Check.Strategy.Effects.Sites
  ( HandlerLitRecord
  , InstallRecord
  , deferCheck
  , entryCheck
  , failConcreteCheck
  , handlerLitCheck
  , installCheck
  ) where

import Prelude
import Data.Array (any, filter, index, length, mapWithIndex, take)
import Data.Either (Either(..))
import Data.Foldable (lookup)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, isJust, isNothing, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Effect (EVar, MRow, MTy(..), Position)
import Domain.Row (EffectRef(..), LabelKey)
import Domain.Verdict.EffectPackage
  ( PLabel
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  )
import Features.Check.Strategy.Effects.Handler (Checks, check, sequenced)
import Features.Check.Strategy.Effects.Judged (Context, Judged)
import Features.Check.Strategy.Effects.Package
  ( key
  , settleTy
  , under
  , underRow
  )
import Features.Check.Strategy.Effects.Rows (Grouped, grouped)
import Features.Check.Strategy.Effects.Term (holds)

-- The fields of Domain.Recorded.Effect's `HandlerLit` and `Install`.
type HandlerLitRecord =
  { m ∷ Position, inference ∷ EVar, clauses ∷ EVar, clauseRows ∷ Array EVar }

type InstallRecord = { frame ∷ Position, handler ∷ MTy, ambient ∷ MRow }

-- E4's own abort (Frames `aborting`): for each clause row c_k, k
-- ascending, one check, j = k: if c_k holds a `Fail` label or ends in a
-- rigid, `M ⊑ term(m)`; otherwise the check passes. `inference` and
-- `clauses` are read by the clause rows' consumptions, not here.
handlerLitCheck ∷ Context → HandlerLitRecord → Judged
handlerLitCheck context record = maybe unread judged
  ( Tuple <$> markAt context record.m
      <*> traverse (variableRow context) record.clauseRows
  )
  where
  judged (Tuple own rows) = run (sequenced (map (ownAbort own) rows))
  ownAbort own row = check (not (aborts row) || holds TermM own)

-- E5 for a recorded `MHandler` only: m, R and C from the recorded handler
-- type under P_c, C its owned C, else R itself (rule J). Any other
-- recorded handler records `UnframedInstall`, refused at step 1 before
-- I3 (spec §4), so it never reaches this check; it is refused at check 0.
installCheck ∷ Context → InstallRecord → Judged
installCheck context record = case record.handler of
  MHandler _ _ → maybe unread judged
    ( installed <$> markAt context record.frame
        <*> under context.package record.handler
        <*> underRow context.package record.ambient
    )
  _ → unread
  where
  installed frame handler ambient = { frame, handler, ambient }
  judged found = case found.handler of
    PHandler label rows → run
      (framed found.frame label.mark (clauseRow rows) found.ambient)
    _ → unread
  clauseRow rows = fromMaybe rows.inference rows.clauses

-- E6's own demands on d (DeferMayFail, DeferMayPerform, then Frames
-- `demanded`): j 0 no `Fail` label, j 1 no rigid tail, then each
-- non-`Fail` label's mark `⊑ N` in order. `enclosing` is not read here:
-- the `AtDefer` consumption judges it, and spec §5.1's dependency counts
-- its mentions.
deferCheck ∷ Context → { row ∷ EVar, enclosing ∷ MRow } → Judged
deferCheck context record = maybe unread judged
  (variableRow context record.row)
  where
  judged row = run
    ( check (not (any failing row.labels))
        >=> check (not (rigidTail row))
        >=> sequenced (map demanded (filter (not <<< failing) row.labels))
    )
  demanded label = check (holds label.mark TermN)

-- E8 (UnhandledEffect): each label `Console`, in order, then a closed
-- tail. `main`'s minted entry tail (§18.124) is read settled.
entryCheck ∷ Context → MRow → Judged
entryCheck context row = maybe unread judged (underRow context.package row)
  where
  judged found = run
    ( sequenced (map console found.labels)
        >=> check (isNothing found.tail)
    )
  console label = check (label.effect == ConsoleEffect)

-- E9 (FailNeedsConcrete), one check: the payload, read as a type after
-- settling, has a key (spec §4.2: `typeHead` defined), asked of `key` on
-- a `Fail` label carrying it. `certifyPackage`'s context is settled;
-- settling the read payload again, which is idempotent, keeps "after
-- settling" local to this check. A hole payload settles to `Int` and
-- passes. Observed on the fixture: this is a shadow-only expected
-- divergence from today's FailNeedsConcrete (C6; e.g. the audit fixture
-- fail-needs-concrete-check's `k`), reported by the differential and
-- decided as a replacement-compatibility question before the new checker
-- is enabled live. No guard is adopted.
failConcreteCheck ∷ Context → MTy → Judged
failConcreteCheck context ty = maybe unread judged
  (under context.package ty)
  where
  judged payload = run (check (isJust (key (carrying payload))))
  carrying payload =
    { effect: FailEffect, args: [ settleTy payload ], mark: TermN }

-- Private.

unread ∷ Judged
unread = Left { check: 0, limit: false }

run ∷ Checks → Judged
run checks = void (checks 0)

markAt ∷ Context → Position → Maybe Term
markAt context position = Map.lookup position context.package.marks

variableRow ∷ Context → EVar → Maybe PRow
variableRow context variable =
  underRow context.package { labels: [], tail: Just variable }

failing ∷ PLabel → Boolean
failing label = label.effect == FailEffect

rigidTail ∷ PRow → Boolean
rigidTail row = maybe false isRigid row.tail
  where
  isRigid = case _ of
    PTailRigid _ → true
    PTailHole _ → false

aborts ∷ PRow → Boolean
aborts row = any failing row.labels || rigidTail row

-- Frames `framed`, Console frames included (statements §4 E5, §18.86):
-- `term(m) ⊑ f`; each C label, in order, one check: its ρ partner by key
-- and rank (Lend `partners`) has a mark `⊑ f`; a C label with no partner
-- fails that check, since its edge cannot be read (`AtInstalledC` reports
-- the missing partner as its own condition too). A rigid C tail: ρ ends
-- in it, then `M ⊑ f`. A keyless label in C or ρ stops the run at the
-- first C label's index.
framed ∷ Term → Term → PRow → PRow → Checks
framed frame own clauses ambient =
  check (holds own frame)
    >=> maybe (check false) partnered
      (Tuple <$> traverse keyed clauses.labels <*> grouped ambient)
    >=> maybe pure rigid clauses.tail
  where
  keyed label = flip Tuple label <$> key label
  partnered (Tuple clauseKeys form) =
    sequenced (mapWithIndex (outer frame clauseKeys form) clauseKeys)
  rigid = case _ of
    PTailRigid variable →
      check (ambient.tail == Just (PTailRigid variable))
        >=> check (holds TermM frame)
    PTailHole _ → pure

outer
  ∷ Term
  → Array (Tuple LabelKey PLabel)
  → Grouped
  → Int
  → Tuple LabelKey PLabel
  → Checks
outer frame clauseKeys form position (Tuple labelKey _) =
  check (maybe false below partner)
  where
  rank = length (filter (eq labelKey <<< fst) (take position clauseKeys))
  partner = index (fromMaybe [] (lookup labelKey form.keyed)) rank
  below found = holds found.mark frame
