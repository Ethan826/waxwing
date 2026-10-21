// R005 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r005.mjs. Each restores one defect in a whole,
// compiling form.
export const r005Rows = [
  {
    // A label the spread's type has is no overlap: the literal checks and
    // the record row would hold the label twice.
    name: 'r005-overlap', file: 'src/Features/Check/Overlap.purs',
    needle: '(Array.find known withLabels)',
    replacement: '(Array.find known (Array.take 0 withLabels))',
    probe: 'r005-overlap',
    message: /overlap accepted: /
  },
  {
    // The overlap is reported at the item, whichever was written first.
    name: 'r005-overlap-order', file: 'src/Features/Check/Overlap.purs',
    needle: '  earlier = if baseFirst then base.span else item.span\n'
      + '  later = if baseFirst then item.span else base.span\n',
    replacement: '  earlier = if baseFirst then base.span else base.span\n'
      + '  later = item.span\n',
    probe: 'r005-overlap-order',
    message: /overlap order ignored: E_DUPLICATE Duplicate field admin @admin/
  },
  {
    // A use's metas lack nothing the callee's `where` clauses wrote.
    // (The rule moved to Features.Check.UseFacts in R005 Tranche B Task 3,
    // which does not import Data.Array, so the defect brings the import.)
    name: 'r005-written-use',
    edits: [
      {
        file: 'src/Features/Check/UseFacts.purs',
        needle: 'import Prelude\n',
        replacement: 'import Prelude\nimport Data.Array as Array\n'
      },
      {
        file: 'src/Features/Check/UseFacts.purs',
        needle: '  { state = required metaOf constraints use.state }',
        replacement: '  { state = required metaOf (Array.take 0 constraints) '
          + 'use.state }'
      }
    ],
    probe: 'r005-written-use',
    message: /written lack not seeded: E_INTERNAL Duplicate record label/
  },
  {
    // The clause is forgotten when a violation is found: the violation is
    // the mismatch of the shapes, not the approved text.
    // (Since R005 Tranche B Task 3 the lack's reason decides the report;
    // since Task 4 in Features.Check.Refused, shared by the row rules.)
    name: 'r005-provenance', file: 'src/Features/Check/Refused.purs',
    needle: '  Lacks written → Left (Refused (Forbidden label written))\n',
    replacement: '  Lacks _ → failed subst\n',
    probe: 'r005-provenance',
    message: /provenance lost: E_TYPE Expected /
  },
  {
    // The rest binder has the whole matched type.
    name: 'r005-rest-type', file: 'src/Features/Check/RestBinder.purs',
    needle: '    TRecord row → TRecord (withoutLabels (writtenLabels '
      + 'written) row)\n',
    replacement: '    TRecord row → TRecord (withoutLabels (Array.take 0 '
      + '(writtenLabels written)) row)\n',
    probe: 'r005-rest-type',
    message: /rest typed as the whole: E_TYPE Expected /
  },
  {
    // The temporaries are bound in label order, the spread's first.
    name: 'r005-go-order', file: 'src/Format/Go/Extension.purs',
    needle: '(closure ty (temporaries written <> discard) literal)',
    replacement: '(closure ty (temporaries (Array.sortWith labelled written) '
      + '<> discard) literal)',
    probe: 'r005-go-order',
    message: /items out of order: 2\n1\n3\n/
  },
  {
    // The empty closed record is accepted where Unit is expected.
    name: 'r005-empty-unit', file: 'src/Features/Check/Unify.purs',
    needle: '  TUnit, TUnit → Right subst\n',
    replacement: '  TUnit, TUnit → Right subst\n'
      + '  TRecord emptied, TUnit | Array.null emptied.fields '
      + '&& Array.null emptied.tails → Right subst\n'
      + '  TUnit, TRecord emptied | Array.null emptied.fields '
      + '&& Array.null emptied.tails → Right subst\n',
    probe: 'r005-empty-unit',
    message: /\{\} unified with Unit: \n/
  },
  {
    // The remainder's layout is interned and then forgotten, so a rest
    // whose shape no expression has names a struct that is never emitted.
    name: 'r005-rest-layout',
    edits: [
      {
        file: 'src/Features/Specialize/Body.purs',
        needle: 'import Features.Specialize.Copy (modify)',
        replacement: 'import Features.Specialize.Copy (get, modify)'
      },
      {
        file: 'src/Features/Specialize/Body.purs',
        needle: '  Checked.NamedRest id ty → IR.NamedRest id <$> typed scope '
          + 'span ty',
        replacement: '  Checked.NamedRest id ty → do\n'
          + '    before ← get\n'
          + '    found ← typed scope span ty\n'
          + '    modify (\\state → state { layouts = before.layouts })\n'
          + '    pure (IR.NamedRest id found)'
      }
    ],
    probe: 'r005-rest-layout',
    message: /rest layout missing: failed: /
  }
];
