import path from 'node:path';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { readJsonFile, fileExists } from '../utils/fs.js';
import { getAcorDir, getCatalogFile, getStateFile } from '../utils/paths.js';
import type { Catalog, AcorState } from '../types/index.js';

export interface ListOptions {
  cwd: string
}

export async function runList(opts: ListOptions): Promise<void> {
  const { cwd } = opts;

  const hasAcor = await fileExists(getAcorDir(cwd));

  // catalog 優先從本地 .acor/（init 後），否則不支援
  const catalog = hasAcor ? await readJsonFile<Catalog>(getCatalogFile(cwd)) : null;
  const state = hasAcor ? await readJsonFile<AcorState>(getStateFile(cwd)) : null;

  if (!catalog) {
    if (!hasAcor) {
      log.warn('尚未初始化，請先執行 `acor init`');
    } else {
      log.warn('catalog.json 不存在，請重新執行 `acor init`');
    }
    return;
  }

  const installedSkills = new Set(state?.installedSkills ?? []);
  const installedRules = new Set(state?.installedRules ?? []);

  log.section(`可用 Skills（${catalog.skills.length}）`);
  for (const skill of catalog.skills) {
    const installed = installedSkills.has(skill.id);
    const icon = installed ? kleur.green('✔') : kleur.dim('○');
    const name = installed ? kleur.green(skill.name) : skill.name;
    const tags = skill.tags.length > 0 ? kleur.dim(`[${skill.tags.join(', ')}]`) : '';
    console.log(`  ${icon} ${name.padEnd(28)} ${kleur.dim(skill.description.slice(0, 40))}  ${tags}`);
  }

  log.section(`可用 Rules（${catalog.rules.length}）`);
  for (const rule of catalog.rules) {
    const installed = installedRules.has(rule.relativePath);
    const icon = installed ? kleur.green('✔') : kleur.dim('○');
    const name = installed ? kleur.green(rule.name) : rule.name;
    const noTrigger = rule.triggers.length === 0 ? kleur.dim('（通用）') : '';
    console.log(`  ${icon} ${name.padEnd(28)} ${kleur.dim(rule.description.slice(0, 40))} ${noTrigger}`);
  }

  log.info('');
  log.dim(`  catalog 產生於 ${new Date(catalog.generatedAt).toLocaleString('zh-TW')}`);
  log.dim('  執行 `acor init --force` 可重新同步 catalog');
}
