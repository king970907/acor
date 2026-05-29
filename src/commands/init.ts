import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { log } from '../utils/logger.js';
import { fileExists, writeJsonFile, ensureDir, safeWriteFile } from '../utils/fs.js';
import {
  getAcorDir,
  getAcorCoreDir,
  getAcorArchiveDir,
  getAcorLocalSkillsDir,
  getAcorLocalRulesDir,
  getAcorSkillsAssetsDir,
  getCatalogFile,
  getClaudeDir,
  getClaudeSkillsDir,
  getAssetsDir,
} from '../utils/paths.js';
import type { Catalog, CatalogSkill, CatalogRule, SkillTrigger } from '../types/index.js';

export interface InitOptions {
  cwd: string
  force: boolean
}

export async function runInit(opts: InitOptions): Promise<void> {
  const { cwd, force } = opts;

  log.section('初始化 ACOR');

  const hasClaudeDir = await fileExists(getClaudeDir(cwd));
  if (hasClaudeDir) {
    log.success('偵測到 Claude Code（.claude/ 存在）');
  } else {
    log.warn('未偵測到 .claude/ 目錄，將在套用時建立');
  }

  // 建立 .acor/ 目錄結構
  const alreadyInit = await fileExists(getAcorDir(cwd));
  if (alreadyInit && !force) {
    log.warn('.acor/ 已存在（使用 --force 重新初始化）');
  } else {
    log.step('建立 .acor/ 目錄結構');
    await ensureDir(getAcorCoreDir(cwd));
    await ensureDir(getAcorArchiveDir(cwd));
    await ensureDir(getAcorLocalSkillsDir(cwd));
    await ensureDir(getAcorLocalRulesDir(cwd));
  }

  // 複製 skill / rule 庫到 .acor/（供 Claude 本地讀取）
  log.step('同步 skill / rule 庫到 .acor/');
  const catalog = await syncLibraryAndBuildCatalog(cwd, force);

  // 寫入 catalog.json
  await writeJsonFile(getCatalogFile(cwd), catalog);
  log.success(`catalog.json 已產生（${catalog.skills.length} skills, ${catalog.rules.length} rules）`);

  // 初始化 state.json
  const stateFile = path.join(getAcorCoreDir(cwd), 'state.json');
  if (!await fileExists(stateFile) || force) {
    await writeJsonFile(stateFile, {
      version: '0.1.0',
      installedSkills: [],
      installedRules: [],
      archivedAt: {},
    });
  }

  // 安裝 ACOR 工具 skills 到 .claude/skills/
  log.step('安裝 ACOR skills 到 .claude/skills/');
  await installAcorSkills(cwd, force);

  // 確保 .acor/ 不進 git
  await ensureGitignore(cwd);

  log.info('');
  log.success('ACOR 初始化完成');
  log.info('');
  log.dim('  下一步：在 Claude Code 中執行 /acor-scan 分析專案');
}

async function syncLibraryAndBuildCatalog(cwd: string, force: boolean): Promise<Catalog> {
  const assetsDir = getAssetsDir();
  const skills: CatalogSkill[] = [];
  const rules: CatalogRule[] = [];

  // 同步 skills
  const skillsAssetsDir = path.join(assetsDir, 'skills');
  if (await fileExists(skillsAssetsDir)) {
    const entries = await fs.readdir(skillsAssetsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const srcFile = path.join(skillsAssetsDir, entry.name, 'SKILL.md');
      if (!await fileExists(srcFile)) continue;

      const destDir = path.join(getAcorLocalSkillsDir(cwd), entry.name);
      const destFile = path.join(destDir, 'SKILL.md');
      await ensureDir(destDir);
      await fs.copyFile(srcFile, destFile);

      const raw = await fs.readFile(srcFile, 'utf8');
      const fm = matter(raw).data as Record<string, unknown>;

      skills.push({
        id: (fm.id as string) ?? entry.name,
        name: (fm.name as string) ?? entry.name,
        description: (fm.description as string) ?? '',
        version: (fm.version as string) ?? '1.0.0',
        tags: (fm.tags as string[]) ?? [],
        triggers: (fm.triggers as SkillTrigger[]) ?? [],
        sourcePath: `.acor/skills/${entry.name}/SKILL.md`,
      });

      log.dim(`  同步 skill: ${entry.name}`);
    }
  }

  // 同步 rules
  const rulesAssetsDir = path.join(assetsDir, 'rules');
  if (await fileExists(rulesAssetsDir)) {
    await walkAndSyncRules(rulesAssetsDir, '', cwd, rules, force);
  }

  return {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    skills,
    rules,
  };
}

async function walkAndSyncRules(
  dir: string,
  prefix: string,
  cwd: string,
  rules: CatalogRule[],
  _force: boolean,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkAndSyncRules(full, rel, cwd, rules, _force);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const destFile = path.join(getAcorLocalRulesDir(cwd), rel);
      await ensureDir(path.dirname(destFile));
      await fs.copyFile(full, destFile);

      const raw = await fs.readFile(full, 'utf8');
      const fm = matter(raw).data as Record<string, unknown>;
      const id = (fm.id as string) ?? entry.name.replace(/\.md$/, '');

      rules.push({
        id,
        name: (fm.name as string) ?? id,
        description: (fm.description as string) ?? '',
        triggers: (fm.triggers as SkillTrigger[]) ?? [],
        relativePath: rel,
        sourcePath: `.acor/rules/${rel}`,
      });

      log.dim(`  同步 rule: ${rel}`);
    }
  }
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
      log.success(`安裝 ACOR skill: ${entry.name}`);
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
  log.dim('  更新: .gitignore');
}
