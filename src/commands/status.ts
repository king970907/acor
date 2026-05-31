import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { readJsonFile, fileExists } from '../utils/fs.js';
import { formatDate, relativeTime } from '../utils/format.js';
import { getAcorDir, getAcorJsonFile, getLastScanFile } from '../utils/paths.js';
import type { AcorJson, LastScan } from '../types/index.js';

export interface StatusOptions {
  cwd: string
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const { cwd } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.warn('尚未初始化，請先執行 `acor init`');
    return;
  }

  const [acorJson, scan] = await Promise.all([
    readJsonFile<AcorJson>(getAcorJsonFile(cwd)),
    readJsonFile<LastScan>(getLastScanFile(cwd)),
  ]);

  log.section('ACOR 狀態');
  log.dim(`  專案：${cwd}`);

  printInstalled(acorJson);
  printLastScan(scan);
  log.info('');
}

function printInstalled(acorJson: AcorJson | null): void {
  const skills = acorJson?.skills ?? [];
  const rules = acorJson?.rules ?? [];

  log.info('');
  log.info(kleur.bold('已安裝') + kleur.dim(`（${skills.length} skills，${rules.length} rules）`));
  log.info(skills.length > 0
    ? '  Skills：' + kleur.green(skills.join(', '))
    : kleur.dim('  Skills：（無）'));
  log.info(rules.length > 0
    ? '  Rules： ' + kleur.green(rules.join(', '))
    : kleur.dim('  Rules：（無）'));
}

function printLastScan(scan: LastScan | null): void {
  log.info('');
  log.info(kleur.bold('上次掃描'));

  if (!scan) {
    log.dim('  尚未執行 /acor-scan');
    return;
  }

  log.info(`  時間：${formatDate(scan.scannedAt)}（${relativeTime(scan.scannedAt)}）`);
  log.info(`  語言：${scan.project.languages.join(', ') || '未知'}　框架：${scan.project.frameworks.join(', ') || '未知'}`);
  log.info(`  已掃描：${scan.installedSkills.length} skills，${scan.installedRules.length} rules`);

  if (scan.irrelevant.length > 0) {
    log.info('  ' + kleur.yellow(`不相關：${scan.irrelevant.length} 項`));
    for (const i of scan.irrelevant) {
      log.dim(`    • [${i.type}] ${i.id}`);
    }
  } else {
    log.dim('  不相關：無');
  }

  if (scan.conflicts.length > 0) {
    log.info('  ' + kleur.yellow(`衝突：${scan.conflicts.length} 項`));
    for (const c of scan.conflicts) {
      log.dim(`    • ${c.description}`);
    }
  } else {
    log.dim('  衝突：無');
  }
}
