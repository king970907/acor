import type { AcorState } from '../types/index.js';
import { readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getStateFile } from '../utils/paths.js';

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
