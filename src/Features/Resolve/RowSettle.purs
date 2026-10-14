module Features.Resolve.RowSettle (settledPlaces) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec, tailRecM)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences (Occurrence)
import Features.Resolve.SortConflict (conflict)

-- A parameter by declaration and position; `true` is record sort.
type Place = Tuple Int Int

type Known = Map Place Boolean

-- A use of a parameter as another's argument: the caller's place, and the
-- use.
type Passed = { caller ∷ Place, use ∷ Occurrence }

-- The sort of each row parameter that its uses or its callers fix. `uses`
-- are each declaration's uses of its own parameters (Sorts.ownUses).
settledPlaces
  ∷ Array Syntax.TypeDecl
  → Array (Array Occurrence)
  → Either Syntax.Diagnostic Known
settledPlaces declarations uses = tailRecM (callerToCallee passed places)
  (tailRec (calleeToCaller sites) Map.empty)
  where
  sites = Array.concat (Array.mapWithIndex siteOf (Array.zip declarations uses))
  places = Array.concat (Array.mapWithIndex placesOf declarations)
  passed = Map.fromFoldableWith (flip append) (Array.mapMaybe viaOf sites)

type Site = { place ∷ Place, use ∷ Occurrence }

-- Every use of a parameter, with the parameter's place.
siteOf ∷ Int → Tuple Syntax.TypeDecl (Array Occurrence) → Array Site
siteOf index (Tuple declaration found) = Array.mapMaybe site found
  where
  site use = map (placed use) (positionOf declaration use)
  placed use position = { place: Tuple index position, use }

positionOf ∷ Syntax.TypeDecl → Occurrence → Maybe Int
positionOf declaration use = Array.findIndex called declaration.parameters
  where
  called parameter = parameter.name == use.name

placesOf ∷ Int → Syntax.TypeDecl → Array Place
placesOf index declaration = Array.mapMaybe place
  (Array.mapWithIndex Tuple declaration.parameters)
  where
  place (Tuple position parameter) =
    if parameter.sort == Syntax.RowSort then Just (Tuple index position)
    else Nothing

-- The sites that pass a parameter on, keyed by the callee's place.
viaOf ∷ Site → Maybe (Tuple Place (Array Passed))
viaOf site = map via site.use.applied
  where
  via applied = Tuple (Tuple applied.callee applied.position)
    [ { caller: site.place, use: site.use } ]

-- What a use shows of its parameter's sort: a direct use by its own place,
-- an argument by the settled sort of the parameter it is passed to.
useSort ∷ Known → Occurrence → Maybe Boolean
useSort known use = maybe' direct callee use.applied
  where
  direct _ = case use.sort of
    Syntax.RecordSort → Just true
    Syntax.RowSort → Just false
    Syntax.TypeSort → Nothing
  callee applied = Map.lookup (Tuple applied.callee applied.position) known

-- A parameter takes the sort of its first use that has one.
calleeToCaller ∷ Array Site → Known → Step Known Known
calleeToCaller sites known =
  if Map.size next == Map.size known then Done known else Loop next
  where
  next = Array.foldl take known (Array.sortWith offset sites)
  offset site = site.use.span.start.offset
  take found site =
    if Map.member site.place found then found
    else maybe' (const found) (insertAt found site.place)
      (useSort found site.use)

insertAt ∷ Known → Place → Boolean → Known
insertAt known place isRecord = Map.insert place isRecord known

-- A parameter still without a sort takes the one its callers pass it.
callerToCallee
  ∷ Map Place (Array Passed)
  → Array Place
  → Known
  → Either Syntax.Diagnostic (Step Known Known)
callerToCallee passed places known = next <$> traverse propose open
  where
  open = Array.filter (not <<< flip Map.member known) places
  propose place = maybe' (const (Right Nothing)) (agree place)
    (Array.uncons (callers place))
  callers place = Array.sortWith offset
    ( Array.mapMaybe known' (fromMaybe [] (Map.lookup place passed))
    )
  known' via = map (withSort via) (Map.lookup via.caller known)
  withSort via sort = { via, sort }
  offset found = found.via.use.span.start.offset
  next added =
    if Array.null fresh then Done known
    else Loop (Array.foldl fill known fresh)
    where
    fresh = Array.catMaybes added
  fill found (Tuple place isRecord) = insertAt found place isRecord

agree
  ∷ Place
  → { head ∷ Caller, tail ∷ Array Caller }
  → Either Syntax.Diagnostic (Maybe (Tuple Place Boolean))
agree place found = maybe' accepted (Left <<< clash found.head)
  (Array.find (differs found.head) found.tail)
  where
  accepted _ = Right (Just (Tuple place found.head.sort))
  differs first later = later.sort /= first.sort

type Caller = { via ∷ Passed, sort ∷ Boolean }

-- Callers that pass different sorts: the error is at the later argument,
-- noted at the earlier.
clash ∷ Caller → Caller → Syntax.Diagnostic
clash first later = conflict (shown later) (shown first)
  where
  shown found = found.via.use { sort = sortOf found.sort }
  sortOf isRecord =
    if isRecord then Syntax.RecordSort else Syntax.RowSort
