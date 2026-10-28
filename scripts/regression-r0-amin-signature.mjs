// R0 a-min tranche 1 regression rows for the declaration's signature
// (Tasks 21, 23), spread into r0AminRows (scripts/regression-r0-amin.mjs);
// probes in test/regression-r0-amin-signature.mjs.
const generate = 'src/Features/Check/Generate/';
export const signatureRows = [
  {
    // Task 21: assembly accepts a declaration with no SignatureAt, so a
    // unit-valued one (equal to the fold's placeholder) goes unnoticed.
    name: 'r0-amin-signature-missing',
    file: 'src/Features/Check/Generate/Assemble.purs',
    needle: '  | otherwise = Left MissingSignature\n',
    replacement: '  | otherwise = Right items\n',
    probe: 'r0-amin-signature-missing',
    message: /a missing SignatureAt write went undetected/
  },
  {
    // Task 23: effectRigids drops its first entry, so a rigid effect-row
    // variable the signature names is not listed.
    name: 'r0-amin-signature-rigids',
    file: `${generate}Declared.purs`,
    needle: '  <> Array.catMaybes (Array.mapWithIndex effectRow'
      + ' function.sorts)\n',
    replacement: '  <> Array.drop 1 (Array.catMaybes'
      + ' (Array.mapWithIndex effectRow function.sorts))\n',
    probe: 'r0-amin-signature-rigids',
    message: /an effect rigid: hand: EffRigid 0 is not in effectRigids/
  },
  {
    // Task 23: rigidMarks drops its last entry, so a rigid mark the
    // signature names is not listed.
    name: 'r0-amin-signature-rigid-marks',
    file: `${generate}Declared.purs`,
    needle: 'rigidEffects function = map RigidMark'
      + ' (Array.nub function.markVariables)\n',
    replacement: 'rigidEffects function = map RigidMark'
      + ' (Array.dropEnd 1 (Array.nub function.markVariables))\n',
    probe: 'r0-amin-signature-rigid-marks',
    message: /the signature names a rigid mark: .*not in rigidMarks/
  },
  {
    // Task 21: a missing write read off the placeholder: a SignatureAt
    // counts as written only when it differs from `emptyEffects`'
    // signature, so a real `with pure` unit declaration (which records
    // exactly the placeholder) is refused as missing.
    name: 'r0-amin-signature-missing-real',
    file: `${generate}Assemble.purs`,
    needle: '  SignatureAt _ _ → true\n',
    replacement: '  SignatureAt _ sig → sig /= emptyEffects.signature\n',
    probe: 'r0-amin-signature-missing-real',
    message: /generation refused: \{"MissingSignature"/
  }
];
