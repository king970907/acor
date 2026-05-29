import { Command } from 'commander';
import { createRequire } from 'node:module';
import process from 'node:process';
import { printBanner } from './utils/banner.js';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runRestore } from './commands/restore.js';

const loadPkg = createRequire(import.meta.url);
const { version: VERSION } = loadPkg('../package.json') as { version: string };

const isVersionQuery = process.argv.slice(2).some((a) => a === '-V' || a === '--version');
if (!isVersionQuery) {
  printBanner(VERSION);
}

const program = new Command();

program
  .name('acor')
  .description('AI Context Orchestration Runtime — Claude Code 專屬的 skills/rules 管理工具')
  .version(VERSION);

program
  .command('init')
  .description('初始化 ACOR：建立 .acor/ 結構、同步 skill 庫、安裝 /acor-scan 與 /acor-apply')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .option('--force', '強制重新初始化（覆寫現有 .acor/）', false)
  .action(async (opts) => {
    await runInit({ cwd: opts.cwd, force: opts.force });
  });

program
  .command('list')
  .description('列出 ACOR 所有可用的 skills 與 rules，並顯示安裝狀態')
  .option('--cwd <path>', '目標專案根目錄（用於顯示安裝狀態）', process.cwd())
  .action(async (opts) => {
    await runList({ cwd: opts.cwd });
  });

program
  .command('restore')
  .description('從 .acor/archive/ 還原封存的 skills / rules')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .option('-y, --yes', '跳過互動式提問，還原所有封存項目', false)
  .action(async (opts) => {
    await runRestore({ cwd: opts.cwd, yes: opts.yes });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
