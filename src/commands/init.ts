import { promises as fs } from 'node:fs';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { fileExists, writeJsonFile } from '../utils/fs.js';
import {
  getAcorDir,
  getAcorCoreDir,
  getAcorArchiveDir,
  getStateFile,
  getClaudeDir,
} from '../utils/paths.js';

export interface InitOptions {
  cwd: string
}

export async function runInit(opts: InitOptions): Promise<void> {
  const { cwd } = opts;

  log.section('初始化 ACOR');

  // 偵測 Claude Code
  const hasClaudeDir = await fileExists(getClaudeDir(cwd));
  if (hasClaudeDir) {
    log.success('偵測到 Claude Code (.claude/ 存在)');
  } else {
    log.warn('未偵測到 .claude/ 目錄，Claude Code 設定將在 apply 時建立');
  }

  // 建立 .acor/ 目錄結構
  const acorDir = getAcorDir(cwd);
  const alreadyInit = await fileExists(acorDir);

  if (alreadyInit) {
    log.warn('.acor/ 已存在，略過初始化');
    return;
  }

  log.step('建立 .acor/ 目錄結構');
  await fs.mkdir(getAcorCoreDir(cwd), { recursive: true });
  await fs.mkdir(getAcorArchiveDir(cwd), { recursive: true });

  // 初始化 state.json
  await writeJsonFile(getStateFile(cwd), {
    version: '0.1.0',
    installedSkills: [],
    installedRules: [],
    archivedAt: {},
  });

  // 寫入 claude adapter
  const adapterPath = path.join(getAcorDir(cwd), 'adapters', 'claude.json');
  await writeJsonFile(adapterPath, {
    agent: 'claude-code',
    skillsDir: '.claude/skills',
    rulesDir: '.claude/rules',
    skillFormat: 'SKILL.md',
  });

  // 確保 .acor/ 不進 git
  await ensureGitignore(cwd);

  log.success('ACOR 初始化完成');
  log.dim(`  建立: ${path.relative(cwd, getAcorDir(cwd))}/`);
  log.info('');
  log.info('下一步：執行 `acor scan` 分析專案並取得 skill 推薦');
}

async function ensureGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, '.gitignore');
  const rule = '.acor/';

  const current = await fs.readFile(gitignorePath, 'utf8').catch(() => '');
  if (current.includes(rule)) return;

  const prefix = current.length === 0 ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(
    gitignorePath,
    `${current}${prefix}# ACOR runtime\n${rule}\n`,
    'utf8',
  );
  log.dim(`  更新: .gitignore`);
}
