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
const spawnRunner = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.error === undefined
    ? { status: result.status, stdout: result.stdout }
    : { error: result.error.message };
};

export const hostFacts = {
  platform: platform(),
  loadavg,
  run: spawnRunner,
  readText: file => readFileSync(file, 'utf8'),
  listDirectory: directory => readdirSync(directory),
  now: () => new Date()
};

export const commitOf = host => {
  const result = host.run('git', ['rev-parse', '--short', 'HEAD']);
  if (result.error !== undefined) return unavailable(result.error);
  return result.status === 0 && result.stdout.trim() !== ''
    ? result.stdout.trim() : unavailable(`git exited ${result.status}`);
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
  + ` load1 ${loadOf(host)} power ${powerOf(host)}`;
