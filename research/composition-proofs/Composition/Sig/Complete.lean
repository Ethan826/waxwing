/-
K7c and K7 (dossier §16). The checker is complete for one atom (the
converse of `checkAtom_sound`). A semantic certificate has a syntactic
one, binding only `B`'s variables, that `checkCert` accepts at every
pattern with the same `patternOf` (K7a, K7b). Hence every problem
`Accepts` admits has a table `checkAll` accepts, and with K6,
`Accepts P ↔ ∃ T, checkAll P T = true`. The table is shown to exist; it
is not computed. The lookup step is explicit: whichever entry
`lookupCert` selects holds the same pairs, hence the same `patternOf`,
so its certificate is valid for the pattern being checked.
-/
import Composition.Sig.Represent

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- K7c. -/
theorem checkAtom_complete {P : SigProblem Label B} {p : List (Nat × Label)}
    {C : Cert Label B} :
    ∀ a : Atom (GL Label) (GB Label B),
      HoldsG P (genAssign P (patternOf p) (denCert C)) a →
        checkAtom P p C a = true
  | .eq t u, ⟨g, ht, hu, hw⟩ => by
    rw [evalT_den] at ht hu
    obtain ⟨a, ha, rfl⟩ := Option.map_eq_some_iff.mp ht
    obtain ⟨b, hb, hab⟩ := Option.map_eq_some_iff.mp hu
    simp only [checkAtom, ha, hb, Bool.and_eq_true]
    exact ⟨(eqS_iff a b).mpr hab.symm, (wfS_iff P a).mpr hw⟩
  | .lacks r l, h => by
    have h' : (genAssign P (patternOf p) (denCert C)).row r l = none := h
    rw [← denRow_rowS] at h'
    simp [checkAtom, denRow_none_iff.mp h']
  | .disjoint x y, ⟨h1, h2⟩ => by
    simp only [checkAtom, Bool.and_eq_true]
    refine ⟨disjointS_iff.mpr ?_, restsOkS_iff.mpr ?_⟩
    · have : Composition.Disjoint _ _ := h1
      rwa [← denRow_rowS, ← denRow_rowS] at this
    · simpa only [denRow_rowS] using h2
  | .ff, h => absurd h id

omit [DecidableEq B] in
/-- Representatives for finitely many variables of a finite assignment. -/
theorem represent_vars (σ : Assign (GL Label) (GB Label B)) (hσ : FinAssign σ) :
    ∀ (ns rs : List Nat), ∃ C : Cert Label B,
      (∀ n ∈ ns, (denCert C).ty n = σ.ty n) ∧
        ∀ r ∈ rs, (denCert C).row r = σ.row r
  | [], [] => ⟨Cert.empty, by simp, by simp⟩
  | n :: ns, rs => by
    obtain ⟨C, hty, hrow⟩ := represent_vars σ hσ ns rs
    obtain ⟨s, hs⟩ := represent (σ.ty n) (hσ.1 n)
    refine ⟨⟨(n, s) :: C.ty, C.row⟩, fun m hm => ?_, fun r hr => hrow r hr⟩
    by_cases h : m = n
    · subst h; simp [denCert, List.lookup, hs]
    · have hb : (m == n) = false := by simp [h]
      have := hty m ((List.mem_cons.mp hm).resolve_left h)
      simpa [denCert, List.lookup, hb] using this
  | [], r :: rs => by
    obtain ⟨C, hty, hrow⟩ := represent_vars σ hσ [] rs
    obtain ⟨fs, hfs⟩ := represent_record (σ.row r) (hσ.2 r)
    refine ⟨⟨C.ty, (r, fs) :: C.row⟩, fun m hm => by simp at hm,
      fun q hq => ?_⟩
    by_cases h : q = r
    · subst h; simp [denCert, List.lookup, hfs]
    · have hb : (q == r) = false := by simp [h]
      have := hrow q ((List.mem_cons.mp hq).resolve_left h)
      simpa [denCert, List.lookup, hb] using this

/-- A semantic certificate for `patternOf p` gives a syntactic one that
`checkCert` accepts at every `q` with the same `patternOf`. -/
theorem checkCert_of_certifies {P : SigProblem Label B}
    {p : List (Nat × Label)} {σ : Assign (GL Label) (GB Label B)}
    (h : Certifies P (patternOf p) σ) :
    ∃ C : Cert Label B, ∀ q, patternOf q = patternOf p →
      checkCert P q C = true := by
  obtain ⟨C, hty, hrow⟩ := represent_vars σ h.1 (tyVarsOf P.B) (rowVarsOf P.B)
  refine ⟨C, fun q hq => List.all_eq_true.mpr fun a ha => ?_⟩
  apply checkAtom_complete
  rw [hq]
  have hv := atomVars_liftAtom a
  refine holdsG_congr _ (fun n hn => ?_) (fun r hr => ?_) (h.2 a ha)
  · rw [hv.1] at hn
    have hm : n ∈ tyVarsOf P.B := by
      rw [tyVarsOf_eq]; exact List.mem_flatMap.mpr ⟨a, ha, hn⟩
    simp only [genAssign]
    split
    · rfl
    · exact (hty n hm).symm
  · rw [hv.2] at hr
    have hm : r ∈ rowVarsOf P.B := by
      rw [rowVarsOf_eq]; exact List.mem_flatMap.mpr ⟨a, ha, hr⟩
    simp only [genAssign]
    split
    · rfl
    · exact (hrow r hm).symm

omit [DecidableEq B] in
theorem patternOf_same {p q : List (Nat × Label)}
    (h : samePattern p q = true) : patternOf p = patternOf q := by
  simp only [samePattern, Bool.and_eq_true, List.all_eq_true,
    decide_eq_true_eq] at h
  funext r l
  simp only [patternOf]
  by_cases hp : (r, l) ∈ p
  · simp [hp, h.1 _ hp]
  · have hq : (r, l) ∉ q := fun hq => hp (h.2 _ hq)
    simp [hp, hq]

omit [DecidableEq B] in
theorem samePattern_self (p : List (Nat × Label)) :
    samePattern p p = true := by
  simp [samePattern]

/-- A table good for every consistent pattern in a list. -/
theorem table_exists {P : SigProblem Label B} (hA : Accepts P) :
    ∀ ps : List (List (Nat × Label)), ∃ T : CertTable Label B,
      ∀ q ∈ ps, consistentS P q = true → checkCert P q (lookupCert T q) = true
  | [] => ⟨[], fun _ h => by simp at h⟩
  | p :: ps => by
    obtain ⟨T, hT⟩ := table_exists hA ps
    by_cases hc : consistentS P p = true
    · obtain ⟨σ, hσ⟩ := hA _ (consistentS_iff.mp hc)
      obtain ⟨C, hC⟩ := checkCert_of_certifies hσ
      refine ⟨(p, C) :: T, fun q hq hcq => ?_⟩
      by_cases hs : samePattern p q = true
      · simp only [lookupCert, List.find?_cons, hs]
        exact hC q (patternOf_same hs).symm
      · have hne : q ≠ p := fun h => hs (h ▸ samePattern_self p)
        have hq' := (List.mem_cons.mp hq).resolve_left hne
        simp only [lookupCert, List.find?_cons, Bool.not_eq_true] at hs ⊢
        simp only [hs]
        exact hT q hq' hcq
    · refine ⟨T, fun q hq hcq => ?_⟩
      rcases List.mem_cons.mp hq with rfl | hq
      · exact absurd hcq hc
      · exact hT q hq hcq

/-- K7. -/
theorem accepts_checkAll {P : SigProblem Label B} (hA : Accepts P) :
    ∃ T : CertTable Label B, checkAll P T = true := by
  obtain ⟨T, hT⟩ := table_exists hA (patterns P)
  refine ⟨T, List.all_eq_true.mpr fun p hp => ?_⟩
  by_cases hc : consistentS P p = true
  · simp [hc, hT p hp hc]
  · simp [hc]

/-- K6 with K7. -/
theorem accepts_iff_checkAll {P : SigProblem Label B} :
    Accepts P ↔ ∃ T : CertTable Label B, checkAll P T = true :=
  ⟨accepts_checkAll, fun ⟨_, h⟩ => checkAll_accepts h⟩

end Composition.Syntax
