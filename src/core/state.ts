import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AcorState } from '../types/index.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getStateFile, getAcorArchiveDir } from '../utils/paths.js';

const CURRENT_VERSION = '0.1.0';

export async function loadState(cwd: string): Promise<AcorState> {
  const state = await readJsonFile<AcorState>(getStateFile(cwd));
  return state ?? {
    version: CURRENT_VERSION,
    installedSkills: [],
    installedRules: [],
    archivedAt: {},
  };
}

export async function saveState(cwd: string, state: AcorState): Promise<void> {
  await writeJsonFile(getStateFile(cwd), state);
}

export async function markInstalled(
  cwd: string,
  type: 'skill' | 'rule',
  name: string,
): Promise<void> {
  const state = await loadState(cwd);
  if (type === 'skill' && !state.installedSkills.includes(name)) {
    state.installedSkills.push(name);
  } else if (type === 'rule' && !state.installedRules.includes(name)) {
    state.installedRules.push(name);
  }
  await saveState(cwd, state);
}

export async function markArchived(
  cwd: string,
  name: string,
): Promise<void> {
  const state = await loadState(cwd);
  state.archivedAt[name] = new Date().toISOString();
  state.installedSkills = state.installedSkills.filter((s) => s !== name);
  state.installedRules = state.installedRules.filter((r) => r !== name);
  await saveState(cwd, state);
}

export async function countArchived(cwd: string): Promise<number> {
  const archiveDir = getAcorArchiveDir(cwd);

  const [skillCount, ruleCount] = await Promise.all([
    fs.readdir(path.join(archiveDir, 'skills'), { withFileTypes: true })
      .then((entries) => entries.filter((e) => e.isDirectory()).length)
      .catch(() => 0),
    countFilesRecursive(path.join(archiveDir, 'rules')).catch(() => 0),
  ]);

  return skillCount + ruleCount;
}

async function countFilesRecursive(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map((e) =>
      e.isFile() ? Promise.resolve(1) : countFilesRecursive(path.join(dir, e.name)),
    ),
  );
  return counts.reduce((a, b) => a + b, 0);
}
