// Tranche 2 Task 3 regression rows (the generation correction, design
// §B.2; dossier §18.155 (1)), spread into t2Rows
// (scripts/regression-r0-t2.mjs); probes in
// test/regression-r0-t2-generation.mjs. Each restores one defect in a
// whole, compiling form.
const generate = 'src/Features/Check/Generate/';

export const t2GenerationRows = [
  {
    // The implicit annotation tail left `EffRigid ι`, as before the
    // correction: the annotation's R is not the lambda's own row.
    name: 'r0-t2-annotation-implicit-rigid',
    file: `${generate}Marked.purs`,
    needle: '    | variable == EffRigid implicit = EffFresh path EffectOf\n',
    replacement: '    | variable == EffRigid implicit && false ='
      + ' EffFresh path EffectOf\n',
    probe: 'r0-t2-annotation-implicit-row',
    message: /implicit annotation row is not the lambda's EffectOf/
  },
  {
    // Minting from the renamed annotation (review C1): the lambda's
    // `⟨p, EffectOf⟩`, which `lambda` mints, is minted a second time.
    name: 'r0-t2-annotation-double-mint',
    file: `${generate}Control.purs`,
    needle: '            [ PartTy (annotationClauses path index'
      + ' markedType) ]\n',
    replacement: '            [ PartTy recorded ]\n',
    probe: 'r0-t2-annotation-minted-once',
    message: /minted twice: .*EffectOf/
  }
];
