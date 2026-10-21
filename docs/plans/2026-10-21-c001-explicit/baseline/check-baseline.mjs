import { isDeepStrictEqual } from 'node:util';

const runtime = value => value?.kind === 'executed'
  ? { kind: value.kind, stdout: value.stdout, stderr: value.stderr,
    exit: value.exit } : value;

export const compareCase = (expected, actual) => {
  const failures = [];
  const same = (label, left, right) => {
    if (!isDeepStrictEqual(left, right)) failures.push(label);
  };
  same('source hash', expected.sourceSha256, actual.sourceSha256);
  same('compiler', expected.compiler, actual.compiler);
  same('interpreter', expected.interpreter, actual.interpreter);
  same('representative set', Object.keys(expected.representatives).sort(),
    Object.keys(actual.representatives ?? {}).sort());
  for (const [name, outcome] of Object.entries(expected.representatives)) {
    same(`representative ${name}`, outcome,
      runtime(actual.representatives?.[name]));
  }
  if (expected.defaultGoSha256) same('default Go hash',
    expected.defaultGoSha256, actual.representatives?.Int?.goSha256);
  if (expected.functionKeys) same('function keys', expected.functionKeys,
    actual.functionKeys);
  if (expected.requiresTypeHole &&
      !(actual.checkedTypes?.typeHoleOccurrences > 0)) {
    failures.push('required type-hole observation absent');
  }
  return failures;
};

export const compareReport = (manifest, report) => {
  const failures = [];
  const expected = Object.keys(manifest.cases);
  const actual = report.results?.map(row => row.name) ?? [];
  if (!isDeepStrictEqual([...expected].sort(), [...actual].sort())) {
    failures.push({ name: 'case census', differences: ['missing/extra case'] });
  }
  for (const row of report.results ?? []) {
    if (!manifest.cases[row.name]) continue;
    const differences = compareCase(manifest.cases[row.name], row);
    if (differences.length) failures.push({ name: row.name, differences });
  }
  if (report.infrastructureErrors?.length) failures.push({
    name: 'infrastructure', differences: report.infrastructureErrors
  });
  return failures;
};

export const uniformity = report => report.results.flatMap(row => {
  const outcomes = Object.values(row.representatives ?? {}).map(runtime);
  return outcomes.length && outcomes.some(value =>
    !isDeepStrictEqual(value, outcomes[0])) ? [row.name] : [];
});
