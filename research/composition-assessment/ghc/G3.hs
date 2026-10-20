{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE DataKinds, TypeApplications #-}
import GHC.Records (getField)
data Person = Person { name :: String, age :: Int }
data Account = Account { name :: String, active :: Bool }
ada = Person "Ada" 36
grace = Account "Grace" True
main = do
  let getName p = getField @"name" p
      describe p = getName p ++ "!"
  putStrLn (describe ada ++ " " ++ describe grace)
