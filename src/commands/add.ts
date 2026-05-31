import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import prompts from 'prompts';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getAcorJsonFile, getAcorDir, getHubSkillsDir, getHubRulesDir } from '../utils/paths.js';
import { loadConfig } from '../utils/config.js';
import { syncRegistry } from '../utils/registry.js';
import { installSkill, installRule, removeSkill, removeRule } from '../utils/install.js';
import type { AcorJson, HubSkill, HubRule, SkillTrigger } from '../types/index.js';

export interface AddOptions {
  cwd: string
}

export async function runAdd(opts: AddOptions): Promise<void> {
  const { cwd } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.error('尚未初始化，請先執行 `acor init`');
    return;
  }

  // 取得 hub 路徑
  const config = await loadConfig();
  let hubPath: string;
  try {
    hubPath = await syncRegistry(config);
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    return;
  }

  // 讀取 hub 可用清單（動態解析，不需 registry.json）
  const [availableSkills, availableRules] = await Promise.all([
    loadHubSkills(hubPath),
    loadHubRules(hubPath),
  ]);

  if (availableSkills.length === 0 && availableRules.length === 0) {
    log.warn('Hub 中沒有任何 skills 或 rules');
    return;
  }

  // 讀取現有 acor.json
  const current = await readJsonFile<AcorJson>(getAcorJsonFile(cwd)) ?? {
    version: '1.0.0',
    skills: [],
    rules: [],
  };
  const currentSkills = new Set(current.skills);
  const currentRules = new Set(current.rules);

  log.section('選擇 Skills / Rules');
  log.dim('  空白鍵選取，Enter 確認，Ctrl+C 取消\n');

  // Skills 多選
  let selectedSkills: string[] = [...currentSkills];
  if (availableSkills.length > 0) {
    const ans = await prompts({
      type: 'multiselect',
      name: 'skills',
      message: kleur.bold('Skills'),
      choices: availableSkills.map((s) => ({
        title: `${s.name.padEnd(28)} ${kleur.dim(s.description.slice(0, 36))}`,
        value: s.id,
        selected: currentSkills.has(s.id),
      })),
      hint: '（已選為目前安裝）',
      instructions: false,
    }, { onCancel: () => process.exit(0) });

    selectedSkills = (ans.skills as string[]) ?? [];
  }

  // Rules 多選
  let selectedRules: string[] = [...currentRules];
  if (availableRules.length > 0) {
    const ans = await prompts({
      type: 'multiselect',
      name: 'rules',
      message: kleur.bold('Rules'),
      choices: availableRules.map((r) => ({
        title: `${r.name.padEnd(28)} ${kleur.dim(r.description.slice(0, 36))}`,
        value: r.relativePath,
        selected: currentRules.has(r.relativePath),
      })),
      hint: '（已選為目前安裝）',
      instructions: false,
    }, { onCancel: () => process.exit(0) });

    selectedRules = (ans.rules as string[]) ?? [];
  }

  // 計算差異
  const toAddSkills = selectedSkills.filter((id) => !currentSkills.has(id));
  const toRemoveSkills = [...currentSkills].filter((id) => !selectedSkills.includes(id));
  const toAddRules = selectedRules.filter((rel) => !currentRules.has(rel));
  const toRemoveRules = [...currentRules].filter((rel) => !selectedRules.includes(rel));

  const hasChanges = toAddSkills.length + toRemoveSkills.length + toAddRules.length + toRemoveRules.length > 0;
  if (!hasChanges) {
    log.info('沒有變更。');
    return;
  }

  // 顯示變更摘要
  log.info('');
  if (toAddSkills.length)    log.dim(`  新增 skill：${toAddSkills.join('、')}`);
  if (toRemoveSkills.length) log.dim(`  移除 skill：${toRemoveSkills.join('、')}`);
  if (toAddRules.length)     log.dim(`  新增 rule： ${toAddRules.join('、')}`);
  if (toRemoveRules.length)  log.dim(`  移除 rule： ${toRemoveRules.join('、')}`);

  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: '確認套用？',
    initial: true,
  }, { onCancel: () => process.exit(0) });

  if (!confirmed) {
    log.info('已取消。');
    return;
  }

  // 執行安裝 / 移除
  log.step('套用變更');
  await applyChanges(cwd, hubPath, toAddSkills, toRemoveSkills, toAddRules, toRemoveRules);

  // 更新 acor.json
  const updated: AcorJson = {
    version: '1.0.0',
    skills: selectedSkills,
    rules: selectedRules,
  };
  await writeJsonFile(getAcorJsonFile(cwd), updated);
  log.success('acor.json 已更新');
  log.dim('  記得 git commit acor.json 讓團隊同步');
}

async function applyChanges(
  cwd: string,
  hubPath: string,
  toAddSkills: string[],
  toRemoveSkills: string[],
  toAddRules: string[],
  toRemoveRules: string[],
): Promise<void> {
  for (const id of toAddSkills) {
    if (await installSkill(cwd, hubPath, id)) log.success(`  安裝 skill：${id}`);
  }
  for (const id of toRemoveSkills) {
    await removeSkill(cwd, id);
    log.dim(`  移除 skill：${id}`);
  }
  for (const rel of toAddRules) {
    if (await installRule(cwd, hubPath, rel)) log.success(`  安裝 rule：${rel}`);
  }
  for (const rel of toRemoveRules) {
    await removeRule(cwd, rel);
    log.dim(`  移除 rule：${rel}`);
  }
}

async function loadHubSkills(hubPath: string): Promise<HubSkill[]> {
  const dir = getHubSkillsDir(hubPath);
  if (!await fileExists(dir)) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skills: HubSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, 'SKILL.md');
    if (!await fileExists(skillFile)) continue;
    const raw = await fs.readFile(skillFile, 'utf8');
    const fm = matter(raw).data as Record<string, unknown>;
    skills.push({
      id: (fm['id'] as string) ?? entry.name,
      name: (fm['name'] as string) ?? entry.name,
      description: (fm['description'] as string) ?? '',
      version: (fm['version'] as string) ?? '1.0.0',
      tags: (fm['tags'] as string[]) ?? [],
      triggers: (fm['triggers'] as SkillTrigger[]) ?? [],
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadHubRules(hubPath: string): Promise<HubRule[]> {
  const dir = getHubRulesDir(hubPath);
  if (!await fileExists(dir)) return [];

  const rules: HubRule[] = [];
  await walkRules(dir, '', rules);
  return rules.sort((a, b) => a.name.localeCompare(b.name));
}

async function walkRules(dir: string, prefix: string, rules: HubRule[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkRules(full, rel, rules);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const raw = await fs.readFile(full, 'utf8');
      const fm = matter(raw).data as Record<string, unknown>;
      const id = (fm['id'] as string) ?? entry.name.replace(/\.md$/, '');
      rules.push({
        id,
        name: (fm['name'] as string) ?? id,
        description: (fm['description'] as string) ?? '',
        triggers: (fm['triggers'] as SkillTrigger[]) ?? [],
        relativePath: rel,
      });
    }
  }
}
