module P6 where

import Prim.Row (class Union, class Nub)

data R (r :: Row Type) = R

join :: forall r s t. Union r s t => Nub t t => R r -> R s -> R t
join _ _ = R

forwarded :: forall r s t. Union r s t => Nub t t => R r -> R s -> R t
forwarded a b = join a b
