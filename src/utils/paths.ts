import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAssetsDir(): string {
  return path.resolve(__dirname, '../../assets');
}

export function getAcorDir(cwd: string): string {
  return path.join(cwd, '.acor');
}

export function getAcorCoreDir(cwd: string): string {
  return path.join(cwd, '.acor', 'core');
}

export function getAcorArchiveDir(cwd: string): string {
  return path.join(cwd, '.acor', 'archive');
}

export function getStateFile(cwd: string): string {
  return path.join(cwd, '.acor', 'core', 'state.json');
}

export function getClaudeDir(cwd: string): string {
  return path.join(cwd, '.claude');
}

export function getClaudeSkillsDir(cwd: string): string {
  return path.join(cwd, '.claude', 'skills');
}

export function getClaudeRulesDir(cwd: string): string {
  return path.join(cwd, '.claude', 'rules');
}
