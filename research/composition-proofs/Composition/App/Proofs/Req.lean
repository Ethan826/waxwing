/-
Scope A, S6 and S8 (Composition.App.Statements). Proofs only; the
statements are the interface's.

S6 is proved (`s6`). Its argument: `ReqHa` is closed under every `Reach`
step, given `TableBases` and `kind (dataB t) = .data t`; `ReqHa` allows no
arrow and no fresh base; `JHolds` implies `ReqHa`. `TableWF` is not used.

S8 as first stated, `S8NoBases`, is false (`not_s8NoBases`): without
`TableBases`, a constructor field `.base b` whose base is classified
`kind b = .data u` for a holder `u` is no `HoldsFn` field, yet
`Reach.base` passes through it into `u`'s arrow. S8 now carries
`TableBases`.
-/
import Composition.App.Statements

namespace Composition.App

open Classical Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

section Closure

variable (T : Table Label B) (kind : B → BaseKind) (dataB : Nat → B)

omit [DecidableEq Label] in
/-- `JHolds` implies H-a. -/
theorem jholds_reqHa {v : GA Label B} (h : JHolds T kind v) :
    ReqHa T kind v := by
  induction h with
  | prim hb => exact .prim hb
  | data hb _ hn => exact .data hb hn
  | record _ ih => exact .record ih
  | app _ hn _ ih => exact .app hn ih

omit [DecidableEq Label] in
/-- `JHolds` implies H-c. -/
theorem jholds_reqHc {v : GA Label B} (h : JHolds T kind v) :
    ReqHc kind v := by
  induction h with
  | prim hb => exact .prim hb
  | data hb _ _ => exact .data hb
  | record _ ih => exact .record ih
  | app _ _ _ ih => exact .app ih

variable {T kind dataB}

mutual
  /-- A field type holding no function, naming only printable bases,
  instantiated at H-a arguments, is H-a. -/
  theorem instFT_reqHa (hd : ∀ t, kind (dataB t) = .data t)
      {vs : List (GA Label B)} (hvs : ∀ v ∈ vs, ReqHa T kind v) :
      ∀ f : FT Label B, ¬ HoldsFn T f → FTBases kind f →
        ReqHa T kind (instFT dataB vs f)
    | .base b, _, hb => by
      rw [instFT]; exact .prim hb
    | .param i, _, _ => by
      rw [instFT]
      cases h : vs[i]? with
      | none => exact .record fun _ _ hk => by simp at hk
      | some v => exact hvs v (List.mem_of_getElem? h)
    | .arrow _ _, hn, _ => absurd .arrow hn
    | .record fs, hn, hb => by
      rw [instFT]
      exact .record (instFields_reqHa hd hvs fs (fun h => hn (.record h)) hb)
    | .data u .nil, hn, _ => by
      rw [instFT]; exact .data (hd u) (fun h => hn (.head h))
    | .data u (.cons a as), hn, hb => by
      rw [instFT]
      have := instArgs_reqHa hd hvs (.cons a as) (fun h => hn (.arg h)) hb
      rw [instArgs] at this
      exact .app (fun h => hn (.head h)) this
    | .handler, hn, _ => absurd .handler hn

  theorem instFields_reqHa (hd : ∀ t, kind (dataB t) = .data t)
      {vs : List (GA Label B)} (hvs : ∀ v ∈ vs, ReqHa T kind v) :
      ∀ fs : FTFields Label B, ¬ HoldsFnF T fs → FTBasesF kind fs →
        ∀ k g, instFields dataB vs fs k = some g → ReqHa T kind g
    | .nil, _, _, k, g, h => by rw [instFields] at h; simp at h
    | .cons l f rest, hn, hb, k, g, h => by
      rw [instFields] at h
      dsimp only at h
      split at h
      · cases h
        exact instFT_reqHa hd hvs f (fun h' => hn (.here h')) hb.1
      · exact instFields_reqHa hd hvs rest (fun h' => hn (.there h'))
          hb.2 k g h

  theorem instArgs_reqHa (hd : ∀ t, kind (dataB t) = .data t)
      {vs : List (GA Label B)} (hvs : ∀ v ∈ vs, ReqHa T kind v) :
      ∀ as : FTArgs Label B, ¬ HoldsFnA T as → FTBasesA kind as →
        ∀ v ∈ instArgs dataB vs as, ReqHa T kind v
    | .nil, _, _, v, hv => by rw [instArgs] at hv; simp at hv
    | .cons f rest, hn, hb, v, hv => by
      rw [instArgs] at hv
      rcases List.mem_cons.mp hv with rfl | hv
      · exact instFT_reqHa hd hvs f (fun h' => hn (.here h')) hb.1
      · exact instArgs_reqHa hd hvs rest (fun h' => hn (.there h')) hb.2 v hv
end

