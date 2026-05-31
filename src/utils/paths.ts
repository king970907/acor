import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// acor 套件內的 assets（acor-skills）
export function getAssetsDir(): string {
  return path.resolve(__dirname, '../../assets');
}

export function getAcorSkillsAssetsDir(): string {
  return path.join(getAssetsDir(), 'acor-skills');
}

// hub 相關路徑（registry 來源）
export function getHubSkillsDir(hubPath: string): string {
  return path.join(hubPath, 'skills');
}

export function getHubRulesDir(hubPath: string): string {
  return path.join(hubPath, 'rules');
}

// 專案根目錄的 acor.json（進 git）
export function getAcorJsonFile(cwd: string): string {
  return path.join(cwd, 'acor.json');
}

// .acor/ 目錄（runtime，不進 git）
export function getAcorDir(cwd: string): string {
  return path.join(cwd, '.acor');
}

export function getAcorCoreDir(cwd: string): string {
  return path.join(cwd, '.acor', 'core');
}

export function getLastScanFile(cwd: string): string {
  return path.join(cwd, '.acor', 'core', 'last-scan.json');
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
