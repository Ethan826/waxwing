// FX020 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-fx020.mjs. Each restores one defect of the design's
// "Problem" section (or its cause) in a whole, compiling form.
const unboundCall = '  unbound _ = failure '
  + '(unboundName scope span UnboundFunction name)\n';
const qualifiedHead = 'qualifiedCall scope span qualifier member arguments'
  + ' resolved =\n'
  + '  either (liftEither <<< missing UnboundFunction span effect member)\n'
  + '    (call Nothing span arguments resolved)\n'
  + '    (declared scope.effectInfos effect member)\n'
  + '  where\n'
  + '  effect = canonical scope qualifier\n';
const scopeHead = '  where\n  scope =\n    { globals\n    , effects\n'
  + '    , effectInfos\n';
export const fx020Rows = [
  {
    // Bare operation names global again, the first declaration winning: a
    // bare `log(1)` means Audit.log, and Log.log is not what it reaches.
    name: 'fx020-first-declaration',
    edits: [
      {
        file: 'src/Features/Resolve/Name.purs',
        needle: 'import Features.Resolve.Qualified (importedCall, '
          + 'importedName)\n',
        replacement: 'import Features.Resolve.Qualified\n'
          + '  (importedCall, importedName, qualifiedCall)\n'
      },
      {
        file: 'src/Features/Resolve/Name.purs',
        needle: unboundCall,
        replacement: '  unbound _ = maybe\' notFound firstDeclaring\n'
          + '    (Array.find declares scope.effectInfos)\n'
          + '  notFound _ = failure '
          + '(unboundName scope span UnboundFunction name)\n'
          + '  declares effect = Array.any (isNamed name) effect.operations\n'
          + '  isNamed wanted operation = operation.name == wanted\n'
          + '  firstDeclaring effect =\n'
          + '    qualifiedCall scope span effect.name name arguments resolved\n'
      }
    ],
    probe: 'fx020-first-declaration', message: /bare operation resolved/
  },
  {
    // A function winning over an operation of the same name, reached by
    // its qualified name: Log.log calls `fn log`, so the operation is
    // unreachable.
    name: 'fx020-function-wins', file: 'src/Features/Resolve/Qualified.purs',
    needle: qualifiedHead,
    replacement: 'qualifiedCall scope span qualifier member arguments'
      + ' resolved =\n'
      + '  maybe\' viaEffect functionCall (Array.find named scope.globals)\n'
      + '  where\n'
      + '  effect = canonical scope qualifier\n'
      + '  named global = global.name == member\n'
      + '  functionCall global = case global.ref of\n'
      + '    Resolved.GlobalFunction id _ →\n'
      + '      Resolved.Call span id <$> resolved\n'
      + '    _ → viaEffect unit\n'
      + '  viaEffect _ =\n'
      + '    either\n'
      + '      (liftEither <<< missing UnboundFunction span effect member)\n'
      + '      (call Nothing span arguments resolved)\n'
      + '      (declared scope.effectInfos effect member)\n',
    probe: 'fx020-function-wins', message: /function won over operation/
  },
  {
    // Resolution reading the row: an effect outside the function's written
    // row declares nothing, so `Database.query` stops resolving there
    // instead of resolving and failing effect checking. The second edit
    // restores `maybe`, which Resolve.purs no longer imports (R005 moved
    // the entry check out); the defect itself is unchanged.
    name: 'fx020-row-dependent',
    edits: [
      {
        file: 'src/Features/Resolve.purs',
        needle: scopeHead,
        replacement: '  where\n'
          + '  hidden effect\n'
          + '    | Array.any (isNamed effect.name) labels = effect\n'
          + '    | otherwise = effect { operations = [] }\n'
          + '  isNamed wanted label = label.name == wanted\n'
          + '  labels = maybe [] rowLabels definition.function.row\n'
          + '  rowLabels (Syntax.RowRef _ found _) = found\n'
          + '  scope =\n    { globals\n    , effects\n'
          + '    , effectInfos: map hidden effectInfos\n'
      },
      {
        file: 'src/Features/Resolve.purs',
        needle: 'import Data.Maybe (Maybe(..))\n',
        replacement: 'import Data.Maybe (Maybe(..), maybe)\n'
      }
    ],
    probe: 'fx020-row-dependent', message: /resolved by the row/
  }
];
