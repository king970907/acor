import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { readJsonFile, fileExists } from '../utils/fs.js';
import { formatDate, relativeTime } from '../utils/format.js';
import { getAcorDir, getStateFile, getLastScanFile } from '../utils/paths.js';
import { countArchived } from '../core/state.js';
import type { AcorState, LastScan } from '../types/index.js';

export interface StatusOptions {
  cwd: string
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const { cwd } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.warn('尚未初始化，請先執行 `acor init`');
    return;
  }

  const [state, scan, archiveCount] = await Promise.all([
    readJsonFile<AcorState>(getStateFile(cwd)),
    readJsonFile<LastScan>(getLastScanFile(cwd)),
    countArchived(cwd),
  ]);

  log.section('ACOR 狀態');
  log.dim(`  專案：${cwd}`);

  printInstalled(state);
  printLastScan(scan);
  printArchive(archiveCount, state);
  log.info('');
}

function printInstalled(state: AcorState | null): void {
  const skills = state?.installedSkills ?? [];
  const rules = state?.installedRules ?? [];

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

  const p = scan.project;
  const parts = [p.language, p.framework !== 'unknown' && p.framework, p.projectType]
    .filter(Boolean).join(' / ');
  log.info(`  專案：${parts}${p.hasTesting ? '，含測試' : ''}`);

  if (scan.conflicts.length > 0) {
    log.info('  ' + kleur.yellow(`衝突：${scan.conflicts.length} 項`));
    for (const c of scan.conflicts) {
      log.dim(`    • ${c.description}`);
    }
  } else {
    log.dim('  衝突：無');
  }

  if (scan.recommendations.length > 0) {
    const highCount = scan.recommendations.filter((r) => r.confidence === 'high').length;
    log.info(`  推薦：${scan.recommendations.length} 項` +
      (highCount > 0 ? kleur.dim(`（${highCount} 高信心）`) : ''));
  }
}

function printArchive(archiveCount: number, state: AcorState | null): void {
  log.info('');
  log.info(kleur.bold('封存'));

  if (archiveCount === 0) {
    log.dim('  （無）');
    return;
  }

  log.info(`  ${archiveCount} 個項目` + kleur.dim('（執行 `acor restore` 可還原）'));

  const sorted = Object.entries(state?.archivedAt ?? {})
    .sort(([, a], [, b]) => b.localeCompare(a))
    .slice(0, 3);

  for (const [name, ts] of sorted) {
    log.dim(`  • ${name}（${formatDate(ts)}）`);
  }
  if (archiveCount > 3) {
    log.dim(`  … 還有 ${archiveCount - 3} 項`);
  }
}