/-- H-a is closed under `Reach`, for a table naming only printable
bases. -/
theorem reach_reqHa (hB : TableBases T kind)
    (hd : ∀ t, kind (dataB t) = .data t) {v w : GA Label B}
    (hr : Reach T kind dataB v w) (hv : ReqHa T kind v) :
    ReqHa T kind w := by
  induction hr with
  | refl => exact hv
  | field hk _ ih =>
    cases hv with
    | record hf => exact ih (hf _ _ hk)
  | ctor hT hc hfl _ ih =>
    cases hv with
    | app hn hvs =>
      exact ih (instFT_reqHa hd hvs _
        (fun h => hn (.mk hT hc hfl h)) (hB _ _ hT _ hc _ hfl))
  | base hb hT hc hfl _ ih =>
    cases hv with
    | prim hp => rw [hb] at hp; cases hp
    | data hb' hn =>
      rw [hb] at hb'
      cases hb'
      exact ih (instFT_reqHa hd (by simp) _
        (fun h => hn (.mk hT hc hfl h)) (hB _ _ hT _ hc _ hfl))

omit [DecidableEq Label] in
/-- H-a allows no arrow and no fresh base. -/
theorem reqHa_safe {w : GA Label B} (h : ReqHa T kind w) :
    (∀ a c, w ≠ .arrow a c) ∧ ∀ b, w = .base b → kind b ≠ .fresh := by
  constructor
  · intro a c he; subst he; cases h
  · intro b he; subst he
    cases h with
    | prim hb => rw [hb]; exact nofun
    | data hb _ => rw [hb]; exact nofun

end Closure

/-- S6. `TableWF` is not used. -/
theorem s6 {Label B : Type} [DecidableEq Label] :
    S6 (Label := Label) (B := B) := by
  intro T kind dataB _ hB hd v hv
  have ha := jholds_reqHa T kind hv
  exact ⟨ha, fun w hr => reqHa_safe (reach_reqHa hB hd hr ha),
    jholds_reqHc T kind hv⟩

/-! ## S8 is false as stated

