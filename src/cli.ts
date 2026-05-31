import { Command } from 'commander';
import { createRequire } from 'node:module';
import process from 'node:process';
import { printBanner } from './utils/banner.js';
import { runInit } from './commands/init.js';
import { runAdd } from './commands/add.js';
import { runRemove } from './commands/remove.js';
import { runList } from './commands/list.js';
import { runStatus } from './commands/status.js';

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
  .description('初始化 ACOR：建立 .acor/ 結構、安裝 /acor-scan 與 /acor-apply、安裝 acor.json 宣告的項目')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .option('--force', '強制重新安裝所有項目', false)
  .action(async (opts) => {
    await runInit({ cwd: opts.cwd, force: opts.force });
  });

program
  .command('add')
  .description('從 hub 選擇並安裝 skills / rules 到當前專案')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .action(async (opts) => {
    await runAdd({ cwd: opts.cwd });
  });

program
  .command('remove')
  .description('移除已安裝的 skills / rules')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .action(async (opts) => {
    await runRemove({ cwd: opts.cwd });
  });

program
  .command('list')
  .description('列出已安裝的 skills 與 rules')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .action(async (opts) => {
    await runList({ cwd: opts.cwd });
  });

program
  .command('status')
  .description('顯示 ACOR 當前狀態')
  .option('--cwd <path>', '目標專案根目錄', process.cwd())
  .action(async (opts) => {
    await runStatus({ cwd: opts.cwd });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
