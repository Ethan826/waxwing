{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE DataKinds, TypeApplications #-}
import GHC.Records (getField)
data Person = Person { name :: String, age :: Int }
data Account = Account { name :: String, active :: Bool }
ada = Person "Ada" 36
grace = Account "Grace" True
greet prefix =
  let getName p = prefix ++ getField @"name" p
  in getName ada ++ " " ++ getName grace
main = putStrLn (greet "Hi, ")
