import path from 'node:path';
import os from 'node:os';
import { readJsonFile, writeJsonFile, ensureDir } from './fs.js';

export interface RegistryConfig {
  url?: string    // git URL，clone 到 ~/.acor/registry/
  path?: string   // 本地路徑，直接讀取（優先於 url）
  branch?: string // git branch，預設 main
}

export interface AcorConfig {
  registry?: RegistryConfig
}

const GLOBAL_ACOR_DIR = path.join(os.homedir(), '.acor');

export function getGlobalAcorDir(): string {
  return GLOBAL_ACOR_DIR;
}

export function getGlobalRegistryDir(): string {
  return path.join(GLOBAL_ACOR_DIR, 'registry');
}

export async function loadConfig(): Promise<AcorConfig> {
  const configFile = path.join(GLOBAL_ACOR_DIR, 'config.json');
  return await readJsonFile<AcorConfig>(configFile) ?? {};
}

export async function saveConfig(config: AcorConfig): Promise<void> {
  await ensureDir(GLOBAL_ACOR_DIR);
  const configFile = path.join(GLOBAL_ACOR_DIR, 'config.json');
  await writeJsonFile(configFile, config);
}
