import { promises as fs } from 'node:fs';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { fileExists, writeJsonFile, ensureDir, safeWriteFile, readJsonFile } from '../utils/fs.js';
import {
  getAcorDir,
  getAcorCoreDir,
  getAcorSkillsAssetsDir,
  getAcorJsonFile,
  getClaudeDir,
  getClaudeSkillsDir,
} from '../utils/paths.js';
import { loadConfig } from '../utils/config.js';
import { syncRegistry } from '../utils/registry.js';
import { installSkill, installRule } from '../utils/install.js';
import type { AcorJson } from '../types/index.js';

export interface InitOptions {
  cwd: string
  force: boolean
}

export async function runInit(opts: InitOptions): Promise<void> {
  const { cwd, force } = opts;

  log.section('初始化 ACOR');

  if (await fileExists(getClaudeDir(cwd))) {
    log.success('偵測到 Claude Code（.claude/ 存在）');
  } else {
    log.warn('未偵測到 .claude/ 目錄，將在安裝時建立');
  }

  // 建立 .acor/ 目錄結構
  log.step('建立 .acor/ 目錄結構');
  await ensureDir(getAcorCoreDir(cwd));

  // 安裝 acor-skills（/acor-scan、/acor-apply）到 .claude/skills/
  log.step('安裝 ACOR skills 到 .claude/skills/');
  await installAcorSkills(cwd, force);

  // 確保 .acor/ 不進 git
  await ensureGitignore(cwd);

  // 若有 acor.json，自動安裝宣告的 skills/rules
  const acorJson = await readJsonFile<AcorJson>(getAcorJsonFile(cwd));
  if (acorJson) {
    log.step('讀取 acor.json，安裝宣告的 skills / rules');
    const config = await loadConfig();
    let hubPath: string;
    try {
      hubPath = await syncRegistry(config);
    } catch (err) {
      log.error(err instanceof Error ? err.message : String(err));
      return;
    }
    await installFromAcorJson(cwd, acorJson, hubPath);
  } else {
    log.info('');
    log.dim('  尚未選擇 skills，執行 acor add 開始設定');
  }

  log.info('');
  log.success('ACOR 初始化完成');
}

async function installFromAcorJson(cwd: string, acorJson: AcorJson, hubPath: string): Promise<void> {
  let installed = 0;
  for (const id of acorJson.skills) {
    if (await installSkill(cwd, hubPath, id)) {
      log.dim(`  安裝 skill：${id}`);
      installed++;
    }
  }
  for (const rel of acorJson.rules) {
    if (await installRule(cwd, hubPath, rel)) {
      log.dim(`  安裝 rule：${rel}`);
      installed++;
    }
  }
  log.success(`安裝完成（${installed} 個項目）`);
}

async function installAcorSkills(cwd: string, force: boolean): Promise<void> {
  const acorSkillsDir = getAcorSkillsAssetsDir();
  if (!await fileExists(acorSkillsDir)) {
    log.warn('找不到 ACOR skills 資產目錄');
    return;
  }

  const entries = await fs.readdir(acorSkillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const srcFile = path.join(acorSkillsDir, entry.name, 'SKILL.md');
    if (!await fileExists(srcFile)) continue;

    const destDir = path.join(getClaudeSkillsDir(cwd), entry.name);
    const destFile = path.join(destDir, 'SKILL.md');
    await ensureDir(destDir);

    const content = await fs.readFile(srcFile, 'utf8');
    const result = await safeWriteFile(destFile, content, { force, log: log.dim });
    if (result === 'written') {
      log.success(`安裝 ACOR skill：${entry.name}`);
    }
  }
}

async function ensureGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, '.gitignore');
  const rule = '.acor/';
  const current = await fs.readFile(gitignorePath, 'utf8').catch(() => '');
  if (current.includes(rule)) return;
  const prefix = current.length === 0 ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(gitignorePath, `${current}${prefix}# ACOR runtime\n${rule}\n`, 'utf8');
  log.dim('  更新：.gitignore');
}
