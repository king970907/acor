import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileExists } from './fs.js';
import { type AcorConfig, getGlobalRegistryDir } from './config.js';
import { log } from './logger.js';

// 回傳 registry 的本地路徑（已確保同步完成）
export async function syncRegistry(config: AcorConfig): Promise<string> {
  const { registry } = config;

  if (!registry?.url && !registry?.path) {
    throw new Error(
      '未設定 registry\n' +
      '  請在 ~/.acor/config.json 中設定：\n' +
      '  { "registry": { "path": "/path/to/acor-registry" } }\n' +
      '  或\n' +
      '  { "registry": { "url": "https://github.com/yourorg/acor-registry" } }',
    );
  }

  // 本地路徑模式：直接使用，不需要 git
  if (registry.path) {
    if (!await fileExists(registry.path)) {
      throw new Error(`Registry 路徑不存在：${registry.path}`);
    }
    log.dim(`  Registry：${registry.path}`);
    return registry.path;
  }

  // Git URL 模式：clone 或 pull 到 ~/.acor/registry/
  const registryDir = getGlobalRegistryDir();
  const branch = registry.branch ?? 'main';
  const isCloned = await fileExists(path.join(registryDir, '.git'));

  try {
    if (!isCloned) {
      log.step(`Clone registry：${registry.url}`);
      execSync(
        `git clone --branch ${branch} --depth 1 "${registry.url}" "${registryDir}"`,
        { stdio: 'pipe' },
      );
    } else {
      log.step('更新 registry');
      execSync(`git -C "${registryDir}" pull --ff-only`, { stdio: 'pipe' });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Registry 同步失敗：${msg.trim()}`);
  }

  return registryDir;
}
