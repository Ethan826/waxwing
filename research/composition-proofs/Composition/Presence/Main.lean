/-
The presence results (dossier §18.11-18.12), instantiated: D2 from the
proved O1, O2 and O3. Each was proved in its own worktree against the
shared statements of Defs.lean and integrated here.
-/
import Composition.Presence.O1
import Composition.Presence.O2
import Composition.Presence.O3
import Composition.Presence.D2

namespace Composition.Presence

/-- D2 for presence: uniform term witnesses, per pattern. -/
theorem d2 {Label : Type} : D2 (Label := Label) := d2_of o1 o2 o3

end Composition.Presence
