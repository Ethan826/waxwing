module P4 where

import Prim.Row (class Union, class Lacks, class Nub)

data P (r :: Row Type) = P

acceptsParts
  :: forall r s t. Union r s t => Nub t t => Lacks "admin" s => P t -> Boolean
acceptsParts _ = true

main :: Boolean
main = acceptsParts (P :: P (admin :: Boolean))
