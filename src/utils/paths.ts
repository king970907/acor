import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAssetsDir(): string {
  return path.resolve(__dirname, '../../assets');
}

export function getAcorSkillsAssetsDir(): string {
  return path.join(getAssetsDir(), 'acor-skills');
}

// .acor/ 目錄（runtime，不進 git）
export function getAcorDir(cwd: string): string {
  return path.join(cwd, '.acor');
}

export function getAcorCoreDir(cwd: string): string {
  return path.join(cwd, '.acor', 'core');
}

export function getAcorArchiveDir(cwd: string): string {
  return path.join(cwd, '.acor', 'archive');
}

// .acor/ 內的 skill / rule 庫（local copy，供 Claude 讀取）
export function getAcorLocalSkillsDir(cwd: string): string {
  return path.join(cwd, '.acor', 'skills');
}

export function getAcorLocalRulesDir(cwd: string): string {
  return path.join(cwd, '.acor', 'rules');
}

export function getCatalogFile(cwd: string): string {
  return path.join(cwd, '.acor', 'core', 'catalog.json');
}

export function getStateFile(cwd: string): string {
  return path.join(cwd, '.acor', 'core', 'state.json');
}

// .claude/ 目錄
export function getClaudeDir(cwd: string): string {
  return path.join(cwd, '.claude');
}

export function getClaudeSkillsDir(cwd: string): string {
  return path.join(cwd, '.claude', 'skills');
}

export function getClaudeRulesDir(cwd: string): string {
  return path.join(cwd, '.claude', 'rules');
}
