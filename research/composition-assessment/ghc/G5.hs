{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE DataKinds, TypeApplications #-}
import GHC.Records (getField)
data Person = Person { name :: String, age :: Int }
data Account = Account { name :: String, active :: Bool }
ada = Person "Ada" 36
grace = Account "Grace" True
greet n =
  let k = show (n + 1 :: Int)
      getName p = k ++ getField @"name" p
  in getName ada ++ " " ++ getName grace
main = putStrLn (greet 1)
