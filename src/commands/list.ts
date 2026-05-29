import path from 'node:path';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { loadSkills, loadRules } from '../recommender/index.js';
import { readJsonFile, fileExists } from '../utils/fs.js';
import { getAcorDir } from '../utils/paths.js';
import type { AcorState } from '../types/index.js';

export interface ListOptions {
  cwd: string
}

export async function runList(opts: ListOptions): Promise<void> {
  const { cwd } = opts;

  const [allSkills, allRules] = await Promise.all([loadSkills(), loadRules()]);

  // 嘗試讀取 state（若此專案已 init）
  const statePath = path.join(getAcorDir(cwd), 'core', 'state.json');
  const hasAcor = await fileExists(getAcorDir(cwd));
  const state = hasAcor ? await readJsonFile<AcorState>(statePath) : null;
  const installedSkills = new Set(state?.installedSkills ?? []);
  const installedRules = new Set(state?.installedRules ?? []);

  log.section(`可用 Skills（${allSkills.length}）`);
  if (allSkills.length === 0) {
    log.dim('  無可用 skills');
  } else {
    for (const skill of allSkills) {
      const installed = installedSkills.has(skill.id);
      const icon = installed ? kleur.green('✔') : kleur.dim('○');
      const name = installed ? kleur.green(skill.name) : skill.name;
      const tags = skill.tags.length > 0 ? kleur.dim(`[${skill.tags.join(', ')}]`) : '';
      console.log(`  ${icon} ${name.padEnd(28)} ${kleur.dim(skill.description.slice(0, 40))}  ${tags}`);
    }
  }

  log.section(`可用 Rules（${allRules.length}）`);
  if (allRules.length === 0) {
    log.dim('  無可用 rules');
  } else {
    for (const rule of allRules) {
      const installed = installedRules.has(rule.relativePath);
      const icon = installed ? kleur.green('✔') : kleur.dim('○');
      const name = installed ? kleur.green(rule.name) : rule.name;
      const noTrigger = rule.triggers.length === 0 ? kleur.dim('（通用）') : '';
      console.log(`  ${icon} ${name.padEnd(28)} ${kleur.dim(rule.description.slice(0, 40))} ${noTrigger}`);
    }
  }

  if (!hasAcor) {
    console.log('');
    log.dim('提示：在專案目錄執行 `acor init` 後，✔ 符號會顯示已安裝狀態');
  }
}
