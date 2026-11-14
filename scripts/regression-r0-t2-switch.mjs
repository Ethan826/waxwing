// Regression rows for the shadow minting switch and the one minter
// (dossier §18.170, §18.172, §18.174), for the tranche 2 registry; probes in
// test/regression-r0-forged.mjs and test/regression-r0-t2-batch.mjs. Each
// restores one defect in a whole, compiling form.
const substitution = 'src/Features/Check/Strategy/Substitution.purs';
const onlineFile = 'src/Features/Check/Strategy/Online.purs';

// §18.172: each forged-witness case against its restored defect; §18.170:
// the real constructor against RT8's decline kinds.
export const switchRows = [
  // §18.174: a minting helper inside the constructor's own module.
  { name: 'r0-minting-internal-helper', edits: [{ file:
    'src/Domain/Verdict/Certified/Internal.purs',
  needle: 'module Domain.Verdict.Certified.Internal (Certified(..)) where\n',
  replacement: 'module Domain.Verdict.Certified.Internal (Certified(..), mint)'
    + ' where\n' }, { file: 'src/Domain/Verdict/Certified/Internal.purs',
    needle: 'data Certified = Certified Valid Compilation\n',
    replacement: 'data Certified = Certified Valid Compilation\n\n'
      + 'mint ∷ Valid → Compilation → Certified\nmint = Certified\n' }],
  probe: 'r0-minting-boundary', message: /Certified\.Internal exports/ },
  // §18.174: a substitution-only minter restored beside the comparator.
  { name: 'r0-minting-bypass', edits: [{ file: substitution,
    needle: '  , substitutionOnly\n',
    replacement: '  , substitutionOnly\n  , certifySubstitution\n' },
  { file: substitution, needle: 'substitutionOnly\n  ∷ RecordedProblem',
    replacement: 'certifySubstitution\n'
      + '  ∷ RecordedProblem → Substitution → Either CheckRefusal Certified\n'
      + 'certifySubstitution problem unsettled = map minted\n'
      + '  (substitutionOnly problem unsettled)\n'
      + '  where\n'
      + '  minted found = Certified found.validity found.compilation\n\n'
      + 'substitutionOnly\n  ∷ RecordedProblem' }],
  probe: 'r0-minting-boundary',
  message: /Substitution constructs Certified other than once/ },
  // G0 and the obligations each refuse this forgery, so both go.
  { name: 'r0-forged-bool-no-g0', edits: [{ file: substitution,
    needle: '  validity ← checkSubstitution problem '
      + '(erase (settle package))\n',
    replacement: '  validity ← Right (Valid [])\n' }, { file: substitution,
    needle: '  judgeObligations problem completed\n', replacement: '' }],
    probe: 'r0-forged-bool', message: /r0-forged-bool: Solved/ },
  { name: 'r0-forged-function-no-requirement', file: substitution,
    needle: '        traverse_ (requirementUnder problem candidate) '
      + 'view.bq\n',
    replacement: '', probe: 'r0-forged-function',
    message: /r0-forged-function: Solved/ },
  // The witness bound from the pre-default field while the package is what
  // was judged: Online cannot mint since §18.174, so the split is restored
  // inside the one minter.
  { name: 'r0-forged-valid-old-field', edits: [{ file: substitution,
    needle: '  ∷ RecordedProblem → EffectPackage → '
      + 'Either CheckRefusal Certified\n'
      + 'certifyPackage = validatedBy minted\n  where\n'
      + '  minted validity _ compilation = Certified validity compilation\n',
    replacement: '  ∷ RecordedProblem → Substitution → EffectPackage'
      + ' → Either CheckRefusal Certified\n'
      + 'certifyPackage problem unsettled = validatedBy minted problem\n'
      + '  where\n  minted validity _ _ =\n'
      + '    Certified validity (substitutionWitness problem unsettled)\n' },
  { file: onlineFile,
    needle: '  either unread (certifyPackage problem) certificate.effects\n',
    replacement: '  either unread '
      + '(certifyPackage problem certificate.unsettled)\n'
      + '    certificate.effects\n' }],
  probe: 'r0-forged-valid', message: /r0-forged-valid: witness Free/ },
  { name: 'r0-forged-hole-no-contract', file: substitution,
    needle: '  either NoWitness (const (Witnessed witness))\n'
      + '    (coverage (flexDomain problem) problem witness)\n',
    replacement: '  Witnessed witness\n', probe: 'r0-forged-hole',
    message: /r0-forged-hole: compilation Witnessed/ },
  { name: 'r0-effects-unread-real-names', file: onlineFile,
    needle: '  Fault.Apart _ → "Apart"\n',
    replacement: '  Fault.Apart _ → "ImageApart"\n',
    probe: 'r0-effects-unread-names',
    message: /r0-effects-unread-names: Apart/ },
  { name: 'r0-effects-unread-real-kinds', tree: 'test', edits: [{ file:
    'test/r0-rt8-refusals.mjs',
  needle: "  EffectsUnchecked: 'a limitation', EffectsUnread: "
    + "'a read fault' };\n",
  replacement: "  EffectsUnchecked: 'a limitation' };\n" }],
  probe: 'r0-effects-unread-real',
  message: /r0-effects-unread-real: .*RT8 where today accepts: DEFECT/ }
];
