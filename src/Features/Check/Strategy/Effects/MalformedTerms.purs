-- trusted surface: every diff needs token review; see docs/engineering.md
-- What I3 reads of a package's images (A2 spec §5 item 3): `keyedParts`
-- lists every key with the parts of its image, maps in the order
-- effects, marks, types, rows and keys in `Ord` order, the order every I3
-- check scans. A part is a type or record-row variable with its
-- position's sort, an effect-row tail, a label (nested ones included), a
-- mark term (a label's or a mark key's own) or a `DataBase` base. The
-- term checks: (f) a mark outside `rigidMarks`, (g) a `Console` or `Fail`
-- label whose term is not N on normal forms (`TermJ ∅` is N, Effects.Term
-- `norm`), (j) a `Fail` label keyless after settling (§4.2). Each part
-- list also holds the image's applications, in pre-order, for (k)
-- (Effects.Arity): a clause row C's labels are read bare, both a handler
-- type's `clauses` and the image of a C variable (a literal's or an
-- annotation's `clauses`, or a ResultC).
module Features.Check.Strategy.Effects.MalformedTerms
  ( Parts
  , holesOf
  , keyedParts
  , keylessFail
  , notN
  , twoSortHoles
  , unknownMark
  ) where

import Prelude
import Data.Array (any, concatMap, find, length, mapMaybe)
import Data.Foldable (foldMap)
import Data.Map as Map
import Data.Maybe (Maybe(..), isNothing, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), snd)
import Domain.Recorded.Atom (Base(..), Var, VarSort(..))
import Domain.Recorded.Effect (ERole(..), EVar(..))
import Domain.Recorded.Hole (holeIndex)
import Domain.Row (EffectRef(..))
import Domain.Type (TypeId)
import Domain.Verdict.EffectPackage
  ( EffectPackage
  , PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  )
import Domain.Verdict.Search (PackageKey(..))
import Features.Check.Strategy.Effects.Arity
  ( Application
  , dataApplication
  , labelApplication
  )
import Features.Check.Strategy.Effects.Package (key, settleTy)
import Features.Check.Strategy.Effects.Term (norm)

type Parts =
  { vars ∷ Array (Tuple VarSort Var)
  , tails ∷ Array PTail
  , labels ∷ Array PLabel
  , terms ∷ Array Term
  , dataBases ∷ Array TypeId
  , applications ∷ Array Application
  }

keyedParts ∷ EffectPackage → Array (Tuple PackageKey Parts)
keyedParts package =
  map effectKeyed (Map.toUnfoldable package.effects)
    <> map (keyed KeyMark termParts) (Map.toUnfoldable package.marks)
    <> map (keyed KeyType tyParts) (Map.toUnfoldable package.types)
    <> map (keyed KeyRow recordParts) (Map.toUnfoldable package.rows)

-- (f): the first name, in the parts' order, outside `rigidMarks`.
unknownMark ∷ Set String → Parts → Maybe String
unknownMark known parts =
  find (not <<< flip Set.member known) (concatMap names parts.terms)
  where
  names = case _ of
    TermJ marks → Set.toUnfoldable marks
    TermN → []
    TermM → []

-- (g): `Console` and `Fail` are always N.
notN ∷ Parts → Boolean
notN parts = any wrong parts.labels
  where
  wrong label = alwaysN label.effect && norm label.mark /= TermN

-- (j): decided on the settled payload, a local computation (§4.2).
keylessFail ∷ Parts → Boolean
keylessFail parts = any keyless parts.labels
  where
  keyless label = label.effect == FailEffect
    && isNothing (key (label { args = map settleTy label.args }))

-- (h): the hole numbers the parts use at two sorts or more, across the
-- three sorts (type, record row, effect row).
twoSortHoles ∷ Array Parts → Set Int
twoSortHoles found = Set.unions
  [ Set.intersection types rows
  , Set.intersection types effects
  , Set.intersection rows effects
  ]
  where
  types = atSort SortType
  rows = atSort SortRow
  atSort sort = Set.fromFoldable
    ( mapMaybe (holeAt sort)
        (concatMap _.vars found)
    )
  holeAt sort (Tuple at variable)
    | at == sort = holeIndex variable
    | otherwise = Nothing
  effects = Set.fromFoldable (concatMap (tailHoles <<< _.tails) found)

