import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileExists, ensureDir } from './fs.js';
import { getHubSkillsDir, getHubRulesDir, getClaudeSkillsDir, getClaudeRulesDir } from './paths.js';
import { log } from './logger.js';

export async function installSkill(cwd: string, hubPath: string, id: string): Promise<boolean> {
  const src = path.join(getHubSkillsDir(hubPath), id, 'SKILL.md');
  if (!await fileExists(src)) {
    log.warn(`  找不到 skill：${id}`);
    return false;
  }
  const dest = path.join(getClaudeSkillsDir(cwd), id, 'SKILL.md');
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
  return true;
}

export async function installRule(cwd: string, hubPath: string, rel: string): Promise<boolean> {
  const src = path.join(getHubRulesDir(hubPath), rel);
  if (!await fileExists(src)) {
    log.warn(`  找不到 rule：${rel}`);
    return false;
  }
  const dest = path.join(getClaudeRulesDir(cwd), rel);
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
  return true;
}

export async function removeSkill(cwd: string, id: string): Promise<void> {
  await fs.rm(path.join(getClaudeSkillsDir(cwd), id), { recursive: true, force: true });
}

export async function removeRule(cwd: string, rel: string): Promise<void> {
  await fs.rm(path.join(getClaudeRulesDir(cwd), rel), { force: true });
}
