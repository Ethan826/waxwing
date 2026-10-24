-- trusted surface: every diff needs token review; see docs/engineering.md
-- The unifier's substitution in triangular form (BACKLOG R021): Baader
-- and Snyder's dag solved form ("Unification Theory", Handbook of
-- Automated Reasoning, 2001), bindings x1 ↦ t1, …, xn ↦ tn with no xi
-- in any tj, j ≥ i, whose back-substitution is the solved form (an
-- idempotent θ). Features.Check.Entailed.Mgu binds without applying
-- the binding to every equation and image, which was quadratic, and
-- reads a type through `read` when it takes it.
--
-- `read` replaces every image it resolves by its resolved form, path
-- compression as in union-find (Tarjan 1975): a resolved image
-- mentions only unbound variables, so the order still holds and a
-- chain of bindings is followed once.
module Features.Check.Entailed.Triangular
  ( Reading
  , Triangular
  , empty
  , extend
  , read
  , solved
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concatMap, foldl)
import Data.Array as Array
import Data.Foldable (foldM)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (RTExpr, Var)
import Features.Check.Entailed.Merge (substitute)
import Features.Check.Mentions (mentioned)

-- A binding and its place: its image mentions bound variables of later
-- places only.
type Bound = { place ∷ Int, image ∷ RTExpr }

-- `next`: the next binding's place. It counts every binding made, so a
-- variable bound again (a variable both a type and a tail, which
-- `fragment` does not rule out) takes a later place than any before it
-- (review I-1: `Map.size` repeated a place, and θ lost idempotence).
newtype Triangular = Triangular { bound ∷ Map Var Bound, next ∷ Int }

-- `resolved`: the solved form's image of every bound variable the read
-- types reach, so `substitute resolved` applies the whole θ to them.
type Reading = { resolved ∷ Map Var RTExpr, theta ∷ Triangular }

empty ∷ Triangular
empty = Triangular { bound: Map.empty, next: 0 }

-- The caller's obligation (Mgu's `binding`): `image` is read through
-- θ and does not mention `variable`, so the binding takes the last
-- place, replacing any earlier binding of `variable` as the eager
-- algorithm's `Map.insert` did.
extend ∷ Var → RTExpr → Triangular → Triangular
extend variable image (Triangular theta) = Triangular
  { bound: Map.insert variable { place: theta.next, image } theta.bound
  , next: theta.next + 1
  }

read ∷ Triangular → Array RTExpr → Maybe Reading
read (Triangular theta) types = map reading
  (resolved theta.bound (concatMap mentioned types))
  where
  reading found = { resolved: found, theta: compressed found theta }

-- The back-substitution: every bound variable's solved-form image.
solved ∷ Triangular → Maybe (Map Var RTExpr)
solved (Triangular theta) =
  resolved theta.bound (Array.fromFoldable (Map.keys theta.bound))

-- The solved-form image of every bound variable reachable from `roots`,
-- latest place first, so each image's bound variables are already
-- resolved and one `substitute` is complete (its images are idempotent).
-- A repeated label makes an image undefined: `Nothing`.
resolved ∷ Map Var Bound → Array Var → Maybe (Map Var RTExpr)
resolved theta roots = foldM resolve Map.empty latestFirst
  where
  latestFirst = Array.sortWith later
    (Map.toUnfoldable (reachable theta roots))
  later (Tuple _ entry) = negate entry.place
  resolve done (Tuple variable entry) =
    map (inserted variable done) (substitute done entry.image)
  inserted variable done image = Map.insert variable image done

-- The bound variables reachable through images, one layer at a time.
reachable ∷ Map Var Bound → Array Var → Map Var Bound
reachable theta roots = tailRec layer { frontier: roots, seen: Map.empty }
  where
  layer { frontier, seen }
    | Array.null frontier = Done seen
    | otherwise =
        Loop
          { frontier: concatMap imageVariables (Array.fromFoldable found)
          , seen: Map.union found seen
          }
        where
        found = foldl (visit seen) Map.empty frontier
  imageVariables entry = mentioned entry.image
  visit seen found variable
    | Map.member variable seen || Map.member variable found = found
    | otherwise = maybe found (inserted found variable)
        (Map.lookup variable theta)
  inserted found variable entry = Map.insert variable entry found

compressed
  ∷ Map Var RTExpr → { bound ∷ Map Var Bound, next ∷ Int } → Triangular
compressed found theta = Triangular theta
  { bound = Map.union (Map.intersectionWith imaged found theta.bound)
      theta.bound
  }
  where
  imaged image entry = entry { image = image }