Over `B = Nat` with every base classified as a declared type
(`kind n = .data n`, `dataB = id`): type 0 has one constructor with one
field `.base 1`; type 1 has one constructor with one field
`.arrow (.base 2) (.base 2)`. The table is closed. Type 0 is no holder
(its only field is a base), `app 0 []` has no arguments, and yet
`app 0 []` reaches `.base 1` by `Reach.ctor`, then the arrow by
`Reach.base` (`kind 1 = .data 1`). `TableBases` (S6's hypothesis) is
exactly what excludes this: it makes every field base prim. -/

/-- The counterexample table. -/
def cxT : Table Unit Nat
  | 0 => some ⟨0, [[.base 1]]⟩
  | 1 => some ⟨0, [[.arrow (.base 2) (.base 2)]]⟩
  | _ => none

def cxKind : Nat → BaseKind := fun n => .data n

theorem cxT_wf : TableWF cxT := by
  intro t d h c hc f hf
  match t, h with
  | 0, h =>
    simp [cxT] at h; subst h
    simp at hc; subst hc; simp at hf; subst hf; simp [FTWF]
  | 1, h =>
    simp [cxT] at h; subst h
    simp at hc; subst hc; simp at hf; subst hf; simp [FTWF]
  | _ + 2, h => simp [cxT] at h

theorem cx_not_holder0 : ¬ Holder cxT 0 := by
  rintro ⟨hT, hc, hf, hfn⟩
  simp [cxT] at hT; subst hT
  simp at hc; subst hc; simp at hf; subst hf
  cases hfn

theorem cx_reach :
    Reach cxT cxKind id (.app 0 [])
      (.arrow (.base 2) (.base 2) : GA Unit Nat) := by
  refine Reach.ctor (d := ⟨0, [[.base 1]]⟩) (c := [.base 1])
    (fl := .base 1) rfl (by simp) (by simp) ?_
  rw [instFT]
  refine Reach.base (t := 1) (d := ⟨0, [[.arrow (.base 2) (.base 2)]]⟩)
    (c := [.arrow (.base 2) (.base 2)]) (fl := .arrow (.base 2) (.base 2))
    rfl rfl (by simp) (by simp) ?_
  simp only [instFT]
  exact .refl

/-- S8 as stated is false. -/
theorem not_s8NoBases : ¬ S8NoBases (Label := Unit) (B := Nat) := by
  intro h
  exact h cxT cxKind id cxT_wf (fun _ => rfl) 0 [] rfl cx_not_holder0
    (by simp) _ cx_reach _ _ rfl

/-! ## Non-vacuity of S6: `L(a) = N | C(a, L(a))` at `Int`

`B = Nat`: base 0 is `Int` (prim), base `t + 1` stands for declared
type `t` of no parameters. Type 0 is `L`. -/

def exKind : Nat → BaseKind
  | 0 => .prim
  | n + 1 => .data n

def exDataB : Nat → Nat := (· + 1)

def lDecl : DeclT Unit Nat :=
  ⟨1, [[], [.param 0, .data 0 (.cons (.param 0) .nil)]]⟩

def exT : Table Unit Nat
  | 0 => some lDecl
  | _ => none

theorem exT_wf : TableWF exT := by
  intro t d h c hc f hf
  match t, h with
  | 0, h =>
    simp [exT] at h; subst h
    simp [lDecl] at hc
    rcases hc with rfl | rfl
    · simp at hf
    · simp at hf
      rcases hf with rfl | rfl
      · simp [FTWF, lDecl]
      · simp [FTWF, FTWFA, FTArgs.length, exT, lDecl]
  | _ + 1, h => simp [exT] at h

theorem exT_bases : TableBases exT exKind := by
  intro t d h c hc f hf
  match t, h with
  | 0, h =>
    simp [exT] at h; subst h
    simp [lDecl] at hc
    rcases hc with rfl | rfl
    · simp at hf
    · simp at hf
      rcases hf with rfl | rfl <;> simp [FTBases, FTBasesA]
  | _ + 1, h => simp [exT] at h

mutual
  /-- No type of `exT` is a holder. -/
  theorem exT_noHolder : ∀ {t : Nat}, Holder exT t → False
    | _, .mk hT hc hf hfn => by
      rename_i t d c f
      match t, hT with
      | 0, hT =>
        simp [exT] at hT; subst hT
        simp [lDecl] at hc
        rcases hc with rfl | rfl
        · simp at hf
        · simp at hf
          have := exT_holdsFn hfn
          rcases hf with rfl | rfl
          · exact this.1 rfl
          · exact this.2 rfl
      | _ + 1, hT => simp [exT] at hT

  theorem exT_holdsFn : ∀ {f : FT Unit Nat}, HoldsFn exT f →
      f ≠ .param 0 ∧ f ≠ .data 0 (.cons (.param 0) .nil)
    | _, .arrow => ⟨nofun, nofun⟩
    | _, .handler => ⟨nofun, nofun⟩
    | _, .head h => (exT_noHolder h).elim
    | _, .arg h => by
      have := exT_holdsFnA h
      refine ⟨nofun, ?_⟩
      intro he; cases he; exact this.2 rfl
    | _, .record _ => ⟨nofun, nofun⟩

  theorem exT_holdsFnA : ∀ {as : FTArgs Unit Nat}, HoldsFnA exT as →
      as ≠ .nil ∧ as ≠ .cons (.param 0) .nil
    | _, .here h => by
      have := exT_holdsFn h
      refine ⟨nofun, ?_⟩
      intro he; cases he; exact this.1 rfl
    | _, .there h => by
      have := exT_holdsFnA h
      refine ⟨nofun, ?_⟩
      intro he; cases he; exact this.1 rfl
end

/-- `L Int` holds under GroundRule. -/
theorem ex_jholds :
    JHolds exT exKind (.app 0 [.base 0] : GA Unit Nat) :=
  .app rfl exT_noHolder (by simp; exact .prim rfl)

/-- All three readings at `L Int`, through S6 with its hypotheses
discharged on this table. -/
theorem ex_readings :
    ReqHa exT exKind (.app 0 [.base 0] : GA Unit Nat) ∧
    ReqHb exT exKind exDataB (.app 0 [.base 0] : GA Unit Nat) ∧
    ReqHc exKind (.app 0 [.base 0] : GA Unit Nat) :=
  s6 exT exKind exDataB exT_wf exT_bases (fun _ => rfl) _ ex_jholds

/-- `L Int` really reaches something through its constructors: the
recursive field `L(a)` instantiated at `Int`, which is `L Int` again,
and the `Int` field. (H-b's quantifier is not vacuous here.) -/
example : Reach exT exKind exDataB (.app 0 [.base 0] : GA Unit Nat)
    (.base 0) := by
  refine Reach.ctor (d := lDecl)
    (c := [.param 0, .data 0 (.cons (.param 0) .nil)]) (fl := .param 0)
    rfl (by simp [lDecl]) (by simp) ?_
  simp only [instFT]
  exact .refl

/-! ## Negative control: `Box(a) = Box(a -> a)` at `Int` -/

def boxT : Table Unit Nat
  | 1 => some ⟨1, [[.arrow (.param 0) (.param 0)]]⟩
  | _ => none

theorem box_holder : Holder boxT 1 :=
  (Holder.mk (d := ⟨1, [[.arrow (.param 0) (.param 0)]]⟩)
    (c := [.arrow (.param 0) (.param 0)])
    (f := .arrow (.param 0) (.param 0)) rfl (by simp) (by simp)
    .arrow)

/-- GroundRule rejects `Box Int`. -/
theorem box_not_jholds :
    ¬ JHolds boxT exKind (.app 1 [.base 0] : GA Unit Nat) := by
  intro h
  cases h with
  | app _ hn _ => exact hn box_holder

end Composition.App

