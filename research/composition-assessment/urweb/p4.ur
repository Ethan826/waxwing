fun acceptsParts [r ::: {Type}] [s ::: {Type}] [r ~ s] [[Admin] ~ s]
    (p : $(r ++ s)) : bool = True

val p4 : bool = acceptsParts {Admin = False}
