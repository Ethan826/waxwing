/- Bounded checks of CP's set equality and C4, not proofs of either. -/
import Composition.Sig.SlicePatterns
import Composition.Sig.CheckData

namespace Composition.Syntax

#guard CheckData.exported.length == 58

#guard CheckData.exported.all fun (_, P, T) =>
  checkAllCons P T == checkAll P T

#guard CheckData.exported.all fun (_, P, _) =>
  let kept := (patterns P).filter (consistentS P)
  let proposed := consistentPatterns P
  proposed.all (fun p => kept.any (samePattern p)) &&
    kept.all (fun q => proposed.any (samePattern q))

end Composition.Syntax
