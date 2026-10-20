module P5 where

import Prim.Row (class Union, class Lacks, class Nub)

data R (r :: Row Type) = R

join :: forall r s t. Union r s t => Nub t t => R r -> R s -> R t
join _ _ = R

composeRequirements
  :: forall a b
   . (R a -> R b -> R (x :: Int, y :: Int))
  -> (R a -> R b -> Int)
  -> Int
composeRequirements _ _ = 0

restricted :: forall u v. Lacks "y" u => Lacks "x" v => R u -> R v -> Int
restricted _ _ = 0

main :: Int
main = composeRequirements join restricted
