import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { loadavg, platform } from 'node:os';

// One line of run conditions printed before each verify test phase, so a
// timing failure can be read against the load and power state it ran
// under (docs/plans/2026-10-29-verify-timing-proposal.md, 1c). A value
// the host cannot give is `unavailable (<reason>)`, never omitted or
// guessed. Only macOS is a verified host; the Linux and Windows paths
// are exercised with injected results (test/verify-conditions.test.mjs).

export const unavailable = reason => `unavailable (${reason})`;

// A command runner returns { status, stdout } or { error }.
// A diagnostic call that hangs must not hang verify: it times out.
export const commandTimeoutMs = 10000;
export const makeRunner = spawn => (command, args) => {
  const result = spawn(command, args,
    { encoding: 'utf8', timeout: commandTimeoutMs });
  if (result.error === undefined)
    return { status: result.status, stdout: result.stdout };
  return { error: result.error.code === 'ETIMEDOUT' ? 'timed out'
    : result.error.message };
};

export const hostFacts = {
  platform: platform(),
  loadavg,
  run: makeRunner(spawnSync),
  readText: file => readFileSync(file, 'utf8'),
  listDirectory: directory => readdirSync(directory),
  now: () => new Date()
};

// Commit identity and tracked-file state: `git describe --always --dirty`
// (`abc1234-dirty` when tracked files differ from HEAD).
export const commitOf = host => {
  const result = host.run('git', ['describe', '--always', '--dirty']);
  if (result.error !== undefined) return unavailable(result.error);
  return result.status === 0 && result.stdout.trim() !== ''
    ? result.stdout.trim() : unavailable(`git exited ${result.status}`);
};

// Untracked, non-ignored files can change what runs without touching a
// tracked file. Rule: count every `??` entry of `git status --porcelain`
// (ignored files are not listed) and name up to three whose path is under
// src/, test/, scripts/ or tools/. Empty when there are none.
const executable = /^(src|test|scripts|tools)\//;
export const untrackedOf = host => {
  const result = host.run('git',
    ['status', '--porcelain', '--untracked-files=all']);
  if (result.error !== undefined || result.status !== 0)
    return ` untracked ${unavailable(result.error ?? `git exited ${
      result.status}`)}`;
  const paths = (result.stdout ?? '').split('\n')
    .filter(row => row.startsWith('?? ')).map(row => row.slice(3));
  const shown = paths.filter(path => executable.test(path)).slice(0, 3);
  return paths.length === 0 ? '' : ` untracked ${paths.length}${
    shown.length === 0 ? '' : ` (${shown.join(', ')})`}`;
};

export const loadOf = host => {
  if (host.platform === 'win32')
    return unavailable('os.loadavg is always zero on win32');
  const [oneMinute] = host.loadavg();
  return Number.isFinite(oneMinute)
    ? oneMinute.toFixed(2) : unavailable('os.loadavg gave no number');
};

const darwinPower = host => {
  const result = host.run('pmset', ['-g', 'batt']);
  if (result.error !== undefined) return unavailable(result.error);
  const found = /Now drawing from '([^']+)'/.exec(result.stdout ?? '');
  return result.status === 0 && found !== null
    ? found[1] : unavailable('pmset output not recognized');
};

const linuxSupply = (host, directory, name) => {
  const base = `${directory}/${name}`;
  try {
    const kind = host.readText(`${base}/type`).trim();
    const online = kind === 'Mains' || kind === 'USB'
      ? host.readText(`${base}/online`).trim() : undefined;
    return { kind, online };
  } catch (error) {
    return { kind: undefined, online: undefined };
  }
};

const linuxPower = host => {
  const directory = '/sys/class/power_supply';
  let names;
  try { names = host.listDirectory(directory); } catch (error) {
    return unavailable(`cannot read ${directory}`);
  }
  const supplies = names.map(name => linuxSupply(host, directory, name));
  if (supplies.some(supply => supply.online === '1')) return 'AC Power';
  if (supplies.some(supply => supply.online === '0')) return 'Battery Power';
  return unavailable('no mains supply reported in /sys/class/power_supply');
};

export const powerOf = host => {
  if (host.platform === 'darwin') return darwinPower(host);
  if (host.platform === 'linux') return linuxPower(host);
  return unavailable(`no power source reader for ${host.platform}`);
};

export const conditionsLine = (label, host = hostFacts) =>
  `conditions [${label}] commit ${commitOf(host)}`
  + ` time ${host.now().toISOString()}`
  + ` load1 ${loadOf(host)} power ${powerOf(host)}${untrackedOf(host)}`;
