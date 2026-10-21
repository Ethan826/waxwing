{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE DataKinds, TypeApplications #-}
import GHC.Records (getField)
data Person = Person { name :: String, age :: Int }
data Account = Account { name :: String, active :: Bool }
ada = Person "Ada" 36
grace = Account "Grace" True
main = do
  let greeting = "Hi, "
      getName p = greeting ++ getField @"name" p
  putStrLn (getName ada ++ " " ++ getName grace)
