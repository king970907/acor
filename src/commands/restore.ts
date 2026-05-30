import { promises as fs } from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { formatDate } from '../utils/format.js';
import { fileExists, moveFile, ensureDir } from '../utils/fs.js';
import {
  getAcorDir,
  getAcorArchiveDir,
  getClaudeSkillsDir,
  getClaudeRulesDir,
} from '../utils/paths.js';
import { loadState, saveState } from '../core/state.js';

export interface RestoreOptions {
  cwd: string
  yes: boolean
}

interface ArchivedItem {
  type: 'skill' | 'rule'
  name: string
  archivedAt: string
  archivePath: string
  restorePath: string
}

export async function runRestore(opts: RestoreOptions): Promise<void> {
  const { cwd, yes } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.error('未找到 .acor/ 目錄，請先執行 `acor init`');
    process.exit(1);
  }

  const items = await scanArchive(cwd);

  if (items.length === 0) {
    log.info('沒有任何已封存的項目。');
    return;
  }

  log.section(`封存項目（${items.length}）`);
  for (const item of items) {
    const typeLabel = item.type === 'skill' ? kleur.cyan('[skill]') : kleur.blue('[rule] ');
    const date = formatDate(item.archivedAt);
    console.log(`  ${typeLabel} ${item.name.padEnd(30)} ${kleur.dim('封存於 ' + date)}`);
  }

  let toRestore: ArchivedItem[] = [];

  if (yes) {
    toRestore = items;
    log.step(`還原所有 ${items.length} 個項目`);
  } else {
    const ans = await prompts({
      type: 'multiselect',
      name: 'restore',
      message: '選擇要還原的項目',
      choices: items.map((item) => ({
        title: `${item.type === 'skill' ? kleur.cyan('[skill]') : kleur.blue('[rule] ')} ${item.name}`,
        value: item.name,
        selected: false,
      })),
      hint: '- 空白鍵切換，Enter 確認',
      instructions: false,
    });

    if (!ans.restore || (ans.restore as string[]).length === 0) {
      log.info('未選擇任何項目。');
      return;
    }

    toRestore = items.filter((i) => (ans.restore as string[]).includes(i.name));
  }

  log.section('還原中');
  let restored = 0;
  for (const item of toRestore) {
    const ok = await restoreItem(cwd, item);
    if (ok) restored++;
  }

  console.log('');
  log.success(`還原完成：${restored} 個項目`);
}

async function scanArchive(cwd: string): Promise<ArchivedItem[]> {
  const state = await loadState(cwd);
  const archiveDir = getAcorArchiveDir(cwd);
  const items: ArchivedItem[] = [];

  const skillsArchiveDir = path.join(archiveDir, 'skills');
  if (await fileExists(skillsArchiveDir)) {
    const entries = await fs.readdir(skillsArchiveDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      items.push({
        type: 'skill',
        name: entry.name,
        archivedAt: state.archivedAt[entry.name] ?? new Date(0).toISOString(),
        archivePath: path.join(skillsArchiveDir, entry.name),
        restorePath: path.join(getClaudeSkillsDir(cwd), entry.name),
      });
    }
  }

  const rulesArchiveDir = path.join(archiveDir, 'rules');
  if (await fileExists(rulesArchiveDir)) {
    await walkRulesArchive(rulesArchiveDir, '', items, state.archivedAt, cwd);
  }

  return items.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}

async function walkRulesArchive(
  dir: string,
  prefix: string,
  items: ArchivedItem[],
  archivedAt: Record<string, string>,
  cwd: string,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkRulesArchive(full, rel, items, archivedAt, cwd);
    } else if (entry.isFile()) {
      items.push({
        type: 'rule',
        name: rel,
        archivedAt: archivedAt[rel] ?? new Date(0).toISOString(),
        archivePath: full,
        restorePath: path.join(getClaudeRulesDir(cwd), rel),
      });
    }
  }
}

async function restoreItem(cwd: string, item: ArchivedItem): Promise<boolean> {
  if (item.type === 'skill') {
    const archiveDir = item.archivePath;
    const restoreDir = item.restorePath;

    if (await fileExists(restoreDir)) {
      log.warn(`  跳過 ${item.name}（目標路徑已存在）`);
      return false;
    }

    await ensureDir(restoreDir);
    const entries = await fs.readdir(archiveDir);
    for (const entry of entries) {
      await moveFile(path.join(archiveDir, entry), path.join(restoreDir, entry));
    }
    await fs.rmdir(archiveDir).catch(() => undefined);
  } else {
    if (await fileExists(item.restorePath)) {
      log.warn(`  跳過 ${item.name}（目標路徑已存在）`);
      return false;
    }
    await moveFile(item.archivePath, item.restorePath);

    const parentDir = path.dirname(item.archivePath);
    const siblings = await fs.readdir(parentDir).catch(() => []);
    if (siblings.length === 0) await fs.rmdir(parentDir).catch(() => undefined);
  }

  const state = await loadState(cwd);
  delete state.archivedAt[item.name];
  await saveState(cwd, state);

  log.success(`還原: ${item.name}`);
  return true;
}
