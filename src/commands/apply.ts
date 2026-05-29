import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import prompts from 'prompts';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { runScan, isCacheStale } from './scan.js';
import {
  fileExists,
  safeWriteFile,
  readJsonFile,
  ensureDir,
  moveFile,
} from '../utils/fs.js';
import {
  getAcorDir,
  getAcorArchiveDir,
  getClaudeSkillsDir,
  getClaudeRulesDir,
} from '../utils/paths.js';
import { markInstalled, markArchived } from '../core/state.js';
import type {
  ScanResult,
  SkillRecommendation,
  RuleRecommendation,
  ExistingSkill,
  ExistingRule,
} from '../types/index.js';

export interface ApplyOptions {
  cwd: string
  yes: boolean
  force: boolean
}

export async function runApply(opts: ApplyOptions): Promise<void> {
  const { cwd, yes, force } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.error('未找到 .acor/ 目錄，請先執行 `acor init`');
    process.exit(1);
  }

  log.section('套用 Skills 與 Rules');

  const cachePath = path.join(getAcorDir(cwd), 'core', 'last-scan.json');
  let scanResult = await readJsonFile<ScanResult>(cachePath);

  if (!scanResult) {
    log.step('尚無掃描結果，執行掃描...');
    scanResult = await runScan({ cwd, json: true });
  } else if (await isCacheStale(cwd, scanResult.scannedAt)) {
    log.warn('掃描結果已過期，重新分析...');
    scanResult = await runScan({ cwd, json: true });
  } else {
    const ago = Math.round((Date.now() - new Date(scanResult.scannedAt).getTime()) / 60000);
    log.dim(`使用 ${ago} 分鐘前的掃描結果（執行 \`acor scan\` 可重新分析）`);
  }

  const { recommendations, ruleRecommendations, existing, conflicts } = scanResult;

  // 顯示衝突警告
  if (conflicts.length > 0) {
    log.section('⚠ 發現衝突，建議先處理');
    for (const c of conflicts) {
      log.conflict(c.description);
      console.log(`  ${kleur.dim('影響：')} ${c.items.join(', ')}`);
    }
    if (!yes) {
      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: '仍要繼續套用？',
        initial: true,
      });
      if (!proceed) {
        log.info('已取消。請先解決衝突後再執行 apply。');
        return;
      }
    }
  }

  // 選擇要套用的 skills
  const selectedSkills = await selectSkills(recommendations, yes);

  // 選擇要套用的 rules
  const selectedRules = await selectRules(ruleRecommendations, yes);

  // 選擇要封存的現有項目
  const { toArchiveSkills, toArchiveRules } = await selectArchive(existing, yes);

  // 執行封存
  if (toArchiveSkills.length > 0 || toArchiveRules.length > 0) {
    log.section('封存現有項目');
    for (const skill of toArchiveSkills) await archiveSkill(cwd, skill);
    for (const rule of toArchiveRules) await archiveRule(cwd, rule);
  }

  // 套用 skills
  if (selectedSkills.length > 0) {
    log.section('套用 Skills');
    for (const rec of selectedSkills) await applySkill(cwd, rec, force);
  }

  // 套用 rules
  if (selectedRules.length > 0) {
    log.section('套用 Rules');
    for (const rec of selectedRules) await applyRule(cwd, rec, force);
  }

  const totalChanges =
    selectedSkills.length + selectedRules.length + toArchiveSkills.length + toArchiveRules.length;

  console.log('');
  if (totalChanges > 0) {
    log.success(
      `完成：新增 ${selectedSkills.length} skills、${selectedRules.length} rules，封存 ${toArchiveSkills.length + toArchiveRules.length} 個項目`,
    );
  } else {
    log.info('沒有變更。');
  }
}

async function selectSkills(
  recommendations: SkillRecommendation[],
  yes: boolean,
): Promise<SkillRecommendation[]> {
  if (recommendations.length === 0) return [];
  if (yes) return recommendations;

  const ans = await prompts({
    type: 'multiselect',
    name: 'skills',
    message: '選擇要套用的 Skills',
    choices: recommendations.map((r) => ({
      title: `${r.skill.name}  ${kleur.dim(String(Math.round(r.score * 100)) + '%')}  ${kleur.dim(r.skill.description)}`,
      value: r.skill.id,
      selected: r.score >= 0.6,
    })),
    hint: '- 空白鍵切換，Enter 確認',
    instructions: false,
  });

  if (!ans.skills || (ans.skills as string[]).length === 0) return [];
  return recommendations.filter((r) => (ans.skills as string[]).includes(r.skill.id));
}

