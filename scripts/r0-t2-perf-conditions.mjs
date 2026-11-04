// Shared-machine conditions recorded before every sample of the paired
// performance measurement (docs/plans/2026-11-04-performance-protocol.md
// §7): the load average, the five busiest processes, the memory free
// percentage, the memory pressure level and swap use. Recorded, never
// gated: the author keeps using the computer (dossier §18.159
// criterion 6). The host is injected (`run`, `loadavg`, `now`), so the
// parsers are tested on fixed text (test/r0-t2-perf.test.mjs). A value
// the host cannot give is `unavailable (<reason>)`, never guessed.
// macOS commands only (the measured host); `sysctl` and `ps` read, they
// allocate nothing (unlike `memory_pressure`, which allocates by
// default and is not used).
import { loadavg } from 'node:os';
import { spawnSync } from 'node:child_process';
import { makeRunner, unavailable } from './verify-conditions.mjs';

export const topCount = 5;

// The kernel's pressure levels (kern.memorystatus_vm_pressure_level).
export const pressureLevels = { 1: 'normal', 2: 'warn', 4: 'critical' };

export const commands = {
  top: ['ps', ['-A', '-r', '-o', 'pid=,pcpu=,rss=,comm=']],
  memoryFree: ['sysctl', ['-n', 'kern.memorystatus_level']],
  pressure: ['sysctl', ['-n', 'kern.memorystatus_vm_pressure_level']],
  swap: ['sysctl', ['-n', 'vm.swapusage']]
};

// `ps -A -r -o pid=,pcpu=,rss=,comm=` (sorted by CPU, busiest first):
// the first `count` rows as { pid, cpuPercent, rssMiB, command }.
export const parseTop = (text, count = topCount) => String(text)
  .split('\n').map(line => line.trim()).filter(line => line !== '')
  .map(line => /^(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/.exec(line))
  .filter(found => found !== null).slice(0, count)
  .map(([, pid, cpu, rss, command]) => ({ pid: Number(pid),
    cpuPercent: Number(cpu), rssMiB: Math.round(Number(rss) / 1024),
    command: command.split('/').pop() }));

// `sysctl -n kern.memorystatus_level`: a whole percentage, 0 to 100.
export const parseMemoryFree = text => {
  const value = Number(String(text).trim());
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value
    : unavailable(`memorystatus_level not a percentage: ${
      JSON.stringify(String(text).trim())}`);
};

export const parsePressure = text =>
  pressureLevels[String(text).trim()]
    ?? unavailable(`unknown pressure level ${JSON.stringify(
      String(text).trim())}`);

// `sysctl -n vm.swapusage`: `total = 16384.00M  used = 15866.50M  free =
// 517.50M  (encrypted)` as { totalMiB, usedMiB, freeMiB }.
export const parseSwap = text => {
  const field = name => {
    const found = new RegExp(`${name} = ([\\d.]+)M`).exec(String(text));
    return found === null ? null : Number(found[1]);
  };
  const swap = { totalMiB: field('total'), usedMiB: field('used'),
    freeMiB: field('free') };
  return Object.values(swap).every(Number.isFinite) ? swap
    : unavailable(`swapusage not recognized: ${JSON.stringify(
      String(text).trim())}`);
};

const parsers = { top: parseTop, memoryFree: parseMemoryFree,
  pressure: parsePressure, swap: parseSwap };

export const host = { run: makeRunner(spawnSync), loadavg,
  now: () => new Date() };

// One sample's conditions, with each command's raw output kept for the
// log. A command that fails gives `unavailable`, and the sample still
// runs: conditions are recorded, not required.
export const sampleConditions = (machine = host) => {
  const raw = {};
  const read = Object.fromEntries(Object.entries(commands)
    .map(([key, [command, args]]) => {
      const result = machine.run(command, args);
      raw[key] = result.error ?? result.stdout;
      if (result.error !== undefined)
        return [key, unavailable(result.error)];
      return [key, result.status === 0 ? parsers[key](result.stdout)
        : unavailable(`${command} exited ${result.status}`)];
    }));
  return { time: machine.now().toISOString(),
    loadavg: machine.loadavg().map(value => Number(value.toFixed(2))),
    ...read, raw };
};
