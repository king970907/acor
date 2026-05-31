import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { readJsonFile, fileExists } from '../utils/fs.js';
import { getAcorDir, getAcorJsonFile } from '../utils/paths.js';
import type { AcorJson } from '../types/index.js';

export interface ListOptions {
  cwd: string
}

export async function runList(opts: ListOptions): Promise<void> {
  const { cwd } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.warn('尚未初始化，請先執行 `acor init`');
    return;
  }

  const acorJson = await readJsonFile<AcorJson>(getAcorJsonFile(cwd));
  if (!acorJson) {
    log.warn('尚未選擇任何 skills，執行 `acor add` 開始設定');
    return;
  }

  log.section(`已安裝 Skills（${acorJson.skills.length}）`);
  if (acorJson.skills.length === 0) {
    log.dim('  （無）');
  } else {
    for (const id of acorJson.skills) {
      console.log(`  ${kleur.green('✔')} ${id}`);
    }
  }

  log.section(`已安裝 Rules（${acorJson.rules.length}）`);
  if (acorJson.rules.length === 0) {
    log.dim('  （無）');
  } else {
    for (const rel of acorJson.rules) {
      console.log(`  ${kleur.green('✔')} ${rel}`);
    }
  }

  log.info('');
  log.dim('  執行 `acor add` 新增或移除 skills / rules');
}