async function selectRules(
  recommendations: RuleRecommendation[],
  yes: boolean,
): Promise<RuleRecommendation[]> {
  if (recommendations.length === 0) return [];
  if (yes) return recommendations;

  const ans = await prompts({
    type: 'multiselect',
    name: 'rules',
    message: '選擇要套用的 Rules',
    choices: recommendations.map((r) => ({
      title: `${r.rule.name}  ${kleur.dim(String(Math.round(r.score * 100)) + '%')}  ${kleur.dim(r.rule.description)}`,
      value: r.rule.relativePath,
      selected: r.score >= 0.6,
    })),
    hint: '- 空白鍵切換，Enter 確認',
    instructions: false,
  });

  if (!ans.rules || (ans.rules as string[]).length === 0) return [];
  return recommendations.filter((r) => (ans.rules as string[]).includes(r.rule.relativePath));
}

async function selectArchive(
  existing: ScanResult['existing'],
  yes: boolean,
): Promise<{ toArchiveSkills: ExistingSkill[]; toArchiveRules: ExistingRule[] }> {
  const hasExisting = existing.skills.length > 0 || existing.rules.length > 0;
  if (!hasExisting || yes) {
    return { toArchiveSkills: [], toArchiveRules: [] };
  }

  const ans = await prompts({
    type: 'multiselect',
    name: 'archive',
    message: '選擇要封存的現有項目（移至 .acor/archive/，可用 `acor restore` 還原）',
    choices: [
      ...existing.skills.map((s) => ({
        title: `${kleur.cyan('[skill]')} ${s.name}`,
        value: `skill:${s.name}`,
        selected: false,
      })),
      ...existing.rules.map((r) => ({
        title: `${kleur.blue('[rule] ')} ${r.relativePath}`,
        value: `rule:${r.relativePath}`,
        selected: false,
      })),
    ],
    hint: '- 預設全不選，Enter 跳過',
    instructions: false,
  });

  if (!ans.archive || (ans.archive as string[]).length === 0) {
    return { toArchiveSkills: [], toArchiveRules: [] };
  }

  const selected = ans.archive as string[];
  return {
    toArchiveSkills: existing.skills.filter((s) => selected.includes(`skill:${s.name}`)),
    toArchiveRules: existing.rules.filter((r) => selected.includes(`rule:${r.relativePath}`)),
  };
}

async function applySkill(cwd: string, rec: SkillRecommendation, force: boolean): Promise<void> {
  const { skill } = rec;
  const skillDir = path.join(getClaudeSkillsDir(cwd), skill.id);
  const targetPath = path.join(skillDir, 'SKILL.md');

  await ensureDir(skillDir);
  const content = matter.stringify(skill.body, {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    version: skill.version,
    tags: skill.tags,
  });

  const result = await safeWriteFile(targetPath, content, { force, log: log.dim });
  if (result === 'written') {
    log.success(`套用 skill: ${skill.name}`);
    await markInstalled(cwd, 'skill', skill.id);
  }
}

async function applyRule(cwd: string, rec: RuleRecommendation, force: boolean): Promise<void> {
  const { rule } = rec;
  const targetPath = path.join(getClaudeRulesDir(cwd), rule.relativePath);

  const result = await safeWriteFile(targetPath, rule.content, { force, log: log.dim });
  if (result === 'written') {
    log.success(`套用 rule: ${rule.name}`);
    await markInstalled(cwd, 'rule', rule.relativePath);
  }
}

async function archiveSkill(cwd: string, skill: ExistingSkill): Promise<void> {
  const archiveDir = path.join(getAcorArchiveDir(cwd), 'skills', skill.name);
  await ensureDir(archiveDir);

  const skillDir = path.dirname(skill.path);
  for (const entry of await fs.readdir(skillDir)) {
    await moveFile(path.join(skillDir, entry), path.join(archiveDir, entry));
  }
  await fs.rmdir(skillDir).catch(() => undefined);

  await markArchived(cwd, skill.name);
  log.dim(`  封存 skill: ${skill.name}`);
}

async function archiveRule(cwd: string, rule: ExistingRule): Promise<void> {
  const archivePath = path.join(getAcorArchiveDir(cwd), 'rules', rule.relativePath);
  await moveFile(rule.path, archivePath);

  const parentDir = path.dirname(rule.path);
  const siblings = await fs.readdir(parentDir).catch(() => []);
  if (siblings.length === 0) await fs.rmdir(parentDir).catch(() => undefined);

  await markArchived(cwd, rule.relativePath);
  log.dim(`  封存 rule: ${rule.relativePath}`);
}