-- Every hole number the parts use, type and row holes before effect
-- holes.
holesOf ∷ Parts → Array Int
holesOf parts =
  mapMaybe (holeIndex <<< snd) parts.vars <> tailHoles parts.tails

tailHoles ∷ Array PTail → Array Int
tailHoles = mapMaybe hole
  where
  hole = case _ of
    PTailHole index → Just index
    PTailRigid _ → Nothing

effectKeyed ∷ Tuple EVar PRow → Tuple PackageKey Parts
effectKeyed (Tuple found image)
  | clauseVariable found = Tuple (KeyEffect found) (clauseRowParts image)
  | otherwise = Tuple (KeyEffect found) (rowParts image)

-- A C row's variable: a literal's, an annotation's or a ResultC's.
clauseVariable ∷ EVar → Boolean
clauseVariable = case _ of
  EffFresh _ HandlerClauses → true
  EffFresh _ (AnnotationClauses _ _) → true
  EffFresh _ ResultClauses → true
  _ → false

keyed
  ∷ ∀ k a. (k → PackageKey) → (a → Parts) → Tuple k a → Tuple PackageKey Parts
keyed made parts (Tuple found image) = Tuple (made found) (parts image)

termParts ∷ Term → Parts
termParts term = none { terms = [ term ] }

alwaysN ∷ EffectRef → Boolean
alwaysN = case _ of
  ConsoleEffect → true
  FailEffect → true
  UserEffect _ → false

none ∷ Parts
none =
  { vars: []
  , tails: []
  , labels: []
  , terms: []
  , dataBases: []
  , applications: []
  }

tyParts ∷ PTy → Parts
tyParts = case _ of
  PBase (DataBase owner) → none
    { dataBases = [ owner ]
    , applications = [ dataApplication false owner 0 0 ]
    }
  PBase _ → none
  PVar variable → none { vars = [ Tuple SortType variable ] }
  PArrow parameter row result →
    tyParts parameter <> rowParts row <> tyParts result
  PRecord row → recordParts row
  PData owner arguments rows → dataParts false owner arguments rows
  PHandler label rows → labelParts label <> rowParts rows.inference
    <> foldMap clauseRowParts rows.clauses

recordParts ∷ PRecordRow → Parts
recordParts row = foldMap (tyParts <<< snd) row.fields
  <> none { vars = map (Tuple SortRow) row.tails }

dataParts ∷ Boolean → TypeId → Array PTy → Array PRow → Parts
dataParts bare owner arguments rows =
  none
    { applications =
        [ dataApplication bare owner (length arguments) (length rows) ]
    }
    <> foldMap tyParts arguments
    <> foldMap rowParts rows

rowParts ∷ PRow → Parts
rowParts row = rowWith false row

-- A clause row C: its labels bare (Effects.Arity).
clauseRowParts ∷ PRow → Parts
clauseRowParts row = rowWith true row

rowWith ∷ Boolean → PRow → Parts
rowWith inClause row = foldMap (labelWith inClause) row.labels
  <> maybe none tailed row.tail
  where
  tailed found = none { tails = [ found ] }

labelParts ∷ PLabel → Parts
labelParts label = labelWith false label

-- In C, a `Fail` label's data payload may be its head only.
labelWith ∷ Boolean → PLabel → Parts
labelWith inClause label =
  none
    { labels = [ label ]
    , terms = [ label.mark ]
    , applications =
        [ labelApplication inClause label.effect (length label.args) ]
    }
    <> foldMap argument label.args
  where
  argument
    | inClause && label.effect == FailEffect = payloadParts
    | otherwise = tyParts

payloadParts ∷ PTy → Parts
payloadParts = case _ of
  PData owner arguments rows → dataParts true owner arguments rows
  other → tyParts other
