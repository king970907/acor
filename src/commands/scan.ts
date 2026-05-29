import { promises as fs } from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { scanProject } from '../scanner/project-scanner.js';
import { scanClaudeConfig } from '../scanner/claude-scanner.js';
import { detectConflicts } from '../scanner/conflict-detector.js';
import { loadSkills, loadRules, recommendSkills, recommendRules } from '../recommender/index.js';
import { writeJsonFile, fileExists } from '../utils/fs.js';
import { getAcorDir } from '../utils/paths.js';
import type { ScanResult } from '../types/index.js';

export interface ScanOptions {
  cwd: string
  json: boolean
}

export async function runScan(opts: ScanOptions): Promise<ScanResult> {
  const { cwd } = opts;

  if (!opts.json) {
    log.section('掃描專案');
    log.step('分析專案結構...');
  }

  const [project, existing, allSkills, allRules] = await Promise.all([
    scanProject(cwd),
    scanClaudeConfig(cwd),
    loadSkills(),
    loadRules(),
  ]);

  const conflicts = detectConflicts(existing.rules, existing.skills);
  const installedSkillNames = existing.skills.map((s) => s.name);
  const installedRuleNames = existing.rules.map((r) => r.relativePath);

  const recommendations = recommendSkills(allSkills, project, installedSkillNames);
  const ruleRecommendations = recommendRules(allRules, project, installedRuleNames);

  const result: ScanResult = {
    cwd,
    scannedAt: new Date().toISOString(),
    project,
    existing,
    conflicts,
    recommendations,
    ruleRecommendations,
  };

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  printScanResult(result);

  if (await fileExists(getAcorDir(cwd))) {
    const cachePath = path.join(getAcorDir(cwd), 'core', 'last-scan.json');
    await writeJsonFile(cachePath, result);
    log.dim('\n  結果已快取，可執行 `acor apply` 套用推薦');
  } else {
    log.info('\n提示：先執行 `acor init` 再執行 `acor apply` 套用推薦');
  }

  return result;
}

function printScanResult(result: ScanResult): void {
  const { project, existing, conflicts, recommendations, ruleRecommendations } = result;

  log.section('專案資訊');
  console.log(`  框架：       ${project.framework ?? kleur.dim('未偵測到')}`);
  console.log(`  語言：       ${project.language}`);
  console.log(`  套件管理：   ${project.packageManager}`);
  console.log(`  專案類型：   ${project.projectType}`);
  console.log(`  TypeScript： ${project.hasTypeScript ? kleur.green('是') : kleur.dim('否')}`);
  console.log(`  測試工具：   ${project.hasTesting ? kleur.green('已設定') : kleur.dim('未設定')}`);

  log.section('現有 Claude 設定');
  if (!existing.hasClaudeDir) {
    log.dim('  未找到 .claude/ 目錄（全新專案）');
  } else {
    if (existing.skills.length === 0) {
      log.dim('  Skills：無');
    } else {
      console.log(`  Skills（${existing.skills.length}）：`);
      for (const s of existing.skills) {
        console.log(`    ${kleur.cyan('•')} ${s.name}`);
      }
    }

    if (existing.rules.length === 0) {
      log.dim('  Rules：無');
    } else {
      console.log(`  Rules（${existing.rules.length}）：`);
      for (const r of existing.rules) {
        console.log(`    ${kleur.cyan('•')} ${r.relativePath}`);
      }
    }
  }

  log.section('衝突偵測');
  if (conflicts.length === 0) {
    log.success('未發現衝突');
  } else {
    for (const conflict of conflicts) {
      const icon = conflict.type === 'rule-contradiction' ? '⚡' : '⚠';
      console.log(`  ${kleur.red(icon)} ${conflict.description}`);
      console.log(`    ${kleur.dim('影響：')} ${conflict.items.join(', ')}`);
    }
  }

  log.section('推薦 Skills');
  if (recommendations.length === 0) {
    log.dim('  無推薦（已安裝，或未符合觸發條件）');
  } else {
    for (const rec of recommendations) {
      console.log(
        `  ${kleur.magenta('★')} ${kleur.bold(rec.skill.name)}  ${renderScoreBar(rec.score)} ${kleur.dim(String(Math.round(rec.score * 100)) + '%')}`,
      );
      console.log(`    ${kleur.dim(rec.skill.description)}`);
      for (const reason of rec.reasons) {
        console.log(`    ${kleur.dim('✓')} ${reason}`);
      }
      console.log('');
    }
  }

  log.section('推薦 Rules');
  if (ruleRecommendations.length === 0) {
    log.dim('  無推薦（已安裝，或未符合觸發條件）');
  } else {
    for (const rec of ruleRecommendations) {
      console.log(
        `  ${kleur.blue('◆')} ${kleur.bold(rec.rule.name)}  ${renderScoreBar(rec.score)} ${kleur.dim(String(Math.round(rec.score * 100)) + '%')}`,
      );
      console.log(`    ${kleur.dim(rec.rule.description)}`);
      for (const reason of rec.reasons) {
        console.log(`    ${kleur.dim('✓')} ${reason}`);
      }
      console.log('');
    }
  }
}

function renderScoreBar(score: number): string {
  const filled = Math.round(score * 5);
  return kleur.green('█'.repeat(filled)) + kleur.dim('░'.repeat(5 - filled));
}

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 分鐘

export async function isCacheStale(cwd: string, cachedAt: string): Promise<boolean> {
  const age = Date.now() - new Date(cachedAt).getTime();
  if (age > CACHE_MAX_AGE_MS) return true;

  const pkgPath = path.join(cwd, 'package.json');
  const stat = await fs.stat(pkgPath).catch(() => null);
  if (stat && stat.mtimeMs > new Date(cachedAt).getTime()) return true;

  return false;
}
