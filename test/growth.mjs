import assert from 'node:assert/strict';
import { loadavg } from 'node:os';

// The one routine module that compares elapsed times: a doubling check
// (Sedgewick and Wayne, Algorithms 4th ed., section 1.4) that bounds growth
// between two sizes. It does not prove linearity, and a ratio reduces but
// does not remove interference from other work on the machine.
//
// The protocol is fixed here before any result is collected (dossier
// 18.132, docs/plans/2026-10-30-verification-contract-proposal.md). Two
// untimed warm-ups, small then large. Then exactly ten timed invocations
// in the order S L L S S L L S S L (five of each). The statistic is
// median(L) / median(S). The threshold is the caller's constant, reviewed
// with the call; nothing retries, adapts or drops a sample. Every sample is
// printed with its position, size and one-minute load average.
export const schedule = ['S', 'L', 'L', 'S', 'S', 'L', 'L', 'S', 'S', 'L'];

export const median = values => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const statistic = samples => {
  const times = label => samples.filter(sample => sample.label === label)
    .map(sample => sample.ms);
  return median(times('L')) / median(times('S'));
};

// `prepare(size)` builds the input untimed; `run(input)` is the timed
// work and returns its outcome, which is kept beside each sample so the
// caller can assert it. Returns { samples, ratio, outcomes }.
export const measure = ({ prepare, run, small, large }) => {
  const sizes = { S: small, L: large };
  for (const size of [small, large]) run(prepare(size));
  const samples = [];
  const outcomes = [];
  schedule.forEach((label, index) => {
    const input = prepare(sizes[label]);
    const started = performance.now();
    outcomes.push(run(input));
    const ms = performance.now() - started;
    samples.push({ position: index + 1, label, size: sizes[label], ms,
      load1: loadavg()[0] });
  });
  return { samples, ratio: statistic(samples), outcomes };
};

export const sampleLine = sample => `sample ${sample.position} `
  + `${sample.label} size ${sample.size} ${sample.ms.toFixed(1)} ms `
  + `load1 ${sample.load1.toFixed(2)}`;

// Measures, prints every sample, and asserts ratio <= threshold. The
// failure message is the ratio's own, naming both medians. `expected`
// is asserted of every invocation's outcome first, so a wrong outcome is
// reported as such, not as a growth failure.
export const assertGrowth = ({ label, threshold, expected, log = console.log,
  ...work }) => {
  const { samples, ratio, outcomes } = measure(work);
  log(`growth ${label}: S ${work.small}, L ${work.large}, threshold ${
    threshold}`);
  samples.forEach(sample => log(sampleLine(sample)));
  const times = which => samples.filter(sample => sample.label === which)
    .map(sample => sample.ms);
  log(`growth ${label}: median S ${median(times('S')).toFixed(1)} ms, `
    + `median L ${median(times('L')).toFixed(1)} ms, ratio ${
      ratio.toFixed(3)}`);
  outcomes.forEach(outcome => assert.equal(outcome, expected, 'outcome'));
  assert.ok(ratio <= threshold, `growth ratio ${ratio.toFixed(3)} for ${
    label} exceeds ${threshold}: ${work.large} against ${work.small}`);
};
